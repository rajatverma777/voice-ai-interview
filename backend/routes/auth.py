from fastapi import APIRouter, HTTPException, Depends
from models.schemas import RegisterRequest, LoginRequest, AuthResponse, UpdateProfileRequest
from utils.database import get_db
from utils.auth import hash_password, verify_password, create_access_token, get_current_user
from datetime import datetime
import re

router = APIRouter()


def _validate_email(email: str) -> bool:
    return bool(re.match(r"[^@]+@[^@]+\.[^@]+", email))


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(body: RegisterRequest):
    """Create a new user account."""
    if len(body.username.strip()) < 2:
        raise HTTPException(400, "Username must be at least 2 characters")
    if not _validate_email(body.email):
        raise HTTPException(400, "Invalid email address")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    try:
        db = get_db()
        existing = await db.users.find_one({"email": body.email.lower()})
        if existing:
            raise HTTPException(409, "An account with this email already exists")

        user_doc = {
            "username": body.username.strip(),
            "email": body.email.lower().strip(),
            "password_hash": hash_password(body.password),
            "created_at": datetime.utcnow(),
            "total_sessions": 0,
            "avg_score": 0.0,
        }
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)

        token = create_access_token({
            "sub": user_id,
            "username": user_doc["username"],
            "email": user_doc["email"],
        })

        return AuthResponse(
            access_token=token,
            user={"id": user_id, "username": user_doc["username"], "email": user_doc["email"]}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Registration failed: {str(e)}")


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    """Authenticate and return a JWT."""
    try:
        db = get_db()
        user = await db.users.find_one({"email": body.email.lower()})
        if not user or not verify_password(body.password, user["password_hash"]):
            raise HTTPException(401, "Invalid email or password")

        user_id = str(user["_id"])
        token = create_access_token({
            "sub": user_id,
            "username": user["username"],
            "email": user["email"],
        })

        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )

        return AuthResponse(
            access_token=token,
            user={"id": user_id, "username": user["username"], "email": user["email"]}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Login failed: {str(e)}")


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return current user info + session stats."""
    try:
        db = get_db()
        from bson import ObjectId
        user = await db.users.find_one(
            {"_id": ObjectId(current_user["user_id"])},
            {"password_hash": 0, "_id": 0}
        )
        if not user:
            raise HTTPException(404, "User not found")

        session_count = await db.sessions.count_documents({"user_id": current_user["user_id"]})
        user["total_sessions"] = session_count
        return user
    except HTTPException:
        raise
    except Exception:
        return current_user


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout — client discards the JWT."""
    return {"message": f"Goodbye, {current_user['username']}!"}


@router.post("/update", response_model=AuthResponse)
async def update_profile(body: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    """Update user profile details and return an updated JWT."""
    try:
        db = get_db()
        from bson import ObjectId
        
        user_id = current_user["user_id"]
        
        # Build update document
        update_doc = {}
        if body.username is not None:
            username = body.username.strip()
            if len(username) < 2:
                raise HTTPException(400, "Username must be at least 2 characters")
            update_doc["username"] = username
            
        if body.email is not None:
            email = body.email.strip().lower()
            if not _validate_email(email):
                raise HTTPException(400, "Invalid email address")
            # Check if email is already taken by another user
            existing = await db.users.find_one({"email": email, "_id": {"$ne": ObjectId(user_id)}})
            if existing:
                raise HTTPException(409, "An account with this email already exists")
            update_doc["email"] = email
            
        if body.profile_photo is not None:
            update_doc["profile_photo"] = body.profile_photo
            
        if not update_doc:
            raise HTTPException(400, "No update fields provided")
            
        # Update user in database
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_doc}
        )
        
        # Get updated user info
        updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not updated_user:
            raise HTTPException(404, "User not found")
            
        # Create a new access token with updated details
        token = create_access_token({
            "sub": user_id,
            "username": updated_user.get("username", current_user["username"]),
            "email": updated_user.get("email", current_user["email"]),
        })
        
        return AuthResponse(
            access_token=token,
            user={
                "id": user_id,
                "username": updated_user.get("username"),
                "email": updated_user.get("email"),
                "profile_photo": updated_user.get("profile_photo", "")
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Profile update failed: {str(e)}")
