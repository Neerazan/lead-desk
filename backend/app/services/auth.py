"""Auth service — all authentication business logic lives here, not in routes."""
import uuid
from datetime import UTC, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.security import (
    create_auth_tokens,
    get_password_hash,
    verify_password,
)
from app.models import AuthTokens, RefreshToken, User, UserCreate

DUMMY_HASH: str = get_password_hash("dummy-placeholder-timing-attack-prevention")

async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await db.get(User, user_id)


async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    user = User(
        name=user_in.name,
        email=user_in.email,
        role=user_in.role,
        is_active=user_in.is_active,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    await db.flush()   # get user.id without committing yet
    await db.refresh(user)
    return user


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> User | None:
    db_user = await get_user_by_email(db, email)

    if not db_user:
        verify_password(password, DUMMY_HASH)
        return None

    is_valid, updated_hash = verify_password(password, db_user.hashed_password)

    if not is_valid:
        return None

    if not db_user.is_active:
        return None

    if updated_hash:
        db_user.hashed_password = updated_hash
        db.add(db_user)

    return db_user


def _refresh_expires_at() -> datetime:
    return datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)


async def issue_tokens(db: AsyncSession, user: User) -> AuthTokens:
    tokens, jti = create_auth_tokens(sub=str(user.id), role=user.role)

    db_token = RefreshToken(
        jti=jti,
        user_id=user.id,
        expires_at=_refresh_expires_at(),
    )
    db.add(db_token)
    await db.flush()

    return tokens


async def rotate_tokens(
    db: AsyncSession, old_jti: uuid.UUID, user: User
) -> AuthTokens:
    old_token = await db.get(RefreshToken, old_jti)
    if old_token:
        old_token.is_revoked = True
        old_token.revoked_at = datetime.now(UTC)
        db.add(old_token)

    return await issue_tokens(db, user)


async def revoke_token(db: AsyncSession, jti: uuid.UUID) -> None:
    """Revoke a single refresh token (logout)."""
    token = await db.get(RefreshToken, jti)
    if token and not token.is_revoked:
        token.is_revoked = True
        token.revoked_at = datetime.now(UTC)
        db.add(token)

