"""
Room API endpoints
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from db.store import RoomStore, PlayerStore, QuestionStore
from db.models import Room, Player, Question
from apis.questions import generate_sample_questions

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


def generate_token() -> str:
    """Generate a random token"""
    import secrets
    return secrets.token_urlsafe(32)


@router.post("", response_model=CreateRoomResponse, status_code=201)
async def create_room(request: CreateRoomRequest):
    """Create a new game room"""
    try:
        host_token = generate_token()
        
        from db.models import RoomCreate
        room_data = RoomCreate(
            name=request.name,
            host_name=request.name,  # Using name as host_name
            host_token=host_token,
            topics=request.topics,
            questions_per_round=request.questionsPerRound,
            time_per_question=request.timePerQuestion,
        )
        
        room = RoomStore.create_room(room_data)
        
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
        sample_questions = generate_sample_questions(room.topics, room.questions_per_round)
        
        # Create questions in database
        from db.models import QuestionCreate
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
        RoomStore.update_room_status(room_uuid, "started", datetime.now())
        
        return StartGameResponse(
            success=True,
            message="Game started successfully",
            questionsCount=len(sample_questions)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid room ID")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
