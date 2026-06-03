from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest, ChatResponse
from services.ai_service import generate_response
from services.feedback_service import analyze_response
from utils.database import get_db
from datetime import datetime

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Generate AI interviewer response."""
    try:
        ai_response = await generate_response(
            message=request.message,
            history=request.history,
            mode=request.mode
        )

        # Analyze response for feedback
        feedback = await analyze_response(request.message, ai_response, request.mode)

        # Persist to MongoDB
        try:
            db = get_db()
            await db.sessions.update_one(
                {"session_id": request.session_id},
                {
                    "$push": {
                        "messages": {
                            "$each": [
                                {"role": "user", "content": request.message, "timestamp": datetime.utcnow()},
                                {"role": "assistant", "content": ai_response, "timestamp": datetime.utcnow()}
                            ]
                        }
                    },
                    "$set": {"mode": request.mode, "updated_at": datetime.utcnow()},
                    "$setOnInsert": {"created_at": datetime.utcnow()}
                },
                upsert=True
            )
        except Exception:
            pass  # DB optional — don't fail the response

        return ChatResponse(
            response=ai_response,
            session_id=request.session_id,
            feedback=feedback
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@router.get("/modes")
async def get_interview_modes():
    """Return available interview modes."""
    return {
        "modes": [
            {"id": "dsa", "label": "DSA & Algorithms", "description": "Data structures, algorithms, complexity"},
            {"id": "hr", "label": "HR & Behavioral", "description": "Soft skills, experience, situational questions"},
            {"id": "system_design", "label": "System Design", "description": "Architecture, scalability, design patterns"}
        ]
    }
