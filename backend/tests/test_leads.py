"""
Lead isolation tests.

Covers:
  - A member only receives their own leads from GET /api/leads.
  - A member cannot see another member's lead via GET /api/leads/{id}.
  - An admin sees all leads.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Lead, LeadStatus
from tests.conftest import login


async def _seed_lead(
    session: AsyncSession,
    *,
    name: str,
    email: str,
    owner_id,
) -> Lead:
    lead = Lead(
        name=name,
        email=email,
        company="Test Corp",
        status=LeadStatus.NEW,
        owner_id=owner_id,
    )
    session.add(lead)
    await session.flush()   # get lead.id; stays inside the open savepoint
    await session.refresh(lead)
    return lead


@pytest.mark.asyncio
async def test_member_only_sees_own_leads(
    client: AsyncClient,
    db_session: AsyncSession,
    member_user,
    second_member_user,
):
    """
    Given two members each with one lead,
    each member's /api/leads must return only their own lead.
    """
    lead_a = await _seed_lead(
        db_session,
        name="Member A Lead",
        email="lead-a@example.com",
        owner_id=member_user.id,
    )
    await _seed_lead(
        db_session,
        name="Member B Lead",
        email="lead-b@example.com",
        owner_id=second_member_user.id,
    )

    # Login as first member
    login_resp = await login(client, "member@example.com", "Member@123")
    assert login_resp.status_code == 200

    resp = await client.get("/api/leads")
    assert resp.status_code == 200, resp.text

    leads = resp.json()
    lead_ids = [str(l["id"]) for l in leads]

    # Must contain own lead
    assert str(lead_a.id) in lead_ids, "member's own lead is missing"

    # Must NOT contain the other member's lead
    emails = [l["email"] for l in leads]
    assert "lead-b@example.com" not in emails, "member sees another member's lead!"


@pytest.mark.asyncio
async def test_member_cannot_fetch_other_members_lead_by_id(
    client: AsyncClient,
    db_session: AsyncSession,
    member_user,
    second_member_user,
):
    """GET /api/leads/{id} for a lead owned by someone else → 403."""
    other_lead = await _seed_lead(
        db_session,
        name="Other Lead",
        email="other-lead@example.com",
        owner_id=second_member_user.id,
    )

    login_resp = await login(client, "member@example.com", "Member@123")
    assert login_resp.status_code == 200

    resp = await client.get(f"/api/leads/{other_lead.id}")
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_admin_sees_all_leads(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_user,
    member_user,
    second_member_user,
):
    """Admin calling /api/leads must receive leads from all owners."""
    lead_a = await _seed_lead(
        db_session,
        name="Lead for Member",
        email="for-member@example.com",
        owner_id=member_user.id,
    )
    lead_b = await _seed_lead(
        db_session,
        name="Lead for Other",
        email="for-other@example.com",
        owner_id=second_member_user.id,
    )

    login_resp = await login(client, "admin@example.com", "Admin@123")
    assert login_resp.status_code == 200

    resp = await client.get("/api/leads")
    assert resp.status_code == 200, resp.text

    lead_ids = [str(l["id"]) for l in resp.json()]
    assert str(lead_a.id) in lead_ids, "admin cannot see member's lead"
    assert str(lead_b.id) in lead_ids, "admin cannot see other member's lead"
