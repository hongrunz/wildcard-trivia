"""
Database store: functions to interact with Supabase
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4
import secrets
from supabase import Client

from db.models import Room, RoomCreate, Player, PlayerCreate, Question, QuestionCreate
from db.client import get_supabase_client


def generate_token() -> str:
    """Generate a random token for authentication"""
    return secrets.token_urlsafe(32)


class RoomStore:
    """Store for room operations"""

    @staticmethod
    def create_room(room_data: RoomCreate) -> Room:
        """Create a new room"""
        client = get_supabase_client()
        
        room_id = uuid4()
        room_dict = {
            "room_id": str(room_id),
            "name": room_data.name,
            "host_name": room_data.host_name,
            "host_token": room_data.host_token,
            "topics": room_data.topics,
            "questions_per_round": room_data.questions_per_round,
            "time_per_question": room_data.time_per_question,
            "status": "waiting",
        }
        
        result = client.table("rooms").insert(room_dict).execute()
        
        if not result.data:
            raise ValueError("Failed to create room")
        
        return Room(**result.data[0])

    @staticmethod
    def get_room(room_id: UUID) -> Optional[Room]:
        """Get a room by ID"""
        client = get_supabase_client()
        
        result = client.table("rooms").select("*").eq("room_id", str(room_id)).execute()
        
        if not result.data:
            return None
        
        return Room(**result.data[0])

    @staticmethod
    def get_room_by_host_token(host_token: str) -> Optional[Room]:
        """Get a room by host token"""
        client = get_supabase_client()
        
        result = client.table("rooms").select("*").eq("host_token", host_token).execute()
        
        if not result.data:
            return None
        
        return Room(**result.data[0])

    @staticmethod
    def update_room_status(room_id: UUID, status: str, started_at: Optional[datetime] = None) -> Room:
        """Update room status"""
        client = get_supabase_client()
        
        update_data = {"status": status}
        if started_at:
            update_data["started_at"] = started_at.isoformat()
        
        result = client.table("rooms").update(update_data).eq("room_id", str(room_id)).execute()
        
        if not result.data:
            raise ValueError(f"Room {room_id} not found")
        
        return Room(**result.data[0])


class PlayerStore:
    """Store for player operations"""

    @staticmethod
    def create_player(room_id: UUID, player_name: str) -> Player:
        """Create a new player in a room"""
        client = get_supabase_client()
        
        player_id = uuid4()
        player_token = generate_token()
        
        player_dict = {
            "player_id": str(player_id),
            "room_id": str(room_id),
            "player_name": player_name,
            "player_token": player_token,
        }
        
        result = client.table("players").insert(player_dict).execute()
        
        if not result.data:
            raise ValueError("Failed to create player (may already exist)")
        
        return Player(**result.data[0])

    @staticmethod
    def get_players_by_room(room_id: UUID) -> List[Player]:
        """Get all players in a room"""
        client = get_supabase_client()
        
        result = client.table("players").select("*").eq("room_id", str(room_id)).order("joined_at").execute()
        
        if not result.data:
            return []
        
        return [Player(**player) for player in result.data]

    @staticmethod
    def get_player_by_token(player_token: str) -> Optional[Player]:
        """Get a player by token"""
        client = get_supabase_client()
        
        result = client.table("players").select("*").eq("player_token", player_token).execute()
        
        if not result.data:
            return None
        
        return Player(**result.data[0])


class QuestionStore:
    """Store for question operations"""

    @staticmethod
    def create_questions(questions: List[QuestionCreate]) -> List[Question]:
        """Create multiple questions for a room"""
        client = get_supabase_client()
        
        questions_dict = [
            {
                "question_id": str(uuid4()),
                "room_id": str(q.room_id),
                "question_text": q.question_text,
                "options": q.options,
                "correct_answer": q.correct_answer,
                "explanation": q.explanation,
                "question_index": q.question_index,
            }
            for q in questions
        ]
        
        result = client.table("questions").insert(questions_dict).execute()
        
        if not result.data:
            raise ValueError("Failed to create questions")
        
        return [Question(**q) for q in result.data]

    @staticmethod
    def get_questions_by_room(room_id: UUID) -> List[Question]:
        """Get all questions for a room"""
        client = get_supabase_client()
        
        result = client.table("questions").select("*").eq("room_id", str(room_id)).order("question_index").execute()
        
        if not result.data:
            return []
        
        return [Question(**q) for q in result.data]
