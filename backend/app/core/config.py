from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "Lead Desk API"
    API_PREFIX: str = "/api"

    # Database
    DATABASE_URL: str = "postgresql://leaddesk:leaddesk_dev_secret@db:5432/leaddesk"

    # JWT Authentication
    # Use a single secret; in production you can split into ACCESS_SECRET/REFRESH_SECRET
    JWT_SECRET: str = "supersecretjwtkey_change_in_production_12345"
    # Separate signing secrets per token type prevents cross-type forgery
    ACCESS_TOKEN_SECRET_KEY: str = "access_supersecret_change_in_production"
    REFRESH_TOKEN_SECRET_KEY: str = "refresh_supersecret_change_in_production"

    ACCESS_TOKEN_TTL_MINUTES: int = 15
    REFRESH_TOKEN_TTL_DAYS: int = 7
    SECURE_COOKIES: bool = False

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:3000"


settings = Settings()

