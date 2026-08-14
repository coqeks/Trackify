from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from passlib.context import CryptContext

import os
from dotenv import load_dotenv

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

load_dotenv()

token_expire = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
key = os.getenv("SECRET_KEY")
algorithm = os.getenv("ALGORITHM")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=token_expire)
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, key, algorithm=algorithm)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, key, algorithms=[algorithm])
        return payload.get("sub")
    except JWTError:
        return None
