import uuid
from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from jwt import InvalidTokenError

from app.api.deps import CurrentUser, DbSession
from app.core.security import (
    REFRESH_COOKIE,
    clear_auth_cookies,
    decode_refresh_token,
    set_auth_cookies,
)
from app.models import Authenticate, Message, RefreshToken, User, UserPublic
from app.services.auth import (
    authenticate_user,
    issue_tokens,
    revoke_token,
    rotate_tokens,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserPublic)
async def login(
    fields: Authenticate,
    response: Response,
    db: DbSession,
) -> UserPublic:
    user = await authenticate_user(db, fields.email, fields.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    tokens = await issue_tokens(db, user)
    set_auth_cookies(response, tokens.access_token, tokens.refresh_token)
    return UserPublic.model_validate(user)


@router.post("/refresh", response_model=Message)
async def refresh(
    response: Response,
    db: DbSession,
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE)] = None,
) -> Message:
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = decode_refresh_token(refresh_token)
    except InvalidTokenError:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    jti: uuid.UUID = payload.jti  # type: ignore[assignment]

    db_token = await db.get(RefreshToken, jti)

    if not db_token or db_token.is_revoked:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked token",
        )

    user = await db.get(User, db_token.user_id)

    if not user or not user.is_active:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    tokens = await rotate_tokens(db, jti, user)
    set_auth_cookies(response, tokens.access_token, tokens.refresh_token)
    return Message(message="Token refreshed")


@router.post("/logout", response_model=Message)
async def logout(
    response: Response,
    db: DbSession,
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE)] = None,
) -> Message:
    if refresh_token:
        try:
            payload = decode_refresh_token(refresh_token)
            await revoke_token(db, payload.jti)  # type: ignore[arg-type]
        except Exception:
            pass  # Invalid token — cookies cleared below regardless

    clear_auth_cookies(response)
    return Message(message="Logged out successfully")


@router.get("/me", response_model=UserPublic)
async def get_me(current_user: CurrentUser) -> UserPublic:
    """Return the profile of the currently authenticated user."""
    return UserPublic.model_validate(current_user)
