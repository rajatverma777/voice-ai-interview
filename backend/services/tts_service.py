import asyncio
import io
from config import get_settings

settings = get_settings()


async def generate_speech(text: str) -> bytes:
    """Convert text to speech. Tries edge-tts (neural) first, falls back to gTTS."""
    try:
        return await _edge_tts(text)
    except Exception as e:
        print(f"edge-tts failed ({e}), falling back to gTTS")
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _gtts_tts, text)


async def _edge_tts(text: str) -> bytes:
    """High-quality Microsoft neural TTS via edge-tts (free, no API key needed).
    
    Voice options:
      en-US-AriaNeural    — warm, natural female (default)
      en-US-GuyNeural     — natural male
      en-US-JennyNeural   — friendly female  
      en-GB-SoniaNeural   — British female
      en-GB-RyanNeural    — British male
    """
    import edge_tts

    clean = _clean_for_speech(text)
    voice = "en-US-AriaNeural"

    communicate = edge_tts.Communicate(clean, voice=voice, rate="+5%", pitch="+0Hz")

    buf = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])

    buf.seek(0)
    data = buf.read()
    if not data:
        raise RuntimeError("edge-tts returned empty audio")
    return data


def _gtts_tts(text: str) -> bytes:
    """Fallback: Google TTS (requires internet)."""
    from gtts import gTTS
    clean = _clean_for_speech(text)
    tts = gTTS(text=clean, lang="en", slow=False)
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    buf.seek(0)
    return buf.read()


def _clean_for_speech(text: str) -> str:
    """Strip markdown formatting so TTS sounds natural."""
    import re
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*',     r'\1', text)
    text = re.sub(r'`(.+?)`',       r'\1', text)
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    text = ' '.join(text.split())
    return text
