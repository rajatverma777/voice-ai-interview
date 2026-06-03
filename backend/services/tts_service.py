import asyncio
import io
from config import get_settings

settings = get_settings()


async def generate_speech(text: str) -> bytes:
    """Convert text to speech audio bytes."""
    loop = asyncio.get_event_loop()
    # Always try gTTS first; fall back to pyttsx3 if configured and gTTS fails
    if settings.tts_engine == "pyttsx3":
        try:
            return await loop.run_in_executor(None, _pyttsx3_tts, text)
        except Exception as e:
            print(f"pyttsx3 failed ({e}), falling back to gTTS")
    return await loop.run_in_executor(None, _gtts_tts, text)


def _gtts_tts(text: str) -> bytes:
    """Generate speech using gTTS (Google Text-to-Speech — requires internet)."""
    from gtts import gTTS

    clean_text = _clean_for_speech(text)
    tts = gTTS(text=clean_text, lang="en", slow=False)
    audio_buffer = io.BytesIO()
    tts.write_to_fp(audio_buffer)
    audio_buffer.seek(0)
    return audio_buffer.read()


def _pyttsx3_tts(text: str) -> bytes:
    """Generate speech using pyttsx3 (offline). macOS may need 'say' backend."""
    import pyttsx3
    import tempfile
    import os

    clean_text = _clean_for_speech(text)
    engine = pyttsx3.init()
    engine.setProperty("rate", 150)
    engine.setProperty("volume", 0.9)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
        tmp_path = tmp.name

    engine.save_to_file(clean_text, tmp_path)
    engine.runAndWait()
    engine.stop()

    with open(tmp_path, "rb") as f:
        audio_bytes = f.read()

    os.unlink(tmp_path)
    return audio_bytes


def _clean_for_speech(text: str) -> str:
    """Strip markdown formatting so TTS sounds natural."""
    import re
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)   # bold
    text = re.sub(r'\*(.+?)\*', r'\1', text)         # italic
    text = re.sub(r'`(.+?)`', r'\1', text)            # inline code
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)  # headers
    text = ' '.join(text.split())
    return text
