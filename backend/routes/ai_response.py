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
            mode=request.mode,
            difficulty=request.difficulty
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
                                {"role": "assistant", "content": ai_response, "feedback": feedback, "timestamp": datetime.utcnow()}
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


@router.get("/opening")
async def get_opening(mode: str, difficulty: str = "medium", session_id: str = None):
    """Fetch dynamic opening message with randomized first question."""
    try:
        from services.ai_service import get_random_opening_message, InterviewMode
        # Map string to InterviewMode
        mode_enum = InterviewMode(mode)
        opening_text = get_random_opening_message(mode_enum, difficulty)

        if session_id:
            try:
                db = get_db()
                await db.sessions.update_one(
                    {"session_id": session_id},
                    {
                        "$set": {
                            "messages": [
                                {
                                    "role": "assistant",
                                    "content": opening_text,
                                    "timestamp": datetime.utcnow(),
                                    "feedback": None
                                }
                            ],
                            "mode": mode,
                            "updated_at": datetime.utcnow()
                        },
                        "$setOnInsert": {
                            "created_at": datetime.utcnow()
                        }
                    },
                    upsert=True
                )
            except Exception as e:
                print(f"Failed to save opening message to DB: {e}")

        return {"opening_text": opening_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate opening: {str(e)}")


@router.get("/hint")
async def get_hint(mode: str, question: str):
    """Fetch hint for the current question."""
    try:
        from services.ai_service import DSA_QUESTIONS, HR_QUESTIONS, SYSTEM_QUESTIONS, DSA_HINTS, HR_HINTS, SYSTEM_HINTS
        q_clean = question.lower().strip()
        
        if mode == "dsa":
            for i, (_, q_text) in enumerate(DSA_QUESTIONS):
                q_db = q_text.lower()
                if q_db[:25] in q_clean or q_clean[:25] in q_db:
                    return {"hint": DSA_HINTS.get(i, "Try to explain your thought process step-by-step.")}
        elif mode == "hr":
            for i, q_text in enumerate(HR_QUESTIONS):
                q_db = q_text.lower()
                if q_db[:25] in q_clean or q_clean[:25] in q_db:
                    return {"hint": HR_HINTS.get(i, "Focus on a concrete STAR example (Situation, Task, Action, Result) from your past.")}
        else:
            for i, q_text in enumerate(SYSTEM_QUESTIONS):
                q_db = q_text.lower()
                if q_db[:25] in q_clean or q_clean[:25] in q_db:
                    return {"hint": SYSTEM_HINTS.get(i, "Address the requirements, choose appropriate databases, and outline scaling components.")}
                    
        return {"hint": "Think step-by-step and focus on technical details."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get hint: {str(e)}")
