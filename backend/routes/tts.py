from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import TTSRequest
from services.tts_service import generate_speech
import io

router = APIRouter()


@router.post("/synthesize")
async def synthesize(request: TTSRequest):
    """Convert text to speech audio."""
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    if len(request.text) > 2000:
        raise HTTPException(status_code=400, detail="Text too long (max 2000 characters)")

    try:
        voice = request.voice or "en-US-JennyNeural"
        speed_pct = int(round((request.voice_speed - 1.0) * 100))
        rate_str = f"{'+' if speed_pct >= 0 else ''}{speed_pct}%"
        audio_bytes = await generate_speech(request.text, voice=voice, rate=rate_str)

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=response.mp3"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")
