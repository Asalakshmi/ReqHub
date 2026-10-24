from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(tags=["Ratings"])


@router.patch("/requests/{request_id}/complete", response_model=schemas.RequestOut)
def complete_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    req = db.query(models.Request).filter(models.Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the requester can mark it complete")
    if req.status != "accepted":
        raise HTTPException(
            status_code=400, detail="Only accepted requests can be marked complete"
        )

    req.status = "completed"
    db.commit()
    db.refresh(req)
    return req


@router.post(
    "/requests/{request_id}/rate",
    response_model=schemas.RatingOut,
    status_code=201,
)
def rate_provider(
    request_id: int,
    rating_in: schemas.RatingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    req = db.query(models.Request).filter(models.Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the requester can rate the provider")
    if req.status != "completed":
        raise HTTPException(status_code=400, detail="You can rate only after completion")

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

    already = (
        db.query(models.Rating)
        .filter(
            models.Rating.request_id == request_id,
            models.Rating.from_user_id == current_user.id,
        )
        .first()
    )
    if already:
        raise HTTPException(status_code=400, detail="You already rated this job")

    provider_id = accepted_quote.provider_id

    rating = models.Rating(
        request_id=request_id,
        from_user_id=current_user.id,
        to_user_id=provider_id,
        stars=rating_in.stars,
        comment=rating_in.comment,
    )
    db.add(rating)
    db.flush()

    average = (
        db.query(func.avg(models.Rating.stars))
        .filter(models.Rating.to_user_id == provider_id)
        .scalar()
    )
    provider = db.query(models.User).filter(models.User.id == provider_id).first()
    provider.rating_avg = round(float(average), 2)

    db.commit()
    db.refresh(rating)
    return rating