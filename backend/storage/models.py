"""
Database models for Wildcard Trivia
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID


class RoomBase(BaseModel):
    name: str
    host_name: str
    topics: List[str] = []  # Topics are now optional, collected from players
    questions_per_round: int
    time_per_question: int


class RoomCreate(RoomBase):
    host_token: str


class Room(RoomBase):
    room_id: UUID
    host_token: str
    status: str  # 'waiting', 'started', 'finished'
    created_at: datetime
    started_at: Optional[datetime] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class PlayerBase(BaseModel):
    player_name: str


class PlayerCreate(PlayerBase):
    room_id: UUID
    player_token: str


class Player(PlayerBase):
    player_id: UUID
    room_id: UUID
    player_token: str
    score: int = 0
    topic_score: dict[str, int] = {}  # Points scored per topic
    joined_at: datetime

    class Config:
        from_attributes = True


class QuestionBase(BaseModel):
    question_text: str
    topics: List[str] = []  # Topics associated with this question
    options: List[str]
    correct_answer: int
    explanation: Optional[str] = None
    question_index: int


class QuestionCreate(QuestionBase):
    room_id: UUID


class Question(QuestionBase):
    question_id: UUID
    room_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class RoomWithPlayers(BaseModel):
    """Room with related players"""
    room: Room
    players: List[Player]


class RoomWithQuestions(BaseModel):
    """Room with related questions"""
    room: Room
    questions: List[Question]
