from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import speech, ai_response, tts, history

app = FastAPI(
    title="Voice AI Interview Assistant",
    description="Backend API for Voice AI Interview Assistant",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(speech.router, prefix="/api/speech", tags=["Speech"])
app.include_router(ai_response.router, prefix="/api/ai", tags=["AI"])
app.include_router(tts.router, prefix="/api/tts", tags=["TTS"])
app.include_router(history.router, prefix="/api/history", tags=["History"])

@app.get("/")
async def root():
    return {"message": "Voice AI Interview Assistant API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
