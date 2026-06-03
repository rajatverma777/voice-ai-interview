from fastapi import APIRouter, UploadFile, File, HTTPException
from services.whisper_service import transcribe_audio
import tempfile
import os

router = APIRouter()


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """Convert uploaded audio to text using Whisper."""
    if not audio.content_type.startswith("audio/"):
        # Accept webm/ogg from browser MediaRecorder too
        allowed = ["audio/", "video/webm", "application/octet-stream"]
        if not any(audio.content_type.startswith(a) for a in allowed):
            raise HTTPException(status_code=400, detail="File must be an audio file")

    try:
        audio_bytes = await audio.read()

        # Save to temp file for Whisper
        suffix = ".webm"
        if audio.filename:
            ext = os.path.splitext(audio.filename)[1]
            if ext:
                suffix = ext

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        transcript = await transcribe_audio(tmp_path)
        os.unlink(tmp_path)

        return {"transcript": transcript, "status": "success"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
