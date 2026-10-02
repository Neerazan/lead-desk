"""Security utilities: JWT token creation/verification, password hashing, and cookie helpers."""
import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal

import jwt
from fastapi import Response
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher

from app.core.config import settings
from app.models import AuthTokens, TokenPayload, UserRole

password_hash = PasswordHash(
    (
        Argon2Hasher(),
        BcryptHasher(),
    )
)


ALGORITHM = "HS256"


def _payload(
    *,
    sub: str,
    role: UserRole,
    token_type: Literal["access", "refresh"],
    expires_delta: timedelta,
    jti: uuid.UUID | None = None,
) -> dict:
    now = datetime.now(UTC)
    payload: dict = {
        "sub": sub,
        "role": str(role),
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    if jti is not None:
        payload["jti"] = str(jti)
    return payload


def create_access_token(
    *,
    sub: str,
    role: UserRole,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Mint a short-lived, stateless access JWT (holds user ID and role).

    No jti needed — access tokens are stateless and cannot be individually
    revoked. Revocation is handled at the refresh-token layer.
    """
    delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_TTL_MINUTES)
    return jwt.encode(
        _payload(sub=sub, role=role, token_type="access", expires_delta=delta),
        settings.ACCESS_TOKEN_SECRET_KEY,
        algorithm=ALGORITHM,
    )


def create_refresh_token(
    *,
    sub: str,
    role: UserRole,
    jti: uuid.UUID,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Mint a long-lived refresh JWT.

    The jti (RFC 7519 §4.1.7) is embedded in the payload and stored as
    the primary key in the refresh_tokens table — enabling revocation and
    reuse detection without ever persisting the raw token.
    """
    delta = expires_delta or timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
    return jwt.encode(
        _payload(sub=sub, role=role, token_type="refresh", expires_delta=delta, jti=jti),
        settings.REFRESH_TOKEN_SECRET_KEY,
        algorithm=ALGORITHM,
    )


def create_auth_tokens(*, sub: str, role: UserRole) -> tuple[AuthTokens, uuid.UUID]:
    """
    Create a paired access + refresh token set.

    Returns:
        (AuthTokens, jti) — the caller must persist a RefreshToken DB record
        with this jti BEFORE sending the tokens to the client.

    Typical usage in a route handler:
        tokens, jti = create_auth_tokens(sub=str(user.id), role=user.role)
        expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
        db.add(RefreshToken(jti=jti, user_id=user.id, expires_at=expires_at))
        db.commit()
        set_auth_cookies(response, tokens.access_token, tokens.refresh_token)
    """
    jti = uuid.uuid4()
    access_token = create_access_token(sub=sub, role=role)
    refresh_token = create_refresh_token(sub=sub, role=role, jti=jti)
    return AuthTokens(access_token=access_token, refresh_token=refresh_token), jti



def decode_access_token(token: str) -> TokenPayload:
    """
    Decode and validate an access token.

    Raises jwt.InvalidTokenError on expiry, bad signature, or wrong type.
    """
    payload = jwt.decode(
        token,
        settings.ACCESS_TOKEN_SECRET_KEY,
        algorithms=[ALGORITHM],
    )
    if payload.get("type") != "access":
        raise InvalidTokenError("Not an access token.")
    return TokenPayload(**payload)


def decode_refresh_token(token: str) -> TokenPayload:
    """
    Decode and validate a refresh token.

    Raises jwt.InvalidTokenError on expiry, bad signature, or wrong type.
    After decoding, look up payload.jti in the DB to check revocation.
    """
    payload = jwt.decode(
        token,
        settings.REFRESH_TOKEN_SECRET_KEY,
        algorithms=[ALGORITHM],
    )
    if payload.get("type") != "refresh":
        raise InvalidTokenError("Not a refresh token.")
    return TokenPayload(**payload)


ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"

# Refresh cookie is scoped to auth routes only — the browser will NOT send
# it on calls to /api/leads, /api/admin/*, etc., minimising exposure.
REFRESH_COOKIE_PATH = "/api/auth"


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """
    Write both tokens as httpOnly, SameSite=Lax cookies.

    - Access cookie:  path=/          (sent on every request)
    - Refresh cookie: path=/api/auth  (sent ONLY to auth endpoints)
    - Secure flag:    from SECURE_COOKIES env var (False in dev, True in prod)
    """
    common = dict(httponly=True, samesite="lax", secure=settings.SECURE_COOKIES)

    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        max_age=settings.ACCESS_TOKEN_TTL_MINUTES * 60,
        path="/",
        **common,
    )
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
        **common,
    )


def clear_auth_cookies(response: Response) -> None:
    """Delete both auth cookies (used on logout)."""
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH)



def verify_password(plain_password: str, hashed_password: str) -> tuple[bool, str | None]:
    """
    Verify a plain-text password against its stored hash.

    Returns (is_valid, updated_hash).
    updated_hash is not None when pwdlib upgraded the algorithm
    (e.g. legacy bcrypt → argon2); the caller should persist the new hash.
    """
    return password_hash.verify_and_update(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a plain-text password with Argon2."""
    return password_hash.hash(password)
