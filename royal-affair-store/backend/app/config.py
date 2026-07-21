import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "Royal Affair API"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "127.0.0.1"

    # MongoDB Atlas Connection Environment Variables
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "royal_affair_db"

    # JWT Security Configuration
    SECRET_KEY: str = "your_super_secret_jwt_key_here_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:8000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

settings = Settings()
