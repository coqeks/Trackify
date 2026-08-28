from sqlalchemy import update
from sqlalchemy.orm import Session

from app import models, schemas, cloud
from app.security import hash_password


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> models.User | None:
    return db.query(models.User).filter(models.User.id == user_id).first()


def create_user(db: Session, user_in: schemas.UserCreate) -> models.User:
    db_user = models.User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def save_track(db: Session, track_in: schemas.TrackCreate, user: models.User):

    if (db.query(models.TrackBase).filter(models.TrackBase.cloud_key == track_in.cloud_key).first() != None):
        return False

    db_track = models.TrackBase(
        title=track_in.title,
        local_index = user.tracks_saved,
        cloud_key=track_in.cloud_key,
        creator_id=user.id
    )
    db.add(db_track)

    stmt = (
        update(models.User)
        .where(models.User.id == user.id)
        .values(tracks_saved=models.User.tracks_saved + 1)
    )

    db.execute(stmt)

    db.commit()
    db.refresh(db_track)
    return db_track