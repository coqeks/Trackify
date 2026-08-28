"""
@file:       schemas.py
@summary:    Defines schemas for API request and response payloads
"""


from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None = None
    is_active: bool
    created_at: datetime
    tracks_saved: int | None = None

    model_config = ConfigDict(from_attributes=True)

class UserTrack(BaseModel):
    id: int
    tracks_saved: int


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenPayload(BaseModel):
    sub: str | None = None

class TrackIn(BaseModel):
    file_type: str
    file_size: int

class SeparationDetail(BaseModel):
    target: list[str]
    s3_key: str

class TrackCreate(BaseModel):
    title: str
    cloud_key: str
