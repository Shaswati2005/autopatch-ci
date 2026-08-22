from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Determine candidate paths for .env
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent  # Repository Root
BACKEND_DIR = BASE_DIR / "backend"

ENV_FILES = [
    str(BACKEND_DIR / ".env"),
    str(BASE_DIR / ".env"),
    "backend/.env",
    ".env",
]

# Explicitly load into environment
for env_path in ENV_FILES:
    if Path(env_path).is_file():
        load_dotenv(env_path, override=True)


class Settings(BaseSettings):
    """Application configuration settings loaded from environment or .env file."""

    app_name: str = "AutoPatch-CI Agent API"
    environment: str = "development"
    debug: bool = True

    # LLM Settings
    gemini_api_key: str = "mock-gemini-key"
    gemini_model_name: str = "gemini-flash-latest"

    # GitHub Integration & OAuth

    github_token: str = "mock-github-token"
    github_client_id: str = ""
    github_client_secret: str = ""
    frontend_url: str = "http://localhost:3000"
    github_app_id: str = "123456"
    github_webhook_secret: str = "dev-secret"

    # Supabase / Database Integration
    supabase_url: str = ""
    supabase_key: str = ""
    database_url: str = ""

    # GCP Infrastructure
    gcp_project_id: str = "autopatch-dev-project"
    gcp_location: str = "us-central1"
    gcp_service_account_key_path: str = ""   # Path to SA JSON key for Cloud Build
    pubsub_topic_name: str = "ci-failure-events"
    verification_strategy: str = "mock"  # Options: 'cloud_build', 'local_docker', 'mock'
    adk_agent_enabled: bool = True

    # Pipeline Thresholds
    max_patch_attempts: int = 3

    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

