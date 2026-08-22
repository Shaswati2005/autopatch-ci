"""Configuration settings for AutoPatch-CI using Pydantic Settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings loaded from environment or .env file."""

    app_name: str = "AutoPatch-CI Agent API"
    environment: str = "development"
    debug: bool = True

    # LLM Settings
    gemini_api_key: str = "mock-gemini-key"
    gemini_model_name: str = "gemini-2.5-flash"

    # GitHub Integration & OAuth
    github_token: str = "mock-github-token"
    github_client_id: str = ""
    github_client_secret: str = ""
    frontend_url: str = "http://localhost:3000"
    github_app_id: str = "123456"
    github_webhook_secret: str = "dev-secret"


    # GCP Infrastructure
    gcp_project_id: str = "autopatch-dev-project"
    pubsub_topic_name: str = "ci-failure-events"
    verification_strategy: str = "mock"  # Options: 'cloud_build', 'local_docker', 'mock'

    # Pipeline Thresholds
    max_patch_attempts: int = 3

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
