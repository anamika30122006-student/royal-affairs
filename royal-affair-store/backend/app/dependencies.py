from typing import Generator
from bson import ObjectId
from pymongo.database import Database
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_database
from app.utils.security import decode_jwt_token

security = HTTPBearer()

def get_db() -> Generator[Database, None, None]:
    """FastAPI dependency injection provider for PyMongo Database instance."""
    from app.database import connect_to_mongo, database_state
    db = get_database()
    if db is None or not database_state.get("connected"):
        connect_to_mongo()
        db = get_database()

    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable."
        )
    try:
        yield db
    finally:
        pass

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Database = Depends(get_db)
) -> dict:
    """Dependency to extract & validate Bearer token and return active user document."""
    token = credentials.credentials
    try:
        payload = decode_jwt_token(token)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(ve)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Provided token is not a valid access token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id_str = payload.get("sub")
    if not user_id_str or not ObjectId.is_valid(user_id_str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token payload.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable."
        )

    user = db.users.find_one({"_id": ObjectId(user_id_str)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )

    return user

def get_current_admin(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Dependency to ensure current authenticated user has 'admin' or 'super_admin' role."""
    if current_user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Admin or Super Admin privilege required."
        )
    return current_user
