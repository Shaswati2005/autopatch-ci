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
    """Application configuration settings for AutoPatch-CI."""

    app_name: str = "AutoPatch-CI Agent API"
    environment: str = "development"
    debug: bool = True

    # Google GenAI / Gemini Settings
    gemini_api_key: str = ""
    gemini_model_name: str = "gemini-2.0-flash"

    # Google Cloud Platform Infrastructure & Firestore
    gcp_project_id: str = ""
    gcp_location: str = "us-central1"
    google_application_credentials: str = ""
    firestore_database: str = "(default)"
    gcp_service_account_key_path: str = ""

    # GitHub Integration & OAuth
    github_client_id: str = ""
    github_client_secret: str = ""
    github_webhook_secret: str = ""
    github_token: str = ""
    frontend_url: str = "http://localhost:3000"

    # Agent & Verification Settings
    adk_agent_enabled: bool = True
    max_patch_attempts: int = 3
    verification_strategy: str = "cloud_build"  # 'cloud_build' or 'local_sandbox'

    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()


