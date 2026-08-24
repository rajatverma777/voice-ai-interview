from fastapi import APIRouter, HTTPException, Depends
from utils.database import get_db
from utils.auth import get_current_user
from datetime import datetime

router = APIRouter()


@router.get("/{session_id}")
async def get_history(session_id: str, current_user: dict = Depends(get_current_user)):
    """Fetch chat history for a session."""
    try:
        db = get_db()
        session = await db.sessions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        if not session:
            return {"session_id": session_id, "messages": [], "mode": "dsa"}
        
        # Verify ownership
        if session.get("user_id") and session.get("user_id") != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
            
        return session
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


@router.delete("")
@router.delete("/")
async def clear_all_history(current_user: dict = Depends(get_current_user)):
    """Clear all chat history sessions."""
    try:
        db = get_db()
        result = await db.sessions.delete_many({"user_id": current_user["user_id"]})
        return {"message": "All sessions cleared", "deleted_count": result.deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


@router.delete("/{session_id}")
async def clear_history(session_id: str, current_user: dict = Depends(get_current_user)):
    """Clear chat history for a session."""
    try:
        db = get_db()
        # Verify ownership
        existing = await db.sessions.find_one({"session_id": session_id})
        if existing and existing.get("user_id") and existing.get("user_id") != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized to delete this session")

        await db.sessions.delete_one({"session_id": session_id})
        return {"message": "Session cleared", "session_id": session_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


@router.get("/")
async def list_sessions(current_user: dict = Depends(get_current_user)):
    """List all sessions (latest 20) — metadata only, NO messages to keep response small."""
    try:
        db = get_db()
        pipeline = [
            {"$match": {"user_id": current_user["user_id"]}},
            {"$sort": {"created_at": -1}},
            {"$limit": 20},
            {
                "$addFields": {
                    "preferred_model": {
                        "$ifNull": [
                            "$preferred_model",
                            {
                                "$let": {
                                    "vars": {
                                        "assistant_msgs": {
                                            "$filter": {
                                                "input": {"$ifNull": ["$messages", []]},
                                                "as": "m",
                                                "cond": {"$and": [
                                                    {"$eq": ["$$m.role", "assistant"]},
                                                    {"$ne": ["$$m.model_used", None]}
                                                ]}
                                            }
                                        }
                                    },
                                    "in": {
                                        "$cond": {
                                            "if": {"$gt": [{"$size": "$$assistant_msgs"}, 0]},
                                            "then": {
                                                "$let": {
                                                    "vars": {
                                                        "last_model": {"$arrayElemAt": ["$$assistant_msgs.model_used", -1]}
                                                    },
                                                    "in": {
                                                        "$cond": {
                                                            "if": {"$regexMatch": {"input": "$$last_model", "regex": "Local Distil", "options": "i"}},
                                                            "then": "gpt2",
                                                            "else": {
                                                                "$cond": {
                                                                    "if": {"$regexMatch": {"input": "$$last_model", "regex": "SVM|Heuristic", "options": "i"}},
                                                                    "then": "svm",
                                                                    "else": "cloud"
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            "else": "cloud"
                                        }
                                    }
                                }
                            }
                        ]
                    },
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

