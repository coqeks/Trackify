from fastapi import APIRouter, Depends
from fastapi.exceptions import HTTPException

from app import models, crud, cloud, schemas
from app.deps import get_current_user, get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/")
def read_dashboard(current_user: models.User = Depends(get_current_user), session = Depends(get_db)):
    """
    Read saved tracks under user's id and return them
    """
    tracks = crud.get_tracks(session, current_user.id)
    return {"Tracks": [t for t in tracks]}


@router.get("/saved/purl")
def get_saved_track_purl(
    cloud_key: str,
    session=Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    track = crud.get_track_by_cloud_key(session, cloud_key, current_user.id)
    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")
    return cloud.generate_signed_url(track.cloud_key, "get")