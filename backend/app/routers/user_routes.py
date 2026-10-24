from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/{user_id}/reviews", response_model=List[schemas.ReviewOut])
def get_reviews(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rows = (
        db.query(models.Rating, models.User.name)
        .join(models.User, models.User.id == models.Rating.from_user_id)
        .filter(models.Rating.to_user_id == user_id)
        .order_by(models.Rating.created_at.desc())
        .limit(50)
        .all()
    )

    return [
        schemas.ReviewOut(
            id=rating.id,
            stars=rating.stars,
            comment=rating.comment,
            reviewer_name=name,
            created_at=rating.created_at,
        )
        for rating, name in rows
    ]