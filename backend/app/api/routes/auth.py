from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login():
    return {"message": "Login endpoint placeholder"}


@router.post("/refresh")
def refresh():
    return {"message": "Refresh endpoint placeholder"}


@router.post("/logout")
def logout():
    return {"message": "Logout endpoint placeholder"}


@router.get("/me")
def get_me():
    return {"message": "Current user endpoint placeholder"}
