from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DbSession

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("")
async def list_leads(db: DbSession):
    # Placeholder: proves the async session is wired correctly
    await db.execute(text("SELECT 1"))
    return {"leads": []}


@router.post("")
async def create_lead(db: DbSession):
    return {"message": "Create lead endpoint placeholder"}
