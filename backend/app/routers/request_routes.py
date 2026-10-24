from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/requests", tags=["Requests"])


def expire_old_requests(db: Session) -> None:
    """Mark open requests whose expiry time has passed as expired."""
    now = datetime.now(timezone.utc)
    db.query(models.Request).filter(
        models.Request.status == "open",
        models.Request.expiry_time <= now,
    ).update({"status": "expired"}, synchronize_session=False)
    db.commit()


@router.post("/", response_model=schemas.RequestOut, status_code=201)
def create_request(
    request_in: schemas.RequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("requester", "both"):
        raise HTTPException(status_code=403, detail="Only requesters can post requests")

    new_request = models.Request(
        requester_id=current_user.id,
        title=request_in.title,
        description=request_in.description,
        category=request_in.category,
        location=request_in.location,
        latitude=request_in.latitude,
        longitude=request_in.longitude,
        expiry_time=request_in.expiry_time,
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request


@router.get("/", response_model=List[schemas.RequestOut])
def list_open_requests(
    category: Optional[schemas.Category] = None,
    location: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    expire_old_requests(db)

    query = db.query(models.Request).filter(models.Request.status == "open")
    if category:
        query = query.filter(models.Request.category == category)
    if location:
        query = query.filter(models.Request.location.ilike(f"%{location}%"))

    return (
        query.order_by(models.Request.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# NOTE: "/mine" must come BEFORE "/{request_id}", otherwise FastAPI
# would try to read the word "mine" as an ID number.
@router.get("/mine", response_model=List[schemas.RequestOut])
def my_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    expire_old_requests(db)
    return (
        db.query(models.Request)
        .filter(models.Request.requester_id == current_user.id)
        .order_by(models.Request.created_at.desc())
        .all()
    )


@router.get("/{request_id}", response_model=schemas.RequestOut)
def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    expire_old_requests(db)
    req = db.query(models.Request).filter(models.Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return req


@router.patch("/{request_id}/cancel", response_model=schemas.RequestOut)
def cancel_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    req = db.query(models.Request).filter(models.Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only cancel your own requests")
    if req.status != "open":
        raise HTTPException(status_code=400, detail="Only open requests can be cancelled")

    req.status = "cancelled"
    db.commit()
    db.refresh(req)
    return req