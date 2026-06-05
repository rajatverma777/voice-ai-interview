from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class InterviewMode(str, Enum):
    DSA = "dsa"
    HR = "hr"
    SYSTEM_DESIGN = "system_design"


# ── Auth ────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ── Chat ────────────────────────────────────────────────────────────
class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    message: str
    session_id: str
    mode: InterviewMode = InterviewMode.DSA
    difficulty: Optional[str] = "medium"
    history: Optional[List[Message]] = []


class ChatResponse(BaseModel):
    response: str
    session_id: str
    feedback: Optional[dict] = None


class TTSRequest(BaseModel):
    text: str
    voice_speed: Optional[float] = 1.0


class SessionHistory(BaseModel):
    session_id: str
    messages: List[Message]
    mode: InterviewMode
    created_at: datetime
    score: Optional[float] = None


class FeedbackScore(BaseModel):
    technical_accuracy: float
    communication_clarity: float
    confidence_level: float
    overall_score: float
    suggestions: List[str]
