from datetime import datetime, timezone
from bson import ObjectId
from pymongo.database import Database
from fastapi import HTTPException, status
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_jwt_token

def format_user_response(user_doc: dict) -> UserResponse:
    """Format MongoDB user document to Pydantic UserResponse."""
    return UserResponse(
        id=str(user_doc.get("_id")),
        full_name=user_doc.get("full_name", ""),
        email=user_doc.get("email", ""),
        phone=user_doc.get("phone"),
        role=user_doc.get("role", "user"),
        is_active=user_doc.get("is_active", True),
        created_at=user_doc.get("created_at").isoformat() if isinstance(user_doc.get("created_at"), datetime) else str(user_doc.get("created_at", "")),
        updated_at=user_doc.get("updated_at").isoformat() if isinstance(user_doc.get("updated_at"), datetime) else str(user_doc.get("updated_at", ""))
    )

def register_new_user(db: Database, user_data: UserRegister) -> TokenResponse:
    """Register a new user, checking duplicate email and phone."""
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable."
        )

    clean_email = user_data.email.strip().lower()
    
    # 1. Check duplicate email
    existing_user_email = db.users.find_one({"email": clean_email})
    if existing_user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email is already registered."
        )

    # 2. Check duplicate phone if provided
    clean_phone = user_data.phone.strip() if user_data.phone else None
    if clean_phone:
        existing_user_phone = db.users.find_one({"phone": clean_phone})
        if existing_user_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this phone number is already registered."
            )

    # 3. Hash password & prepare document
    hashed_pwd = hash_password(user_data.password)
    now = datetime.now(timezone.utc)
    
    assigned_role = user_data.role if user_data.role in ("user", "admin") else "user"

    user_doc = {
        "full_name": user_data.full_name.strip(),
        "email": clean_email,
        "phone": clean_phone,
        "hashed_password": hashed_pwd,
        "role": assigned_role,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }

    result = db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    # 4. Generate JWT tokens
    user_id_str = str(result.inserted_id)
    token_payload = {
        "sub": user_id_str,
        "email": clean_email,
        "role": assigned_role
    }

    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

    user_resp = format_user_response(user_doc)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user_resp
    )

def authenticate_user(db: Database, login_data: UserLogin) -> TokenResponse:
    """Authenticate user with email and password."""
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable."
        )

    clean_email = login_data.email.strip().lower()
    user_doc = db.users.find_one({"email": clean_email})

    if not user_doc or not verify_password(login_data.password, user_doc.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support."
        )

    user_id_str = str(user_doc["_id"])
    assigned_role = user_doc.get("role", "user")

    token_payload = {
        "sub": user_id_str,
        "email": clean_email,
        "role": assigned_role
    }

    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

    user_resp = format_user_response(user_doc)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user_resp
    )

def refresh_tokens(db: Database, refresh_token: str) -> dict:
    """Validate refresh token and issue new access & refresh tokens."""
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable."
        )

    try:
        payload = decode_jwt_token(refresh_token)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid refresh token: {str(ve)}"
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Provided token is not a refresh token."
        )

    user_id_str = payload.get("sub")
    if not user_id_str or not ObjectId.is_valid(user_id_str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload."
        )

    user_doc = db.users.find_one({"_id": ObjectId(user_id_str)})
    if not user_doc or not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists or is inactive."
        )

    token_payload = {
        "sub": str(user_doc["_id"]),
        "email": user_doc["email"],
        "role": user_doc.get("role", "user")
    }

    new_access_token = create_access_token(token_payload)
    new_refresh_token = create_refresh_token(token_payload)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

def get_user_by_id(db: Database, user_id: str) -> Optional[dict]:
    """Retrieve user document by ObjectId string."""
    if db is None or not ObjectId.is_valid(user_id):
        return None
    return db.users.find_one({"_id": ObjectId(user_id)})
