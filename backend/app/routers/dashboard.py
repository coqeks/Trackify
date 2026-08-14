from fastapi import APIRouter, Depends

from app import models
from app.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/")
def read_dashboard(current_user: models.User = Depends(get_current_user)):
    """
    Placeholder protected dashboard endpoint.
    Add real dashboard data/widgets here later.
    """
    return {"message": f"Welcome, {current_user.email}!"}
