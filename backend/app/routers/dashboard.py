from fastapi import APIRouter, Depends
from fastapi.exceptions import HTTPException

from app import models, crud, cloud
from app.deps import get_current_user, get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/")
def read_dashboard(current_user: models.User = Depends(get_current_user), session = Depends(get_db)):
    """
    Read saved tracks under user's id and return them
    """
    tracks = crud.get_tracks(session, current_user.id)
    return {"Tracks": tracks}


@router.get("/saved/{target_key}")
def get_saved_purl(target_key, current_user: models.User = Depends(get_current_user), session = Depends(get_db)):

    if not crud.verify_track(session, current_user.id, target_key):
        return HTTPException(500, "Saved track is not under user's ownership.")
    return cloud.generate_signed_url(target_key, "GET")