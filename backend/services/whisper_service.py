import asyncio
from functools import lru_cache


@lru_cache(maxsize=1)
def _load_model():
    """Load faster-whisper model — cached so it only loads once."""
    from faster_whisper import WhisperModel
    print("Loading Whisper model... (downloading ~150MB on first run, then cached)")
    # device="cpu", compute_type="int8" works on any machine including Mac M-series
    return WhisperModel("base", device="cpu", compute_type="int8")


def deduplicate_transcript(text: str) -> str:
    """Detect and remove consecutive repeating phrase loops in transcription."""
    words = text.strip().split()
    if len(words) < 8:
        return text.strip()
        
    # Check for repeating n-word windows (n from 2 to 12) repeating consecutively
    for n in range(2, min(12, len(words) // 3)):
        for i in range(len(words) - 3 * n):
            w1 = words[i:i+n]
            w2 = words[i+n:i+2*n]
            w3 = words[i+2*n:i+3*n]
            if w1 == w2 == w3:
                # Repetition loop found! Return the text truncated at the first occurrence
                print(f"[WHISPER] Deduplicated loop of length {n} at word index {i}")
                return " ".join(words[:i+n])
                
    return text.strip()


async def transcribe_audio(file_path: str) -> str:
    """Transcribe audio file to text using faster-whisper with loop prevention."""
    loop = asyncio.get_event_loop()

    def _transcribe():
        model = _load_model()
        # condition_on_previous_text=False prevents silence context loops
        # vad_filter=True uses Silero VAD to strip silent segments before transcription
        segments, info = model.transcribe(
            file_path,
            beam_size=5,
            language="en",
            condition_on_previous_text=False,
            vad_filter=True
        )
        text = " ".join(seg.text.strip() for seg in segments)
        return deduplicate_transcript(text)

    transcript = await loop.run_in_executor(None, _transcribe)
    return transcript
