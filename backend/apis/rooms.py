"""
Room API endpoints
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from storage.store import RoomStore, PlayerStore, QuestionStore
from apis.llm.prompts import generate_questions_with_llm
from apis.websocket import manager

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


# Request/Response models
class CreateRoomRequest(BaseModel):
    name: str
    topics: list[str]
    questionsPerRound: int
    timePerQuestion: int


class CreateRoomResponse(BaseModel):
    roomId: str
    hostToken: str


class JoinRoomRequest(BaseModel):
    playerName: str


class JoinRoomResponse(BaseModel):
    playerId: str
    playerToken: str


class PlayerResponse(BaseModel):
    playerId: str
    playerName: str
    score: int = 0
    joinedAt: str


class QuestionResponse(BaseModel):
    id: str
    question: str
    options: list[str]
    correctAnswer: int
    explanation: Optional[str] = None


class RoomResponse(BaseModel):
    roomId: str
    name: str
    topics: list[str]
    questionsPerRound: int
    timePerQuestion: int
    hostName: str
    players: list[PlayerResponse]
    status: str
    createdAt: str
    startedAt: Optional[str] = None
    questions: Optional[list[QuestionResponse]] = None


class StartGameResponse(BaseModel):
    success: bool
    message: str
    questionsCount: int
    playerToken: Optional[str] = None


def generate_token() -> str:
    """Generate a random token"""
    import secrets
    return secrets.token_urlsafe(32)


@router.post("", response_model=CreateRoomResponse, status_code=201)
async def create_room(request: CreateRoomRequest):
    """Create a new game room"""
    try:
        host_token = generate_token()
        
        from storage.models import RoomCreate
        room_data = RoomCreate(
            name=request.name,
            host_name=request.name,  # Using name as host_name
            host_token=host_token,
            topics=request.topics,
            questions_per_round=request.questionsPerRound,
            time_per_question=request.timePerQuestion,
        )
        
        room = RoomStore.create_room(room_data)
        
        PlayerStore.create_player(room.room_id, request.name)
        
        return CreateRoomResponse(
            roomId=str(room.room_id),
            hostToken=room.host_token
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: str):
    """Get room details"""
    try:
        room_uuid = UUID(room_id)
        room = RoomStore.get_room(room_uuid)
        
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        # Get players
        players = PlayerStore.get_players_by_room(room_uuid)
        players_response = [
            PlayerResponse(
                playerId=str(p.player_id),
                playerName=p.player_name,
                score=p.score if hasattr(p, 'score') else 0,
                joinedAt=p.joined_at.isoformat()
            )
            for p in players
        ]
        
        # Get questions if game has started
        questions_response = None
        if room.status in ["started", "finished"]:
            questions = QuestionStore.get_questions_by_room(room_uuid)
            questions_response = [
                QuestionResponse(
                    id=str(q.question_id),
                    question=q.question_text,
                    options=q.options,
                    correctAnswer=q.correct_answer,
                    explanation=q.explanation
                )
                for q in questions
            ]
        
        return RoomResponse(
            roomId=str(room.room_id),
            name=room.name,
            topics=room.topics,
            questionsPerRound=room.questions_per_round,
            timePerQuestion=room.time_per_question,
            hostName=room.host_name,
            players=players_response,
            status=room.status,
            createdAt=room.created_at.isoformat(),
            startedAt=room.started_at.isoformat() if room.started_at else None,
            questions=questions_response
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid room ID")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{room_id}/join", response_model=JoinRoomResponse)
async def join_room(room_id: str, request: JoinRoomRequest):
    """Join an existing room"""
    try:
        room_uuid = UUID(room_id)
        room = RoomStore.get_room(room_uuid)
        
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        if room.status != "waiting":
            raise HTTPException(status_code=400, detail="Room is no longer accepting players")
        
        player = PlayerStore.create_player(room_uuid, request.playerName)
        
        # Broadcast player joined event
        await manager.broadcast_to_room(room_id, {
            "type": "player_joined",
            "player": {
                "playerId": str(player.player_id),
                "playerName": player.player_name,
                "joinedAt": player.joined_at.isoformat()
            }
        })
        
        return JoinRoomResponse(
            playerId=str(player.player_id),
            playerToken=player.player_token
        )
    except ValueError as e:
        if "already exist" in str(e).lower():
            raise HTTPException(status_code=409, detail="Player name already taken in this room")
        raise HTTPException(status_code=400, detail="Invalid room ID")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{room_id}/start", response_model=StartGameResponse)
async def start_game(room_id: str, hostToken: Optional[str] = Header(None, alias="hosttoken")):
    """Start the game (host only)"""
    try:
        if not hostToken:
            raise HTTPException(status_code=401, detail="Host token required")
        
        room_uuid = UUID(room_id)
        room = RoomStore.get_room(room_uuid)
        
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        if room.host_token != hostToken:
            raise HTTPException(status_code=403, detail="Invalid host token")
        
        if room.status != "waiting":
            raise HTTPException(status_code=400, detail=f"Room is already {room.status}")
        
        # Check if room has players
        players = PlayerStore.get_players_by_room(room_uuid)
        if not players:
            raise HTTPException(status_code=400, detail="Cannot start game without players")
        
        # Generate questions
        sample_questions = generate_questions_with_llm(room.topics, room.questions_per_round)
        
        # Create questions in database
        from storage.models import QuestionCreate
        questions_to_create = [
            QuestionCreate(
                room_id=room_uuid,
                question_text=q["question"],
                options=q["options"],
                correct_answer=q["correct_answer"],
                explanation=q.get("explanation"),
                question_index=i
            )
            for i, q in enumerate(sample_questions)
        ]
        
        QuestionStore.create_questions(questions_to_create)
        
        # Update room status
        started_at = datetime.now()
        RoomStore.update_room_status(room_uuid, "started", started_at)
        
        # Find the host's player record to get their player token
        host_player = None
        for player in players:
            if player.player_name == room.host_name:
                host_player = player
                break
        
        # Broadcast game started event with timestamp for timer sync
        await manager.broadcast_to_room(room_id, {
            "type": "game_started",
            "startedAt": started_at.isoformat(),
            "questionsCount": len(sample_questions)
        })
        
        return StartGameResponse(
            success=True,
            message="Game started successfully",
            questionsCount=len(sample_questions),
            playerToken=host_player.player_token if host_player else None
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid room ID")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SubmitAnswerRequest(BaseModel):
    questionId: str
    answer: str


class SubmitAnswerResponse(BaseModel):
    success: bool
    isCorrect: bool
    correctAnswer: str
    points: int
    currentScore: int


@router.post("/{room_id}/submit-answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    room_id: str,
    request: SubmitAnswerRequest,
    playerToken: Optional[str] = Header(None, alias="playertoken")
):
    """Submit an answer and update player score"""
    try:
        if not playerToken:
            raise HTTPException(status_code=401, detail="Player token required")
        
        room_uuid = UUID(room_id)
        room = RoomStore.get_room(room_uuid)
        
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        if room.status != "started":
            raise HTTPException(status_code=400, detail="Game is not in progress")
        
        # Get player by token
        player = PlayerStore.get_player_by_token(playerToken)
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        if player.room_id != room_uuid:
            raise HTTPException(status_code=403, detail="Player does not belong to this room")
        
        # Get the question
        question_uuid = UUID(request.questionId)
        questions = QuestionStore.get_questions_by_room(room_uuid)
        question = next((q for q in questions if str(q.question_id) == request.questionId), None)
        
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Check if answer is correct
        correct_answer_option = question.options[question.correct_answer]
        is_correct = request.answer.lower().strip() == correct_answer_option.lower().strip()
        
        # Update score: 1 point for correct answer
        points = 1 if is_correct else 0
        if points > 0:
            updated_player = PlayerStore.update_player_score(player.player_id, points)
            current_score = updated_player.score
        else:
            current_score = player.score
        
        # Broadcast answer submitted event
        await manager.broadcast_to_room(room_id, {
            "type": "answer_submitted",
            "playerId": str(player.player_id),
            "questionId": request.questionId,
            "score": current_score
        })
        
        return SubmitAnswerResponse(
            success=True,
            isCorrect=is_correct,
            correctAnswer=correct_answer_option,
            points=points,
            currentScore=current_score
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid room ID or question ID")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class LeaderboardEntry(BaseModel):
    playerId: str
    score: int


class LeaderboardResponse(BaseModel):
    leaderboard: list[LeaderboardEntry]


@router.get("/{room_id}/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(room_id: str):
    """Get the leaderboard for a room"""
    try:
        room_uuid = UUID(room_id)
        room = RoomStore.get_room(room_uuid)
        
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        # Get players sorted by score (already sorted by Redis sorted set)
        players = PlayerStore.get_leaderboard(room_uuid)
        
        # Create leaderboard entries
        leaderboard_entries = [
            LeaderboardEntry(
                playerId=str(p.player_id),
                score=p.score if hasattr(p, 'score') else 0
            )
            for p in players
        ]
        
        return LeaderboardResponse(leaderboard=leaderboard_entries)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid room ID")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
