import asyncio
from functools import lru_cache


@lru_cache(maxsize=1)
def _load_model():
    """Load faster-whisper model — cached so it only loads once."""
    from faster_whisper import WhisperModel
    print("Loading Whisper model... (downloading ~150MB on first run, then cached)")
    # device="cpu", compute_type="int8" works on any machine including Mac M-series
    return WhisperModel("base", device="cpu", compute_type="int8")


async def transcribe_audio(file_path: str) -> str:
    """Transcribe audio file to text using faster-whisper."""
    loop = asyncio.get_event_loop()

    def _transcribe():
        model = _load_model()
        segments, info = model.transcribe(file_path, beam_size=5, language="en")
        # Collect all segments into a single string
        text = " ".join(seg.text.strip() for seg in segments)
        return text.strip()

    transcript = await loop.run_in_executor(None, _transcribe)
    return transcript
