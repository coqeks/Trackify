from fastapi import APIRouter, Depends, status
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
    return {"Tracks": [schemas.TrackOut.model_validate(t) for t in tracks]}


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


@router.delete("/tracks/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_track(
    track_id: int,
    session=Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Delete a saved track: its audio in cloud storage, then its database row
    """
    track = crud.get_track_by_id(session, track_id, current_user.id)
    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")
    cloud.remove_object(track.cloud_key)
    crud.delete_track(session, track)
