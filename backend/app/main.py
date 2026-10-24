import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (makes sure all tables are known)
from app.database import Base, engine
from app.routers import (
    auth_routes,
    request_routes,
    quote_routes,
    message_routes,
    rating_routes,
    user_routes,
    complaint_routes,
)

load_dotenv()

# Creates any missing tables (for example "complaints") when the server starts
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ReqHub API")

origins = ["http://localhost:5173", "http://localhost:3000"]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(request_routes.router)
app.include_router(quote_routes.router)
app.include_router(message_routes.router)
app.include_router(rating_routes.router)
app.include_router(user_routes.router)
app.include_router(complaint_routes.router)


@app.get("/")
def root():
    return {"message": "ReqHub API is running"}