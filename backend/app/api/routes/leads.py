from fastapi import APIRouter

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("")
def list_leads():
    return {"leads": []}


@router.post("")
def create_lead():
    return {"message": "Create lead endpoint placeholder"}
