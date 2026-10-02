from contextlib import asynccontextmanager

import email_validator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

email_validator.TEST_ENVIRONMENT = True

from app.api import api_router
from app.core.config import settings
from app.core.db import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))

    yield

    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration allowing credentials (needed for httpOnly cookies)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routes under /api
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/")
def read_root():
    return {
        "status": "ok",
        "message": f"{settings.PROJECT_NAME} is running",
    }
