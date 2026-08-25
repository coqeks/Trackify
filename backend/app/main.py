from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv
import os
load_dotenv()

from app.database import Base, engine
from app.routers import auth, dashboard
from app.routers import audio

# Create tables on startup (fine for dev; use Alembic migrations for production)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Trackify", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(audio.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
