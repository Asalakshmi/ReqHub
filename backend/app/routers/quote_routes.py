from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db
from app.routers.request_routes import expire_old_requests

router = APIRouter(tags=["Quotes"])


@router.post(
    "/requests/{request_id}/quotes",
    response_model=schemas.QuoteOut,
    status_code=201,
)
def submit_quote(
    request_id: int,
    quote_in: schemas.QuoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("provider", "both"):
        raise HTTPException(status_code=403, detail="Only providers can submit quotes")

    expire_old_requests(db)

    req = db.query(models.Request).filter(models.Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.requester_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot quote on your own request")
    if req.status != "open":
        raise HTTPException(status_code=400, detail="This request is no longer open")

    already = (
        db.query(models.Quote)
        .filter(
            models.Quote.request_id == request_id,
            models.Quote.provider_id == current_user.id,
        )
        .first()
    )
    if already:
        raise HTTPException(status_code=400, detail="You already quoted on this request")

    quote = models.Quote(
        request_id=request_id,
        provider_id=current_user.id,
        price=quote_in.price,
        message=quote_in.message,
        eta=quote_in.eta,
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote


@router.get(
    "/requests/{request_id}/quotes",
    response_model=List[schemas.QuoteWithProvider],
)
def list_quotes_for_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    req = db.query(models.Request).filter(models.Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.requester_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Only the requester can view quotes on this request"
        )

    return (
        db.query(models.Quote)
        .filter(models.Quote.request_id == request_id)
        .order_by(models.Quote.price.asc())
        .all()
    )


@router.get("/quotes/mine", response_model=List[schemas.QuoteOut])
def my_quotes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Quote)
        .filter(models.Quote.provider_id == current_user.id)
        .order_by(models.Quote.created_at.desc())
        .all()
    )


@router.patch("/quotes/{quote_id}/accept", response_model=schemas.QuoteOut)
def accept_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    quote = db.query(models.Quote).filter(models.Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    expire_old_requests(db)

    # Lock the request row so two simultaneous accepts can't both succeed
    req = (
        db.query(models.Request)
        .filter(models.Request.id == quote.request_id)
        .with_for_update()
        .first()
    )

    if req.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the requester can accept a quote")
    if req.status != "open":
        raise HTTPException(status_code=400, detail="This request is no longer open")
    if quote.status != "pending":
        raise HTTPException(status_code=400, detail="This quote is not pending")

    # Reject every other pending quote on this request
    db.query(models.Quote).filter(
        models.Quote.request_id == req.id,
        models.Quote.id != quote.id,
        models.Quote.status == "pending",
    ).update({"status": "rejected"}, synchronize_session=False)

    quote.status = "accepted"
    req.status = "accepted"

    db.commit()
    db.refresh(quote)
    return quote