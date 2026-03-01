from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/pipeline_dashboard"
    api_title: str = "Data Pipeline & ETL Dashboard API"
    api_version: str = "0.1.0"
    slack_webhook_url: Optional[str] = None  # Default for alert rules that omit webhook_url
    alert_check_interval_minutes: int = 15  # Run alert check every N minutes; 0 = disabled
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"  # Comma-separated origins for CORS

    class Config:
        env_file = ".env"


settings = Settings()
