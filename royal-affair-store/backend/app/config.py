import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Ensure environment variables from backend/.env are loaded before
# the Settings instance is created. This guarantees `settings` sees
# values when modules import it during app startup.
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    # fallback: attempt to load any .env in the current working dir
    load_dotenv()

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

    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # Transactional email (SMTP)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    EMAIL_FROM: str = ""
    EMAIL_FROM_NAME: str = "Royal Affair"
    ADMIN_NOTIFICATION_EMAIL: str = ""

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:8000"

    model_config = SettingsConfigDict(
        env_file=[BASE_DIR / ".env", ".env"],
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

settings = Settings()
