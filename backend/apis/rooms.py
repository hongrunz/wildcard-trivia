"""
Room API endpoints
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from storage.store import RoomStore, PlayerStore, QuestionStore, TopicStore
from apis.llm.prompts import generate_questions_with_llm
from apis.websocket import manager
from apis.tts import get_audio_url
from apis.tts.prompts import render_commentary
from storage.client import get_redis_client
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


# Request/Response models
class CreateRoomRequest(BaseModel):
    name: str
    topics: Optional[list[str]] = []  # Topics are now optional, collected from players
    questionsPerRound: int
    timePerQuestion: int
    numRounds: int = 1  # Number of rounds in the game
    sessionMode: Optional[str] = 'player'  # 'player' or 'display'


class CreateRoomResponse(BaseModel):
    roomId: str
    hostToken: str


class JoinRoomRequest(BaseModel):
    playerName: str
    topic: str  # Required field


class JoinRoomResponse(BaseModel):
    playerId: str
    playerToken: str


class PlayerResponse(BaseModel):
    playerId: str
    playerName: str
    score: int = 0
    topicScore: dict[str, int] = {}  # Points per topic
    joinedAt: str


class QuestionResponse(BaseModel):
    id: str
    question: str
    topics: list[str]  # Topics associated with this question
    options: list[str]
    correctAnswer: int
    explanation: Optional[str] = None
    questionAudioUrl: Optional[str] = None  # Pre-generated TTS URL


class RoomResponse(BaseModel):
    roomId: str
    name: str
    topics: list[str]
    collectedTopics: list[str]  # Topics submitted by players
    questionsPerRound: int
    timePerQuestion: int
    numRounds: int  # Total number of rounds
    currentRound: int  # Current active round (1-indexed)
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


def _question_audio_url_key(question_id: str) -> str:
    """Get Redis key for question audio URL"""
    return f"question:{question_id}:audio_url"


def _commentary_key(room_id: str, commentary_id: str) -> str:
    """Get Redis key for commentary audio"""
    return f"room:{room_id}:commentary:{commentary_id}"


async def _generate_question_audio(question_text: str, question_id: str) -> Optional[str]:
    """
    Generate TTS audio for a question and store in Redis. Returns audio URL.
    
    Note: This reads ONLY the question text as-is, without any prefix, answer, or explanation.
    """
    try:
        # Log question being read
        logger.info(f"Generating question audio for question_id={question_id}: {question_text}")
        
        # Use question_id as part of cache key for determinism
        import hashlib
        text_hash = hashlib.sha256(question_text.encode("utf-8")).hexdigest()[:16]
        cache_key = f"question:tts:{text_hash}"
        # Run synchronous TTS generation in thread pool to avoid blocking
        # Pass question_text directly - no additions, no answers, just the question
        def _generate():
            return get_audio_url(
                question_text.strip(),  # Just the question text, no extra content
                cache_key,
                voice_config={"style": "game_show_host"},
            )
        audio_url = await asyncio.to_thread(_generate)
        # Store the URL in Redis for quick lookup
        r = get_redis_client()
        r.set(_question_audio_url_key(question_id), audio_url)
        logger.info(f"Question audio generated successfully for question_id={question_id}")
        return audio_url
    except Exception as e:
        logger.error(f"Failed to generate TTS for question {question_id}: {e}")
        return None


async def _generate_questions_audio(questions: list[dict], question_ids: list[str]) -> dict[str, str]:
    """Generate TTS audio for multiple questions in parallel. Returns dict mapping question_id -> audio_url."""
    tasks = [
        _generate_question_audio("Read the question as is, don't answer it: " + q["question"], qid)
        for q, qid in zip(questions, question_ids)
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    audio_urls = {}
    for qid, result in zip(question_ids, results):
        if isinstance(result, Exception):
            logger.error(f"Error generating audio for question {qid}: {result}")
            audio_urls[qid] = None
        else:
            audio_urls[qid] = result
    return audio_urls


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
            topics=request.topics or [],  # Default to empty list if not provided
            questions_per_round=request.questionsPerRound,
            time_per_question=request.timePerQuestion,
            num_rounds=request.numRounds,
        )
        
        room = RoomStore.create_room(room_data)

        # Seed round-1 topics with any default topics provided at room creation.
        # This ensures host-provided topics always appear in `collectedTopics`
        # (and get used for question generation alongside player submissions).
        if request.topics:
            from uuid import uuid4
            for t in request.topics:
                topic = (t or "").strip()
                if topic:
                    TopicStore.add_topic(room.room_id, uuid4(), topic, round=1)
        
        # Only create a player for the host if in 'player' mode (mobile)
        # In 'display' mode (web/big screen), the host is not a player
        if request.sessionMode == 'player':
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
                topicScore=p.topic_score if hasattr(p, 'topic_score') else {},
                joinedAt=p.joined_at.isoformat()
            )
            for p in players
        ]
        
        # Get questions if game has started
        questions_response = None
        if room.status in ["started", "finished"]:
            questions = QuestionStore.get_questions_by_room(room_uuid)
            r = get_redis_client()
            questions_response = []
            for q in questions:
                # Retrieve audio URL from Redis
                audio_url = r.get(_question_audio_url_key(str(q.question_id)))
                questions_response.append(
                    QuestionResponse(
                        id=str(q.question_id),
                        question=q.question_text,
                        topics=q.topics,
                        options=q.options,
                        correctAnswer=q.correct_answer,
                        explanation=q.explanation,
                        questionAudioUrl=audio_url if audio_url else None
                    )
                )
        
        # Get collected topics for current round
        collected_topics = TopicStore.get_topics(room_uuid, room.current_round)
        
        return RoomResponse(
            roomId=str(room.room_id),
            name=room.name,
            topics=room.topics,
            collectedTopics=collected_topics,
            questionsPerRound=room.questions_per_round,
            timePerQuestion=room.time_per_question,
            numRounds=room.num_rounds,
            currentRound=room.current_round,
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
        
        # Validate topic is not empty
        if not request.topic or not request.topic.strip():
            raise HTTPException(status_code=400, detail="Topic is required")
        
        player = PlayerStore.create_player(room_uuid, request.playerName)
        
        # Add topic for round 1 (now required)
        TopicStore.add_topic(room_uuid, player.player_id, request.topic, round=1)
        
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
        # Note: In display mode, the host is not a player, so we need at least 1 player
        # In player mode, the host is already a player, so we should have at least 1 player too
        players = PlayerStore.get_players_by_room(room_uuid)
        if not players:
            raise HTTPException(status_code=400, detail="Cannot start game without players. Please wait for players to join.")
        
        # Get collected topics from players for round 1
        collected_topics = TopicStore.get_topics(room_uuid, round=1)
        
        # Use collected topics if available, otherwise fall back to room topics
        topics_to_use = collected_topics if collected_topics else room.topics
        
        if not topics_to_use:
            raise HTTPException(status_code=400, detail="No topics submitted. Please wait for players to submit topics.")
        
        # Generate questions for round 1
        sample_questions = generate_questions_with_llm(topics_to_use, room.questions_per_round)
        
        # Create questions in database
        from storage.models import QuestionCreate
        questions_to_create = [
            QuestionCreate(
                room_id=room_uuid,
                round=1,
                question_text=q["question"],
                topics=q.get("topics", []),
                options=q["options"],
                correct_answer=q["correct_answer"],
                explanation=q.get("explanation"),
                question_index=i
            )
            for i, q in enumerate(sample_questions)
        ]
        
        created_questions = QuestionStore.create_questions(questions_to_create)
        
        # Pre-generate TTS audio for all questions
        question_ids = [str(q.question_id) for q in created_questions]
        await _generate_questions_audio(sample_questions, question_ids)
        
        # Update room status (use UTC time for consistency across timezones)
        from datetime import timezone
        started_at = datetime.now(timezone.utc)
        RoomStore.update_room_status(room_uuid, "started", started_at)
        
        # Find the host's player record to get their player token (for mobile mode)
        # In display mode, host is not a player, so host_player will be None
        host_player = None
        for player in players:
            if player.player_name == room.host_name:
                host_player = player
                break
        
        # Broadcast game started event with timestamp for timer sync
        await manager.broadcast_to_room(room_id, {
            "type": "game_started",
            "startedAt": started_at.isoformat(),
            "currentRound": 1,
            "questionsCount": len(sample_questions)
        })
        
        # Broadcast commentary event for game started
        try:
            commentary_text = render_commentary("game_started", {})
            cache_key = _commentary_key(room_id, "game_started")
            audio_url = await asyncio.to_thread(
                lambda: get_audio_url(
                    commentary_text,
                    cache_key,
                    voice_config={"style": "game_show_host"},
                )
            )
            await manager.broadcast_to_room(room_id, {
                "type": "commentary_ready",
                "eventType": "game_started",
                "audioUrl": audio_url,
                "text": commentary_text,
            })
        except Exception as e:
            logger.error(f"Failed to generate game_started commentary: {e}")
        
        return StartGameResponse(
            success=True,
            message="Game started successfully",
            questionsCount=len(sample_questions),
            playerToken=host_player.player_token if host_player else None
        )
    except ValueError as e:
        # ValueError could be from UUID parsing or from Store methods
        error_msg = str(e)
        if "Room not found" in error_msg or "Player not found" in error_msg:
            raise HTTPException(status_code=404, detail=error_msg)
        raise HTTPException(status_code=400, detail=f"Invalid data: {error_msg}")
    except HTTPException:
        raise
    except Exception as e:
        # Return the actual error message for debugging
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


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
        
        # Update score: 100 points for correct answer
        points = 100 if is_correct else 0
        if points > 0:
            updated_player = PlayerStore.update_player_score(player.player_id, points, question.topics)
            QuestionStore.record_question_group_correct(room_uuid, request.questionId)
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

        # If all players have answered, broadcast so clients can transition to answer revelation and start review timer
        all_answered = QuestionStore.record_answer_and_check_all(room_uuid, request.questionId, player.player_id)
        if all_answered:
            review_started_at = datetime.now(timezone.utc)
            await manager.broadcast_to_room(room_id, {
                "type": "all_answers_submitted",
                "questionId": request.questionId,
                "reviewStartedAt": review_started_at.isoformat(),
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
    topicScore: dict[str, int] = {}  # Points per topic


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
                score=p.score if hasattr(p, 'score') else 0,
                topicScore=p.topic_score if hasattr(p, 'topic_score') else {}
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


class SubmitTopicRequest(BaseModel):
    topic: str


class SubmitTopicResponse(BaseModel):
    success: bool
    submittedCount: int
    totalPlayers: int


@router.post("/{room_id}/submit-topic", response_model=SubmitTopicResponse)
async def submit_topic(
    room_id: str,
    request: SubmitTopicRequest,
    playerToken: Optional[str] = Header(None, alias="playertoken")
):
    """Submit a topic for the next round"""
    try:
        if not playerToken:
            raise HTTPException(status_code=401, detail="Player token required")
        
        room_uuid = UUID(room_id)
        room = RoomStore.get_room(room_uuid)
        
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        # Get player by token
        player = PlayerStore.get_player_by_token(playerToken)
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        if player.room_id != room_uuid:
            raise HTTPException(status_code=403, detail="Player does not belong to this room")
        
        # Validate topic
        topic = request.topic.strip()
        if not topic:
            raise HTTPException(status_code=400, detail="Topic cannot be empty")
        
        if len(topic) > 50:
            raise HTTPException(status_code=400, detail="Topic must be 50 characters or less")
        
        # Add topic to the next round
        next_round = room.current_round + 1
        TopicStore.add_topic(room_uuid, player.player_id, topic, next_round)
        
        # Get all topics for the next round to count submissions
        topics = TopicStore.get_topics(room_uuid, next_round)
        submitted_count = len(topics)
        
        # Get all players in the room to count total
        players = PlayerStore.get_players_by_room(room_uuid)
        total_players = len(players)
        
        # Broadcast topic submitted event
        await manager.broadcast_to_room(room_id, {
            "type": "topic_submitted",
            "playerId": str(player.player_id),
            "playerName": player.player_name,
            "topic": topic,
            "topics": topics,
            "submittedCount": submitted_count,
            "totalPlayers": total_players
        })
        
        # If all players have submitted, generate questions and start next round
        if submitted_count >= total_players:
            # Broadcast that all topics are collected
            await manager.broadcast_to_room(room_id, {
                "type": "all_topics_submitted",
                "topics": topics,
                "nextRound": next_round
            })
            
            # Generate questions for the next round
            sample_questions = generate_questions_with_llm(topics, room.questions_per_round)
            
            # Create questions in database
            from storage.models import QuestionCreate
            questions_to_create = [
                QuestionCreate(
                    room_id=room_uuid,
                    round=next_round,
                    question_text=q["question"],
                    topics=q.get("topics", []),
                    options=q["options"],
                    correct_answer=q["correct_answer"],
                    explanation=q.get("explanation"),
                    question_index=i
                )
                for i, q in enumerate(sample_questions)
            ]
            
            created_questions = QuestionStore.create_questions(questions_to_create)
            
            # Pre-generate TTS audio for all questions
            question_ids = [str(q.question_id) for q in created_questions]
            await _generate_questions_audio(sample_questions, question_ids)
            
            # Update room's current round
            from datetime import timezone
            new_started_at = datetime.now(timezone.utc)
            RoomStore.update_room_round(room_uuid, next_round, new_started_at)
            
            # Broadcast round changed event with new timestamp for timer sync
            await manager.broadcast_to_room(room_id, {
                "type": "round_changed",
                "startedAt": new_started_at.isoformat(),
                "currentRound": next_round,
                "questionsCount": len(sample_questions)
            })
            
            # Broadcast round finished commentary (for previous round)
            try:
                prev_round = next_round - 1
                commentary_text = render_commentary("round_finished", {
                    "round": prev_round,
                })
                commentary_id = f"round_finished_{prev_round}"
                cache_key = _commentary_key(room_id, commentary_id)
                audio_url = await asyncio.to_thread(
                    lambda: get_audio_url(
                        commentary_text,
                        cache_key,
                        voice_config={"style": "game_show_host"},
                    )
                )
                await manager.broadcast_to_room(room_id, {
                    "type": "commentary_ready",
                    "eventType": "round_finished",
                    "audioUrl": audio_url,
                    "text": commentary_text,
                    "commentaryId": commentary_id,
                })
            except Exception as e:
                logger.error(f"Failed to generate round_finished commentary: {e}")
        
        return SubmitTopicResponse(
            success=True,
            submittedCount=submitted_count,
            totalPlayers=total_players
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid room ID")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Game stats & awards (for game-over screen) ---

class GameStatsAward(BaseModel):
    playerIds: list[str]
    playerNames: list[str]
    awardName: str
    topic: Optional[str] = None


class GameStatsResponse(BaseModel):
    groupCorrectRate: int  # 0-100
    totalQuestions: int
    triviComment: str
    awards: list[GameStatsAward]


def _compute_game_stats_and_awards(room_uuid: UUID) -> GameStatsResponse:
    """Compute group correct rate and awards from room + leaderboard."""
    room = RoomStore.get_room(room_uuid)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    total_questions = room.num_rounds * room.questions_per_round
    group_correct_count = QuestionStore.get_questions_group_correct_count(room_uuid)
    group_correct_rate = round((group_correct_count / total_questions * 100)) if total_questions > 0 else 0
    group_correct_rate = min(100, max(0, group_correct_rate))

    trivi_comment = (
        f"Your group nailed {group_correct_rate}% of all questions Trivi came up with. Nice team work!"
    )

    players = PlayerStore.get_leaderboard(room_uuid)
    player_names = {str(p.player_id): p.player_name for p in players}
    awards: list[GameStatsAward] = []

    if not players:
        return GameStatsResponse(
            groupCorrectRate=group_correct_rate,
            totalQuestions=total_questions,
            triviComment=trivi_comment,
            awards=[],
        )

    # Wildcard King: player(s) with highest total score
    max_score = max(p.score if hasattr(p, "score") else 0 for p in players)
    kings = [p for p in players if (p.score if hasattr(p, "score") else 0) == max_score]
    if kings:
        awards.append(
            GameStatsAward(
                playerIds=[str(p.player_id) for p in kings],
                playerNames=[p.player_name for p in kings],
                awardName="The Wildcard King",
                topic=None,
            )
        )

    # Category awards: at least one "topic expert" award (pick best per topic)
    topic_titles = [
        "Subject Matter authority on {topic}",
        "Knowing the most about {topic}",
        "The \"One-Man\" Encyclopedia on {topic}",
    ]
    topic_scores: dict = {}  # topic -> [(player, score), ...]
    for p in players:
        ts = getattr(p, "topic_score", None) or {}
        for topic, score in ts.items():
            if topic not in topic_scores:
                topic_scores[topic] = []
            topic_scores[topic].append((p, score))
    for idx, (topic, lst) in enumerate(topic_scores.items()):
        if not lst:
            continue
        best_score = max(s for _, s in lst)
        winners = [pl for pl, s in lst if s == best_score and s > 0]
        if not winners:
            continue
        title_template = topic_titles[idx % len(topic_titles)]
        awards.append(
            GameStatsAward(
                playerIds=[str(p.player_id) for p in winners],
                playerNames=[p.player_name for p in winners],
                awardName=title_template.format(topic=topic),
                topic=topic,
            )
        )

    # Sharing a love for [topic]: pairs with similar topic score (if 3+ players)
    if len(players) >= 3 and topic_scores:
        for topic, lst in topic_scores.items():
            if len(lst) < 2:
                continue
            lst_sorted = sorted(lst, key=lambda x: -x[1])
            for i in range(len(lst_sorted)):
                for j in range(i + 1, len(lst_sorted)):
                    pi, si = lst_sorted[i]
                    pj, sj = lst_sorted[j]
                    if si > 0 and sj > 0 and abs(si - sj) <= 100:
                        awards.append(
                            GameStatsAward(
                                playerIds=[str(pi.player_id), str(pj.player_id)],
                                playerNames=[pi.player_name, pj.player_name],
                                awardName=f"Sharing a love for {topic}",
                                topic=topic,
                            )
                        )
                        break
                else:
                    continue
                break

    # Cap awards: max 3 if <=3 players, else max 5
    max_awards = 3 if len(players) <= 3 else 5
    awards = awards[:max_awards]

    return GameStatsResponse(
        groupCorrectRate=group_correct_rate,
        totalQuestions=total_questions,
        triviComment=trivi_comment,
        awards=awards,
    )


@router.get("/{room_id}/game-stats", response_model=GameStatsResponse)
async def get_game_stats(room_id: str):
    """Get game stats and awards for the game-over screen."""
    try:
        room_uuid = UUID(room_id)
        return _compute_game_stats_and_awards(room_uuid)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid room ID")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- TTS Commentary Endpoints ---

class GenerateCommentaryRequest(BaseModel):
    eventType: str
    data: dict = {}


class GenerateCommentaryResponse(BaseModel):
    audioUrl: str
    text: str
    commentaryId: str


@router.post("/{room_id}/generate-commentary", response_model=GenerateCommentaryResponse)
async def generate_commentary(room_id: str, request: GenerateCommentaryRequest):
    """Generate on-demand commentary for a game event"""
    try:
        room_uuid = UUID(room_id)
        room = RoomStore.get_room(room_uuid)
        
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        # Render commentary text from template
        try:
            commentary_text = render_commentary(request.eventType, request.data)
            logger.info(f"Generating commentary audio for eventType={request.eventType}, room_id={room_id}: {commentary_text}")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Generate unique commentary ID
        import secrets
        commentary_id = secrets.token_urlsafe(16)
        
        # Generate TTS audio (run in thread pool to avoid blocking)
        cache_key = _commentary_key(room_id, commentary_id)
        try:
            def _generate():
                return get_audio_url(
                    commentary_text,
                    cache_key,
                    voice_config={"style": "game_show_host"},
                )
            audio_url = await asyncio.to_thread(_generate)
            logger.info(f"Commentary audio generated successfully for eventType={request.eventType}, commentary_id={commentary_id}")
        except Exception as e:
            logger.error(f"Failed to generate TTS for commentary: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate audio: {str(e)}")
        
        return GenerateCommentaryResponse(
            audioUrl=audio_url,
            text=commentary_text,
            commentaryId=commentary_id
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid room ID")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{room_id}/commentary/{commentary_id}")
async def get_commentary_audio(room_id: str, commentary_id: str):
    """Stream audio file for commentary"""
    try:
        room_uuid = UUID(room_id)
        room = RoomStore.get_room(room_uuid)
        
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        # Retrieve audio from Redis
        r = get_redis_client()
        cache_key = _commentary_key(room_id, commentary_id)
        cached_b64 = r.get(cache_key)
        
        if not cached_b64:
            raise HTTPException(status_code=404, detail="Commentary audio not found")
        
        # Decode base64 and return as audio response
        import base64
        from fastapi.responses import Response
        
        audio_bytes = base64.b64decode(cached_b64)
        
        # Determine content type from audio URL format or default to wav
        content_type = "audio/wav"
        
        return Response(
            content=audio_bytes,
            media_type=content_type,
            headers={
                "Content-Disposition": f'inline; filename="commentary_{commentary_id}.wav"'
            }
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid room ID")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
