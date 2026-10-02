import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DbSession
from app.models import LeadCreate, LeadPublic, LeadStatus, LeadUpdate, Message, UserRole
from app.services.lead import (
    create_lead,
    delete_lead,
    get_lead_by_id,
    get_leads,
    to_lead_public,
    update_lead,
)

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("", response_model=list[LeadPublic])
async def list_leads(
    db: DbSession,
    current_user: CurrentUser,
    status: Annotated[LeadStatus | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
) -> list[LeadPublic]:
    leads = await get_leads(db, current_user, status=status, search=search)
    return [to_lead_public(lead) for lead in leads]


@router.post("", response_model=LeadPublic, status_code=status.HTTP_201_CREATED)
async def create_new_lead(
    lead_in: LeadCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> LeadPublic:
    lead = await create_lead(db, lead_in, owner=current_user)
    return to_lead_public(lead)


@router.get("/{lead_id}", response_model=LeadPublic)
async def get_single_lead(
    lead_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> LeadPublic:
    lead = await get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found",
        )

    if current_user.role != UserRole.ADMIN and lead.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden",
        )

    return to_lead_public(lead)


@router.patch("/{lead_id}", response_model=LeadPublic)
async def patch_lead(
    lead_id: uuid.UUID,
    lead_in: LeadUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> LeadPublic:
    lead = await get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found",
        )

    if lead_in.status is not None and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can change lead status",
        )

    if current_user.role != UserRole.ADMIN and lead.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden",
        )

    updated_lead = await update_lead(db, lead, lead_in)
    return to_lead_public(updated_lead)


@router.delete("/{lead_id}", response_model=Message)
async def remove_lead(
    lead_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> Message:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    lead = await get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found",
        )

    await delete_lead(db, lead)
    return Message(message="Lead deleted successfully")
