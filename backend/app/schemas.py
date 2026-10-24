from datetime import datetime, timezone
from typing import Literal, Optional
from decimal import Decimal

from pydantic import (
    BaseModel, EmailStr, ConfigDict, Field, field_validator
)

Category = Literal[
    "Home Repair", "Food & Catering", "Electronics", "Rentals", "Services"
]


# ---------- Users / Auth ----------
class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    role: Literal["requester", "provider", "both"] = "both"
    phone: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    phone: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    rating_avg: Optional[float] = None
    is_admin: bool = False

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


# ---------- Requests ----------
class RequestCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: Optional[str] = None
    category: Category
    location: str = Field(min_length=2, max_length=150)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    expiry_time: datetime

    @field_validator("expiry_time")
    @classmethod
    def expiry_must_be_future(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        if v <= datetime.now(timezone.utc):
            raise ValueError("expiry_time must be in the future")
        return v


class RequestOut(BaseModel):
    id: int
    requester_id: int
    title: str
    description: Optional[str] = None
    category: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    expiry_time: datetime
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ---------- Quotes ----------
class QuoteCreate(BaseModel):
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    message: Optional[str] = Field(default=None, max_length=1000)
    eta: Optional[str] = Field(default=None, max_length=100)


class ProviderPublic(BaseModel):
    id: int
    name: str
    location: Optional[str] = None
    category: Optional[str] = None
    rating_avg: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class QuoteOut(BaseModel):
    id: int
    request_id: int
    provider_id: int
    price: Decimal
    message: Optional[str] = None
    eta: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuoteWithProvider(QuoteOut):
    provider: ProviderPublic

# ---------- Messages ----------
class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class MessageOut(BaseModel):
    id: int
    request_id: int
    sender_id: int
    text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Ratings ----------
class RatingCreate(BaseModel):
    stars: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=1000)


class RatingOut(BaseModel):
    id: int
    request_id: int
    from_user_id: int
    to_user_id: int
    stars: int
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReviewOut(BaseModel):
    id: int
    stars: int
    comment: Optional[str] = None
    reviewer_name: str
    created_at: datetime



# ---------- Complaints ----------
class ComplaintCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=10, max_length=2000)
    request_id: Optional[int] = None

    model_config = ConfigDict(str_strip_whitespace=True)


class ComplaintOut(BaseModel):
    id: int
    user_id: int
    request_id: Optional[int] = None
    subject: str
    message: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminComplaintOut(ComplaintOut):
    user_name: str
    user_email: str