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
    # Sync URL (used by Alembic migrations)
    DATABASE_URL: str = "postgresql://leaddesk:leaddesk_dev_secret@db:5432/leaddesk"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        return self.DATABASE_URL.replace(
            "postgresql://", "postgresql+asyncpg://", 1
        ).replace(
            "postgresql+psycopg://", "postgresql+asyncpg://", 1
        )

    JWT_SECRET: str = "supersecretjwtkey_change_in_production_12345"

    @property
    def ACCESS_TOKEN_SECRET_KEY(self) -> str:
        return f"{self.JWT_SECRET}_access"

    @property
    def REFRESH_TOKEN_SECRET_KEY(self) -> str:
        return f"{self.JWT_SECRET}_refresh"

    ACCESS_TOKEN_TTL_MINUTES: int = 15
    REFRESH_TOKEN_TTL_DAYS: int = 7
    SECURE_COOKIES: bool = False

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost"

    @property
    def CORS_ORIGINS(self) -> list[str]:
        return [origin.strip() for origin in self.FRONTEND_ORIGIN.split(",") if origin.strip()]


settings = Settings()
