from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, example="Anamika Sharma")
    email: EmailStr = Field(..., example="anamika@royalaffair.in")
    phone: Optional[str] = Field(None, example="+91 9219956289")
    password: str = Field(..., min_length=6, example="Password123!")
    role: Optional[str] = Field("user", example="user")

class UserLogin(BaseModel):
    email: EmailStr = Field(..., example="anamika@royalaffair.in")
    password: str = Field(..., example="Password123!")

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")

class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    role: str
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class MessageResponse(BaseModel):
    message: str
    status: str = "success"
