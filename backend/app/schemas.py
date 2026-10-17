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

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_UPLOAD_TYPES = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm", "audio/flac"}

class TrackIn(BaseModel):
    file_type: str
    file_size: int
    duration_seconds: float | None = None

    @field_validator("file_type")
    @classmethod
    def allowed_type(cls, v: str) -> str:
        if v not in ALLOWED_UPLOAD_TYPES:
            raise ValueError(f"Unsupported file type '{v}'")
        return v

    @field_validator("file_size")
    @classmethod
    def size_limit(cls, v: int) -> int:
        if v <= 0 or v > MAX_UPLOAD_BYTES:
            raise ValueError("File must be between 1 byte and 10 MB")
        return v

class SeparationDetail(BaseModel):
    target: list[str]
    s3_key: str

class TrackCreate(BaseModel):
    title: str
    cloud_key: str

class TrackOut(BaseModel):
    id: int
    title: str | None = None
    local_index: int | None = None
    cloud_key: str
    creator_id: int
    musical_key: str | None = None
    bpm: float | None = None
    size_bytes: int | None = None
    created_at: datetime
 
    model_config = ConfigDict(from_attributes=True)