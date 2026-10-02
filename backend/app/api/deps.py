import uuid
from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status
from jwt import InvalidTokenError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import AsyncSessionLocal
from app.core.security import ACCESS_COOKIE, decode_access_token
from app.models import User, UserRole


async def get_db() -> AsyncSession:  # type: ignore[override]
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DbSession,
    access_token: Annotated[str | None, Cookie(alias=ACCESS_COOKIE)] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )

    token = access_token
    if not token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]

    if not token:
        raise credentials_exception

    try:
        payload = decode_access_token(token)
    except InvalidTokenError:
        raise credentials_exception

    user = await db.get(User, uuid.UUID(payload.sub))

    if not user or not user.is_active:
        raise credentials_exception

    return user


def require_roles(*roles: UserRole):
    async def role_checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required" if roles == (UserRole.ADMIN,) else "Forbidden: insufficient permissions",
            )
        return current_user

    return role_checker


require_role = require_roles
get_current_admin = require_roles(UserRole.ADMIN)

CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentAdmin = Annotated[User, Depends(get_current_admin)]
