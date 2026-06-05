from fastapi import APIRouter, HTTPException
from utils.database import get_db
from datetime import datetime

router = APIRouter()


@router.get("/{session_id}")
async def get_history(session_id: str):
    """Fetch chat history for a session."""
    try:
        db = get_db()
        session = await db.sessions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        if not session:
            return {"session_id": session_id, "messages": [], "mode": "dsa"}
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


@router.delete("/{session_id}")
async def clear_history(session_id: str):
    """Clear chat history for a session."""
    try:
        db = get_db()
        await db.sessions.delete_one({"session_id": session_id})
        return {"message": "Session cleared", "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


@router.get("/")
async def list_sessions():
    """List all sessions (latest 20)."""
    try:
        db = get_db()
        cursor = db.sessions.find({}, {"_id": 0}).sort("created_at", -1).limit(20)
        sessions = await cursor.to_list(length=20)
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")
