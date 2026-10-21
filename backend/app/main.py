from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth_routes,
    request_routes,
    quote_routes,
    message_routes,
    rating_routes,
)

app = FastAPI(title="ReqHub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(request_routes.router)
app.include_router(quote_routes.router)
app.include_router(message_routes.router)
app.include_router(rating_routes.router)


@app.get("/")
def root():
    return {"message": "ReqHub API is running"}