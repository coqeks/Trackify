from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, Boolean

from pydantic import EmailStr

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
class PostBase(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    uploader_id = Column(Integer, nullable=False)
    posted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    audio_url = Column(String)

class PostCreate(PostBase):
    pass

class PostPublic(PostBase):
    likes = Column(Integer, default=0)
    