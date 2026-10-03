"""
Role-based access control tests.

Covers:
  - A member calling GET /api/admin/users → 403 Forbidden.
  - An admin calling GET /api/admin/users → 200 OK.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import login


@pytest.mark.asyncio
async def test_member_cannot_access_admin_users(client: AsyncClient, member_user, admin_user):
    """A member must be denied access to the admin user-list endpoint."""
    login_resp = await login(client, "member@example.com", "Member@123")
    assert login_resp.status_code == 200

    resp = await client.get("/api/admin/users")
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_admin_can_access_admin_users(client: AsyncClient, admin_user, member_user):
    """An admin must receive the full user list from the admin endpoint."""
    login_resp = await login(client, "admin@example.com", "Admin@123")
    assert login_resp.status_code == 200

    resp = await client.get("/api/admin/users")
    assert resp.status_code == 200, resp.text

    users = resp.json()
    assert isinstance(users, list)
    emails = [u["email"] for u in users]
    # Both seeded users should appear
    assert "admin@example.com" in emails
    assert "member@example.com" in emails


@pytest.mark.asyncio
async def test_unauthenticated_cannot_access_admin_users(client: AsyncClient):
    """Unauthenticated request → 401, not 403."""
    resp = await client.get("/api/admin/users")
    assert resp.status_code == 401, resp.text
