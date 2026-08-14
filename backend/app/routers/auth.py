from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.deps import get_current_user
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"]) 


@router.post("/signup", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def signup(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = crud.get_user_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    user = crud.create_user(db, user_in)
    access_token = create_access_token(subject=user.email)
    return schemas.Token(access_token=access_token, user=user)


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=credentials.email)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token = create_access_token(subject=user.email)
    return schemas.Token(access_token=access_token, user=user)


@router.get("/me", response_model=schemas.UserOut)
def read_current_user(current_user=Depends(get_current_user)):
    return current_user
