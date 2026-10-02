import uuid

from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.models import (
    Lead,
    LeadCreate,
    LeadPublic,
    LeadStatus,
    LeadUpdate,
    User,
    UserRole,
)


def to_lead_public(lead: Lead) -> LeadPublic:
    return LeadPublic(
        id=lead.id,
        name=lead.name,
        email=lead.email,
        company=lead.company,
        website=lead.website,
        status=lead.status,
        owner_id=lead.owner_id,
        owner_name=lead.owner.name if lead.owner else None,
        created_at=lead.created_at,
    )


async def get_leads(
    db: AsyncSession,
    user: User,
    status: LeadStatus | None = None,
    search: str | None = None,
) -> list[Lead]:
    query = select(Lead).options(selectinload(Lead.owner))

    if user.role != UserRole.ADMIN:
        query = query.where(Lead.owner_id == user.id)

    if status:
        query = query.where(Lead.status == status)

    if search:
        search_filter = f"%{search}%"
        query = query.where(
            or_(
                Lead.name.ilike(search_filter),
                Lead.email.ilike(search_filter),
                Lead.company.ilike(search_filter),
            )
        )

    query = query.order_by(Lead.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_lead_by_id(db: AsyncSession, lead_id: uuid.UUID) -> Lead | None:
    query = select(Lead).options(selectinload(Lead.owner)).where(Lead.id == lead_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_lead(
    db: AsyncSession,
    lead_in: LeadCreate,
    owner: User,
) -> Lead:
    lead = Lead(
        name=lead_in.name,
        email=lead_in.email,
        company=lead_in.company,
        website=str(lead_in.website) if lead_in.website else None,
        status=lead_in.status or LeadStatus.NEW,
        owner_id=owner.id,
    )
    db.add(lead)
    await db.flush()
    await db.refresh(lead)
    lead.owner = owner
    return lead


async def update_lead(
    db: AsyncSession,
    lead: Lead,
    lead_in: LeadUpdate,
) -> Lead:
    update_data = lead_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)
    db.add(lead)
    await db.flush()
    await db.refresh(lead)
    return lead


async def delete_lead(db: AsyncSession, lead: Lead) -> None:
    await db.delete(lead)
