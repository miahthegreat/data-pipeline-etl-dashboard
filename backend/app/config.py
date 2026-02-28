from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/pipeline_dashboard"
    api_title: str = "Data Pipeline & ETL Dashboard API"
    api_version: str = "0.1.0"
    slack_webhook_url: Optional[str] = None  # Default for alert rules that omit webhook_url

    class Config:
        env_file = ".env"


settings = Settings()
