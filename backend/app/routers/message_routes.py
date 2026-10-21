from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(tags=["Messages"])


def check_chat_access(
    request_id: int, db: Session, current_user: models.User
) -> models.Request:
    """Only the requester and the accepted provider may use this chat."""
    req = db.query(models.Request).filter(models.Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status not in ("accepted", "completed"):
        raise HTTPException(
            status_code=400, detail="Chat opens after a quote has been accepted"
        )

    accepted_quote = (
        db.query(models.Quote)
        .filter(
            models.Quote.request_id == request_id,
            models.Quote.status == "accepted",
        )
        .first()
    )
    if not accepted_quote:
        raise HTTPException(status_code=400, detail="No accepted quote found")

    if current_user.id not in (req.requester_id, accepted_quote.provider_id):
        raise HTTPException(status_code=403, detail="You are not part of this conversation")
    return req


@router.post(
    "/requests/{request_id}/messages",
    response_model=schemas.MessageOut,
    status_code=201,
)
def send_message(
    request_id: int,
    message_in: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_chat_access(request_id, db, current_user)

    message = models.Message(
        request_id=request_id,
        sender_id=current_user.id,
        text=message_in.text,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get(
    "/requests/{request_id}/messages",
    response_model=List[schemas.MessageOut],
)
def get_messages(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_chat_access(request_id, db, current_user)

    return (
        db.query(models.Message)
        .filter(models.Message.request_id == request_id)
        .order_by(models.Message.created_at.asc())
        .all()
    )