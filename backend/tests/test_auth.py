"""
Tests for authentication flows.

Covers:
  1. Login with correct credentials sets both cookies.
  2. Login with a wrong password returns 401.
  3. Refresh returns new tokens (cookies updated).
  4. Reusing the old refresh token after rotation returns 401.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import login


@pytest.mark.asyncio
async def test_login_success_sets_both_cookies(client: AsyncClient, member_user):
    """Correct credentials → 200 + both httpOnly cookies present."""
    resp = await login(client, "member@example.com", "Member@123")

    assert resp.status_code == 200, resp.text

    cookies = resp.cookies
    assert "access_token" in cookies, "access_token cookie missing"
    assert "refresh_token" in cookies, "refresh_token cookie missing"

    body = resp.json()
    assert body["email"] == "member@example.com"
    assert body["role"] == "member"


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client: AsyncClient, member_user):
    """Wrong password → 401 Unauthorized."""
    resp = await login(client, "member@example.com", "wrongpassword!")

    assert resp.status_code == 401, resp.text
    assert "access_token" not in resp.cookies
    assert "refresh_token" not in resp.cookies


@pytest.mark.asyncio
async def test_login_unknown_email_returns_401(client: AsyncClient):
    """Unknown email → 401 (no user created for this test)."""
    resp = await login(client, "nobody@example.com", "whatever")
    assert resp.status_code == 401, resp.text


@pytest.mark.asyncio
async def test_refresh_returns_new_tokens(client: AsyncClient, member_user):
    """
    After login, calling /auth/refresh should succeed (200) and
    rotate the refresh_token cookie. The endpoint also sets a fresh
    access_token cookie.
    """
    # 1. Login to obtain initial cookies
    login_resp = await login(client, "member@example.com", "Member@123")
    assert login_resp.status_code == 200

    old_refresh = login_resp.cookies.get("refresh_token")
    assert old_refresh, "No refresh_token cookie after login"

    refresh_resp = await client.post("/api/auth/refresh")
    assert refresh_resp.status_code == 200, refresh_resp.text

    # access_token cookie must be present (may be same value if same second)
    assert refresh_resp.cookies.get("access_token") is not None

    # refresh_token must be rotated to a NEW value on every use
    new_refresh = refresh_resp.cookies.get("refresh_token")
    assert new_refresh is not None
    assert new_refresh != old_refresh, "refresh_token should be rotated after /refresh"


@pytest.mark.asyncio
async def test_reusing_old_refresh_token_returns_401(client: AsyncClient, member_user):
    """
    After token rotation, the previous refresh token is revoked.
    Replaying it must return 401.
    """
    # 1. Login
    login_resp = await login(client, "member@example.com", "Member@123")
    assert login_resp.status_code == 200

    old_refresh = login_resp.cookies["refresh_token"]

    # 2. First refresh — rotates token, old one is now revoked
    first_refresh = await client.post("/api/auth/refresh")
    assert first_refresh.status_code == 200

    # 3. Replay the original refresh token manually
    replay_resp = await client.post(
        "/api/auth/refresh",
        cookies={"refresh_token": old_refresh},
    )
    assert replay_resp.status_code == 401, replay_resp.text
