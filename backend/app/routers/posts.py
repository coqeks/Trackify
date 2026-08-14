from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, schemas, models
from app.database import get_db
from app.deps import get_current_user

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("/")
def read_posts(session: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Reads existing posts from database
    """
    

    return {"message": f"Welcome, {current_user.email}!"}

@router.post("/")
def create_post(post_in: models.PostCreate, session: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Creates a post
    """
    crud.create_post(session, post_in, current_user)