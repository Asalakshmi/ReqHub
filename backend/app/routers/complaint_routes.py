from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user, require_admin
from app.database import get_db

router = APIRouter(tags=["Complaints"])

DAILY_LIMIT = 5


@router.post("/complaints", response_model=schemas.ComplaintOut, status_code=201)
def submit_complaint(
    complaint_in: schemas.ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("requester", "both"):
        raise HTTPException(status_code=403, detail="Only requesters can file complaints")

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    recent = (
        db.query(models.Complaint)
        .filter(
            models.Complaint.user_id == current_user.id,
            models.Complaint.created_at >= since,
        )
        .count()
    )
    if recent >= DAILY_LIMIT:
        raise HTTPException(
            status_code=429, detail="You have reached today's complaint limit"
        )

    if complaint_in.request_id is not None:
        own_request = (
            db.query(models.Request)
            .filter(
                models.Request.id == complaint_in.request_id,
                models.Request.requester_id == current_user.id,
            )
            .first()
        )
        if not own_request:
            raise HTTPException(
                status_code=400, detail="You can only link your own requests"
            )

    complaint = models.Complaint(
        user_id=current_user.id,
        request_id=complaint_in.request_id,
        subject=complaint_in.subject,
        message=complaint_in.message,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.get("/admin/complaints", response_model=List[schemas.AdminComplaintOut])
def list_complaints(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    query = db.query(models.Complaint, models.User.name, models.User.email).join(
        models.User, models.User.id == models.Complaint.user_id
    )
    if status in ("open", "resolved"):
        query = query.filter(models.Complaint.status == status)

    rows = query.order_by(models.Complaint.created_at.desc()).limit(200).all()

    return [
        schemas.AdminComplaintOut(
            id=c.id,
            user_id=c.user_id,
            request_id=c.request_id,
            subject=c.subject,
            message=c.message,
            status=c.status,
            created_at=c.created_at,
            user_name=name,
            user_email=email,
        )
        for c, name, email in rows
    ]


@router.patch(
    "/admin/complaints/{complaint_id}/resolve",
    response_model=schemas.ComplaintOut,
)
def resolve_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    complaint = (
        db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.status = "resolved"
    db.commit()
    db.refresh(complaint)
    return complaint