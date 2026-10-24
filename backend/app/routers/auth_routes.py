from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    is_admin,
    verify_password,
)
from app.database import get_db
from app.email_service import send_verification_code
from app.otp import (
    CODE_LIFETIME_MINUTES,
    MAX_ATTEMPTS,
    RESEND_SECONDS,
    code_matches,
    hash_code,
    new_code,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/send-code")
def send_code(body: schemas.SendCodeRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    now = datetime.now(timezone.utc)

    # Housekeeping: remove codes that expired more than a day ago
    db.query(models.EmailCode).filter(
        models.EmailCode.expires_at < now - timedelta(days=1)
    ).delete(synchronize_session=False)

    row = db.query(models.EmailCode).filter(models.EmailCode.email == body.email).first()

    if row:
        wait = RESEND_SECONDS - int((now - row.sent_at).total_seconds())
        if wait > 0:
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {wait} seconds before asking for a new code",
            )

    code = new_code()
    if row is None:
        row = models.EmailCode(
            email=body.email,
            code_hash=hash_code(body.email, code),
            expires_at=now + timedelta(minutes=CODE_LIFETIME_MINUTES),
            attempts=0,
            sent_at=now,
        )
        db.add(row)
    else:
        row.code_hash = hash_code(body.email, code)
        row.expires_at = now + timedelta(minutes=CODE_LIFETIME_MINUTES)
        row.attempts = 0
        row.sent_at = now
    db.commit()

    if not send_verification_code(body.email, code):
        db.delete(row)
        db.commit()
        raise HTTPException(
            status_code=502, detail="Could not send the email. Please try again later."
        )

    return {"message": "Verification code sent"}


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    row = (
        db.query(models.EmailCode)
        .filter(models.EmailCode.email == user_in.email)
        .first()
    )
    if row is None:
        raise HTTPException(
            status_code=400, detail="Please request a verification code first"
        )

    now = datetime.now(timezone.utc)
    if row.expires_at < now:
        raise HTTPException(
            status_code=400, detail="That code has expired. Please request a new one"
        )
    if row.attempts >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many wrong attempts. Please request a new code",
        )

    if not code_matches(user_in.email, user_in.code, row.code_hash):
        row.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect code")

    user = models.User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        role=user_in.role,
        phone=user_in.phone,
        location=user_in.location,
        category=user_in.category,
    )
    db.add(user)
    db.delete(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")

    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"access_token": create_access_token(user.id), "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def read_me(current_user: models.User = Depends(get_current_user)):
    user_out = schemas.UserOut.model_validate(current_user)
    user_out.is_admin = is_admin(current_user)
    return user_out