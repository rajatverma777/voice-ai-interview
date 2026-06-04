from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # AI Provider
    openai_api_key: str = ""
    gemini_api_key: str = ""
    ai_provider: str = "openai"

    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "voice_interview_db"

    # JWT Auth
    jwt_secret: str = "voice-ai-interview-super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours

    # App
    max_history_messages: int = 10
    tts_engine: str = "gtts"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
