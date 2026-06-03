from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # AI Provider — set OPENAI_API_KEY or GEMINI_API_KEY in .env
    openai_api_key: str = ""
    gemini_api_key: str = ""

    # AI Provider selection: "openai" or "gemini"
    ai_provider: str = "openai"

    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "voice_interview_db"

    # App
    max_history_messages: int = 10
    tts_engine: str = "gtts"  # "gtts" or "pyttsx3"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
