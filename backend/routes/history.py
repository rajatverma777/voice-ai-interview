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


@router.delete("")
@router.delete("/")
async def clear_all_history():
    """Clear all chat history sessions."""
    try:
        db = get_db()
        result = await db.sessions.delete_many({})
        return {"message": "All sessions cleared", "deleted_count": result.deleted_count}
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
    """List all sessions (latest 20) — metadata only, NO messages to keep response small."""
    try:
        db = get_db()
        pipeline = [
            {"$sort": {"created_at": -1}},
            {"$limit": 20},
            {
                "$addFields": {
                    "message_count": {
                        "$size": {
                            "$filter": {
                                "input": {"$ifNull": ["$messages", []]},
                                "as": "m",
                                "cond": {"$eq": ["$$m.role", "user"]}
                            }
                        }
                    },
                    "score_summary": {
                        "technical": {
                            "$avg": {
                                "$filter": {
                                    "input": {
                                        "$map": {
                                            "input": {"$ifNull": ["$messages", []]},
                                            "as": "m",
                                            "in": "$$m.feedback.technical_accuracy"
                                        }
                                    },
                                    "as": "val",
                                    "cond": {"$ne": ["$$val", None]}
                                }
                            }
                        },
                        "clarity": {
                            "$avg": {
                                "$filter": {
                                    "input": {
                                        "$map": {
                                            "input": {"$ifNull": ["$messages", []]},
                                            "as": "m",
                                            "in": "$$m.feedback.communication_clarity"
                                        }
                                    },
                                    "as": "val",
                                    "cond": {"$ne": ["$$val", None]}
                                }
                            }
                        },
                        "confidence": {
                            "$avg": {
                                "$filter": {
                                    "input": {
                                        "$map": {
                                            "input": {"$ifNull": ["$messages", []]},
                                            "as": "m",
                                            "in": "$$m.feedback.confidence_level"
                                        }
                                    },
                                    "as": "val",
                                    "cond": {"$ne": ["$$val", None]}
                                }
                            }
                        },
                        "overall": {
                            "$avg": {
                                "$filter": {
                                    "input": {
                                        "$map": {
                                            "input": {"$ifNull": ["$messages", []]},
                                            "as": "m",
                                            "in": "$$m.feedback.overall_score"
                                        }
                                    },
                                    "as": "val",
                                    "cond": {"$ne": ["$$val", None]}
                                }
                            }
                        }
                    },
                    "suggestions": {
                        "$reduce": {
                            "input": {"$ifNull": ["$messages.feedback.suggestions", []]},
                            "initialValue": [],
                            "in": {"$concatArrays": ["$$value", {"$ifNull": ["$$this", []]}]}
                        }
                    }
                }
            },
            {"$project": {"_id": 0, "messages": 0}}
        ]
        cursor = db.sessions.aggregate(pipeline)
        sessions = await cursor.to_list(length=20)
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

