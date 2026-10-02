import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentAdmin, DbSession
from app.models import UserPublic
from app.services.admin import get_all_users, get_user_by_id

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserPublic])
async def list_users(
    db: DbSession,
    current_admin: CurrentAdmin,
) -> list[UserPublic]:
    users = await get_all_users(db)
    return [UserPublic.model_validate(u) for u in users]


@router.get("/users/{user_id}", response_model=UserPublic)
async def get_user(
    user_id: uuid.UUID,
    db: DbSession,
    current_admin: CurrentAdmin,
) -> UserPublic:
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return UserPublic.model_validate(user)
