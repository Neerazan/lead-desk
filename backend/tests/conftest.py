"""
Shared pytest fixtures.

Isolation strategy
------------------
* Each test function gets its own fresh SQLite :memory: database.
  The schema is created and torn down per-test — this is fast enough for
  a small test suite and gives perfect isolation with zero shared state.
* FastAPI's `get_db` dependency is overridden so the application code
  and fixtures share the same in-memory session.
"""

import email_validator
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel

# Pydantic EmailStr validates domains; TEST_ENVIRONMENT relaxes TLD checks
email_validator.TEST_ENVIRONMENT = True

from app.api.deps import get_db
from app.core.security import get_password_hash
from app.main import app
from app.models import User, UserRole


# ---------------------------------------------------------------------------
# Per-test in-memory database
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture()
async def db_session():
    """
    Create a fresh in-memory SQLite database for each test.
    The engine and session are torn down after the test completes.
    StaticPool keeps a single connection alive for the lifetime of the engine,
    which is required for SQLite :memory: (each new connection gets a blank DB).
    """
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    async with factory() as session:
        yield session

    await engine.dispose()


# ---------------------------------------------------------------------------
# ASGI test client wired to the test DB
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture()
async def client(db_session: AsyncSession):
    """AsyncClient whose requests are served against the per-test database."""

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# User factory helpers
# ---------------------------------------------------------------------------


async def _create_user(
    session: AsyncSession,
    *,
    name: str,
    email: str,
    password: str,
    role: UserRole,
) -> User:
    user = User(
        name=name,
        email=email,
        hashed_password=get_password_hash(password),
        role=role,
        is_active=True,
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture()
async def admin_user(db_session: AsyncSession) -> User:
    return await _create_user(
        db_session,
        name="Test Admin",
        email="admin@example.com",
        password="Admin@123",
        role=UserRole.ADMIN,
    )


@pytest_asyncio.fixture()
async def member_user(db_session: AsyncSession) -> User:
    return await _create_user(
        db_session,
        name="Test Member",
        email="member@example.com",
        password="Member@123",
        role=UserRole.MEMBER,
    )


@pytest_asyncio.fixture()
async def second_member_user(db_session: AsyncSession) -> User:
    return await _create_user(
        db_session,
        name="Other Member",
        email="other@example.com",
        password="Other@123",
        role=UserRole.MEMBER,
    )


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------


async def login(client: AsyncClient, email: str, password: str):
    """POST /api/auth/login and return the response."""
    return await client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
