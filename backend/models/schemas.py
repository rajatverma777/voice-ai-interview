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


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    profile_photo: Optional[str] = None


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
    target_role: Optional[str] = None
    target_company: Optional[str] = None
    preferred_model: Optional[str] = "gemini"


class ChatResponse(BaseModel):
    response: str
    session_id: str
    feedback: Optional[dict] = None
    model_used: Optional[str] = None


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "en-US-JennyNeural"
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
