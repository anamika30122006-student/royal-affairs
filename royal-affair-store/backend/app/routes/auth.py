from fastapi import APIRouter, Depends, status
from pymongo.database import Database
from app.dependencies import get_db, get_current_user, get_current_admin
from app.schemas.user import UserRegister, UserLogin, RefreshTokenRequest, UserResponse, TokenResponse, MessageResponse
from app.services.auth_service import register_new_user, authenticate_user, refresh_tokens, format_user_response

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    description="Registers a new user with full name, email, password, and optional phone. Normalizes email to lowercase and checks for duplicate email or phone."
)
async def register(
    user_data: UserRegister,
    db: Database = Depends(get_db)
):
    return register_new_user(db, user_data)

@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Login user",
    description="Authenticates user with email and password, returning JWT access and refresh tokens."
)
async def login(
    login_data: UserLogin,
    db: Database = Depends(get_db)
):
    return authenticate_user(db, login_data)

@router.post(
    "/refresh",
    summary="Refresh access token",
    description="Exchanges a valid refresh token for a fresh pair of access and refresh tokens."
)
async def refresh(
    refresh_data: RefreshTokenRequest,
    db: Database = Depends(get_db)
):
    return refresh_tokens(db, refresh_data.refresh_token)

@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
    description="Retrieves profile information for the currently authenticated user."
)
async def get_me(
    current_user: dict = Depends(get_current_user)
):
    return format_user_response(current_user)

@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Logout user session",
    description="Logs out the current user session."
)
async def logout(
    current_user: dict = Depends(get_current_user)
):
    return MessageResponse(
        message=f"User '{current_user.get('email')}' logged out successfully.",
        status="success"
    )

@router.get(
    "/admin-only",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Admin privileged route test",
    description="Sample protected route accessible only by users with role 'admin'."
)
async def admin_only_route(
    current_admin: dict = Depends(get_current_admin)
):
    return MessageResponse(
        message=f"Welcome Admin '{current_admin.get('full_name')}'. You have administrative access.",
        status="success"
    )
