from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "NEXRA Messaging Platform"
    VERSION: str = "1.0.0"
    API_STR: str = "/api/v1"
    SECRET_KEY: str

    # Database
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    # Base URL for Webhooks
    WEBHOOK_BASE_URL: Optional[str] = None

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # SMPP MTN Ghana
    MTN_SMPP_HOST: str
    MTN_SMPP_PORT: int
    MTN_SMPP_SYSTEM_ID: str
    MTN_SMPP_PASSWORD: str
    MTN_SMPP_SYSTEM_TYPE: str

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # Admin Registration
    ADMIN_REGISTRATION_KEY: Optional[str] = "nexra-admin-2026-secure-key"

    # Email / SMTP
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: Optional[str] = None
    
    # JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    
    # Paystack
    PAYSTACK_SECRET_KEY: Optional[str] = None
    PAYSTACK_PUBLIC_KEY: Optional[str] = None
    
    # SMS Providers
    SMS_PROVIDER: str = "arkesel"  # arkesel, hubtel, or mtn_smpp
    
    # Arkesel Settings
    ARKESEL_API_KEY: Optional[str] = None
    ARKESEL_SENDER_ID: str = "NEXRA"
    
    # Hubtel Settings
    HUBTEL_CLIENT_ID: Optional[str] = None
    HUBTEL_CLIENT_SECRET: Optional[str] = None
    
    # MTN SMPP Settings
    MTN_SMPP_HOST: Optional[str] = None
    MTN_SMPP_PORT: int = 2775
    MTN_SMPP_SYSTEM_ID: Optional[str] = None
    MTN_SMPP_PASSWORD: Optional[str] = None

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.SQLALCHEMY_DATABASE_URI:
            self.SQLALCHEMY_DATABASE_URI = (
                f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"
            )

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
