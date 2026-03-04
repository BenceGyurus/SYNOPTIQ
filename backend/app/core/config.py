from pydantic_settings import BaseSettings
from typing import List, Optional, Union
from pydantic import EmailStr

class Settings(BaseSettings):
    PROJECT_NAME: str = "SOLARIS NEXUS"
    API_V1_STR: str = "/api/v1"

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Backend CORS origins
    # A comma-separated list of origins. e.g. http://localhost,http://localhost:3000
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost"]

    # Database
    DATABASE_URL: str

    # Inverter polling
    POLLING_INTERVAL_SECONDS: int = 5
    INVERTER_POLL_TIMEOUT: int = 10

    # Inverter Configuration (from ENV)
    INVERTER_NAME: str = "My Inverter"
    INVERTER_SERIAL: Optional[str] = None
    INVERTER_IP: Optional[str] = None
    INVERTER_PORT: int = 8484

    # Email settings
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[EmailStr] = None
    EMAILS_FROM_NAME: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()