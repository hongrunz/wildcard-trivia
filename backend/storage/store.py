"""
Database store: functions to interact with Redis
"""

import json
from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4
import secrets

from storage.models import Room, RoomCreate, Player, PlayerCreate, Question, QuestionCreate
from storage.client import get_redis_client


def generate_token() -> str:
    """Generate a random token for authentication"""
    return secrets.token_urlsafe(32)


def _room_key(room_id: UUID) -> str:
    """Get Redis key for a room"""
    return f"room:{room_id}"


def _player_key(player_id: UUID) -> str:
    """Get Redis key for a player"""
    return f"player:{player_id}"


def _room_players_key(room_id: UUID) -> str:
    """Get Redis key for room players set"""
    return f"room:{room_id}:players"


def _room_questions_key(room_id: UUID, round: int) -> str:
    """Get Redis key for room questions list by round"""
    return f"room:{room_id}:{round}:questions"


def _room_scores_key(room_id: UUID) -> str:
    """Get Redis key for room scores sorted set"""
    return f"room:{room_id}:scores"


def _host_token_key(host_token: str) -> str:
    """Get Redis key for host token mapping"""
    return f"host_token:{host_token}"


def _player_token_key(player_token: str) -> str:
    """Get Redis key for player token mapping"""
    return f"player_token:{player_token}"


def _room_topics_key(room_id: UUID, round: int) -> str:
    """Get Redis key for room topics set"""
    return f"room:{room_id}:{round}:topics"


def _room_question_answered_key(room_id: UUID, question_id: str) -> str:
    """Get Redis key for set of player IDs who have answered this question"""
    return f"room:{room_id}:q:{question_id}:answered"


class RoomStore:
    """Store for room operations"""

    @staticmethod
    def create_room(room_data: RoomCreate) -> Room:
        """Create a new room"""
        r = get_redis_client()
        
        room_id = uuid4()
        from datetime import timezone
        now = datetime.now(timezone.utc)
        
        room_dict = {
            "room_id": str(room_id),
            "name": room_data.name,
            "host_name": room_data.host_name,
            "host_token": room_data.host_token,
            "topics": json.dumps(room_data.topics),  # Store as JSON string
            "questions_per_round": str(room_data.questions_per_round),
            "time_per_question": str(room_data.time_per_question),
            "status": "waiting",
            "current_round": "1",  # Start at round 1
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "num_rounds": str(room_data.num_rounds),
        }
        
        # Store room as hash
        room_key = _room_key(room_id)
        r.hset(room_key, mapping=room_dict)
        
        # Store host token mapping
        r.set(_host_token_key(room_data.host_token), str(room_id))
        
        # Initialize room players set (empty initially, will be populated when players join)
        
        # Create Room object
        room_dict["topics"] = room_data.topics  # Restore as list for model
        room_dict["questions_per_round"] = room_data.questions_per_round
        room_dict["time_per_question"] = room_data.time_per_question
        room_dict["num_rounds"] = room_data.num_rounds
        return Room(**room_dict)

    @staticmethod
    def get_room(room_id: UUID) -> Optional[Room]:
        """Get a room by ID"""
        r = get_redis_client()
        
        room_key = _room_key(room_id)
        room_data = r.hgetall(room_key)
        
        if not room_data:
            return None
        
        # Parse fields
        room_data["topics"] = json.loads(room_data.get("topics", "[]"))
        room_data["questions_per_round"] = int(room_data.get("questions_per_round", "0"))
        room_data["time_per_question"] = int(room_data.get("time_per_question", "0"))
        room_data["num_rounds"] = int(room_data.get("num_rounds", "1"))
        room_data["current_round"] = int(room_data.get("current_round", "1"))
        room_data["room_id"] = UUID(room_data["room_id"])
        room_data["created_at"] = datetime.fromisoformat(room_data["created_at"])
        room_data["updated_at"] = datetime.fromisoformat(room_data["updated_at"])
        if room_data.get("started_at"):
            room_data["started_at"] = datetime.fromisoformat(room_data["started_at"])
        else:
            room_data["started_at"] = None
        
        return Room(**room_data)

    @staticmethod
    def get_room_by_host_token(host_token: str) -> Optional[Room]:
        """Get a room by host token"""
        r = get_redis_client()
        
        room_id_str = r.get(_host_token_key(host_token))
        if not room_id_str:
            return None
        
        return RoomStore.get_room(UUID(room_id_str))

    @staticmethod
    def update_room_status(room_id: UUID, status: str, started_at: Optional[datetime] = None) -> Room:
        """Update room status"""
        r = get_redis_client()
        
        room_key = _room_key(room_id)
        
        # Check if room exists
        if not r.exists(room_key):
            raise ValueError(f"Room {room_id} not found")
        
        from datetime import timezone
        update_data = {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if started_at:
            update_data["started_at"] = started_at.isoformat()
        
        r.hset(room_key, mapping=update_data)
        
        return RoomStore.get_room(room_id)
    
    @staticmethod
    def update_room_round(room_id: UUID, current_round: int, started_at: Optional[datetime] = None) -> Room:
        """Update current round and optionally reset the timer"""
        r = get_redis_client()
        
        room_key = _room_key(room_id)
        
        # Check if room exists
        if not r.exists(room_key):
            raise ValueError(f"Room {room_id} not found")
        
        from datetime import timezone
        update_data = {
            "current_round": str(current_round),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Update started_at if provided (for resetting timer on new round)
        if started_at:
            update_data["started_at"] = started_at.isoformat()
        
        r.hset(room_key, mapping=update_data)
        
        return RoomStore.get_room(room_id)


class PlayerStore:
    """Store for player operations"""

    @staticmethod
    def create_player(room_id: UUID, player_name: str) -> Player:
        """Create a new player in a room"""
        r = get_redis_client()
        
        # Check if room exists
        if not r.exists(_room_key(room_id)):
            raise ValueError("Room not found")
        
        player_id = uuid4()
        player_token = generate_token()
        from datetime import timezone
        now = datetime.now(timezone.utc)
        
        player_dict = {
            "player_id": str(player_id),
            "room_id": str(room_id),
            "player_name": player_name,
            "player_token": player_token,
            "score": "0",
            "topic_score": json.dumps({}),
            "joined_at": now.isoformat(),
        }
        
        # Store player as hash
        player_key = _player_key(player_id)
        r.hset(player_key, mapping=player_dict)
        
        # Add player to room players set
        r.sadd(_room_players_key(room_id), str(player_id))
        
        # Store player token mapping
        r.set(_player_token_key(player_token), str(player_id))
        
        # Initialize score in sorted set
        r.zadd(_room_scores_key(room_id), {str(player_id): 0})
        
        # Create Player object
        player_dict["score"] = 0
        player_dict["topic_score"] = {}
        return Player(**player_dict)

    @staticmethod
    def get_players_by_room(room_id: UUID) -> List[Player]:
        """Get all players in a room"""
        r = get_redis_client()
        
        # Get all player IDs from the room's player set
        player_ids = r.smembers(_room_players_key(room_id))
        player_ids = {pid for pid in player_ids if pid}  # Remove empty string if present
        
        if not player_ids:
            return []
        
        players = []
        for player_id_str in player_ids:
            player_key = _player_key(UUID(player_id_str))
            player_data = r.hgetall(player_key)
            
            if player_data:
                player_data["player_id"] = UUID(player_data["player_id"])
                player_data["room_id"] = UUID(player_data["room_id"])
                player_data["score"] = int(player_data.get("score", "0"))
                player_data["topic_score"] = json.loads(player_data.get("topic_score", "{}"))
                player_data["joined_at"] = datetime.fromisoformat(player_data["joined_at"])
                players.append(Player(**player_data))
        
        # Sort by joined_at
        players.sort(key=lambda p: p.joined_at)
        
        return players

    @staticmethod
    def get_player_by_token(player_token: str) -> Optional[Player]:
        """Get a player by token"""
        r = get_redis_client()
        
        player_id_str = r.get(_player_token_key(player_token))
        if not player_id_str:
            return None
        
        player_key = _player_key(UUID(player_id_str))
        player_data = r.hgetall(player_key)
        
        if not player_data:
            return None
        
        player_data["player_id"] = UUID(player_data["player_id"])
        player_data["room_id"] = UUID(player_data["room_id"])
        player_data["score"] = int(player_data.get("score", "0"))
        player_data["topic_score"] = json.loads(player_data.get("topic_score", "{}"))
        player_data["joined_at"] = datetime.fromisoformat(player_data["joined_at"])
        
        return Player(**player_data)
    
    @staticmethod
    def update_player_score(player_id: UUID, points: int, topics: List[str] = None) -> Player:
        """Update player score by adding points and update topic_score"""
        r = get_redis_client()
        
        player_key = _player_key(player_id)
        player_data = r.hgetall(player_key)
        
        if not player_data:
            raise ValueError(f"Player {player_id} not found")
        
        # Get current score from hash
        current_score = int(player_data.get("score", "0"))
        new_score = current_score + points
        
        # Update score in hash
        r.hset(player_key, "score", str(new_score))
        
        # Update topic_score if topics provided and points > 0
        topic_score = json.loads(player_data.get("topic_score", "{}"))
        if topics and points > 0:
            for topic in topics:
                topic_score[topic] = topic_score.get(topic, 0) + points
            r.hset(player_key, "topic_score", json.dumps(topic_score))
        
        # Update score in sorted set for leaderboard
        room_id = UUID(player_data["room_id"])
        r.zadd(_room_scores_key(room_id), {str(player_id): new_score})
        
        # Return updated player
        player_data["player_id"] = UUID(player_data["player_id"])
        player_data["room_id"] = UUID(player_data["room_id"])
        player_data["score"] = new_score
        player_data["topic_score"] = topic_score
        player_data["joined_at"] = datetime.fromisoformat(player_data["joined_at"])
        
        return Player(**player_data)
    
    @staticmethod
    def get_player_by_id(player_id: UUID) -> Optional[Player]:
        """Get a player by ID"""
        r = get_redis_client()
        
        player_key = _player_key(player_id)
        player_data = r.hgetall(player_key)
        
        if not player_data:
            return None
        
        player_data["player_id"] = UUID(player_data["player_id"])
        player_data["room_id"] = UUID(player_data["room_id"])
        player_data["score"] = int(player_data.get("score", "0"))
        player_data["topic_score"] = json.loads(player_data.get("topic_score", "{}"))
        player_data["joined_at"] = datetime.fromisoformat(player_data["joined_at"])
        
        return Player(**player_data)
    
    @staticmethod
    def get_leaderboard(room_id: UUID) -> List[Player]:
        """Get players sorted by score (descending)"""
        r = get_redis_client()
        
        # Get player IDs sorted by score from sorted set
        scores_key = _room_scores_key(room_id)
        player_scores = r.zrevrange(scores_key, 0, -1, withscores=True)
        
        players = []
        for player_id_str, score in player_scores:
            player = PlayerStore.get_player_by_id(UUID(player_id_str))
            if player:
                players.append(player)
        
        return players


class TopicStore:
    """Store for topic operations"""

    @staticmethod
    def add_topic(room_id: UUID, player_id: UUID, topic: str, round: int) -> None:
        """Add a topic submitted by a player"""
        r = get_redis_client()
        
        # Check if room exists
        if not r.exists(_room_key(room_id)):
            raise ValueError("Room not found")
        
        # Store topic in Redis set (automatically handles duplicates)
        topics_key = _room_topics_key(room_id, round)
        r.sadd(topics_key, topic.strip())
    
    @staticmethod
    def get_topics(room_id: UUID, round: int) -> List[str]:
        """Get all topics submitted for a room"""
        r = get_redis_client()
        
        topics_key = _room_topics_key(room_id, round)
        topics = r.smembers(topics_key)
        
        return sorted([topic for topic in topics if topic])
    
    @staticmethod
    def clear_topics(room_id: UUID, round: int) -> None:
        """Clear all topics for a room"""
        r = get_redis_client()
        
        topics_key = _room_topics_key(room_id, round)
        r.delete(topics_key)


class QuestionStore:
    """Store for question operations"""

    @staticmethod
    def create_questions(questions: List[QuestionCreate]) -> List[Question]:
        """Create multiple questions for a room"""
        r = get_redis_client()
        
        questions_list = []
        from datetime import timezone
        now = datetime.now(timezone.utc)
        
        for q in questions:
            question_id = uuid4()
            question_dict = {
                "question_id": str(question_id),
                "room_id": str(q.room_id),
                "round": str(q.round),
                "question_text": q.question_text,
                "topics": json.dumps(q.topics),
                "options": json.dumps(q.options),
                "correct_answer": str(q.correct_answer),
                "explanation": q.explanation or "",
                "question_index": str(q.question_index),
                "created_at": now.isoformat(),
            }
            
            # Store question as JSON string in list
            questions_key = _room_questions_key(q.room_id, q.round)
            r.rpush(questions_key, json.dumps(question_dict))
            
            # Create Question object
            question_dict["topics"] = q.topics
            question_dict["options"] = q.options
            question_dict["correct_answer"] = q.correct_answer
            question_dict["question_index"] = q.question_index
            question_dict["round"] = q.round
            question_dict["question_id"] = question_id
            question_dict["room_id"] = q.room_id
            question_dict["created_at"] = now
            questions_list.append(Question(**question_dict))
        
        return questions_list

    @staticmethod
    def get_questions_by_room(room_id: UUID) -> List[Question]:
        """Get all questions for the current round of a room"""
        # Get the room to find current round
        room = RoomStore.get_room(room_id)
        if not room:
            return []
        
        # Get questions for current round
        return QuestionStore.get_questions_by_room_and_round(room_id, room.current_round)
    
    @staticmethod
    def get_questions_by_room_and_round(room_id: UUID, round: int) -> List[Question]:
        """Get all questions for a specific room and round"""
        r = get_redis_client()
        
        questions_key = _room_questions_key(room_id, round)
        question_strings = r.lrange(questions_key, 0, -1)
        
        if not question_strings:
            return []
        
        questions = []
        for q_str in question_strings:
            q_data = json.loads(q_str)
            q_data["question_id"] = UUID(q_data["question_id"])
            q_data["room_id"] = UUID(q_data["room_id"])
            q_data["round"] = int(q_data.get("round", "1"))
            q_data["topics"] = json.loads(q_data.get("topics", "[]"))
            q_data["options"] = json.loads(q_data["options"])
            q_data["correct_answer"] = int(q_data["correct_answer"])
            q_data["question_index"] = int(q_data["question_index"])
            q_data["created_at"] = datetime.fromisoformat(q_data["created_at"])
            questions.append(Question(**q_data))
        
        # Sort by question_index
        questions.sort(key=lambda q: q.question_index)
        
        return questions

    @staticmethod
    def record_answer_and_check_all(room_id: UUID, question_id: str, player_id: UUID) -> bool:
        """Record that a player answered the question. Returns True if all players in the room have now answered."""
        r = get_redis_client()
        key = _room_question_answered_key(room_id, question_id)
        r.sadd(key, str(player_id))
        answered_count = r.scard(key)
        players = PlayerStore.get_players_by_room(room_id)
        total_players = len(players)
        # Require at least one player; if room reports 0 (edge case), treat as 1 so solo play still transitions
        effective_total = max(1, total_players)
        all_done = answered_count >= effective_total
        return all_done
