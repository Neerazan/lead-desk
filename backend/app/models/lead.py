import uuid
from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

import sqlalchemy as sa
from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel

from app.models.auth import TimestampMixin

if TYPE_CHECKING:
    from app.models.auth import User


class LeadStatus(StrEnum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    LOST = "lost"


_lead_status_sa = sa.Enum(
    LeadStatus,
    name="leadstatus",
    create_type=False,
    values_callable=lambda enum_class: [e.value for e in enum_class],
)


class LeadBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr = Field(max_length=255)
    company: str = Field(min_length=1, max_length=255)
    website: str | None = Field(default=None, max_length=255)
    status: LeadStatus = Field(
        default=LeadStatus.NEW,
        sa_column=sa.Column(_lead_status_sa, nullable=False),
    )


class LeadCreate(LeadBase):
    pass


class LeadUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    company: str | None = Field(default=None, min_length=1, max_length=255)
    website: str | None = Field(default=None, max_length=255)
    status: LeadStatus | None = None


class Lead(TimestampMixin, LeadBase, table=True):
    __tablename__ = "leads"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="users.id",
        nullable=False,
        ondelete="CASCADE",
        index=True,
    )

    owner: "User" = Relationship(back_populates="leads")


class LeadPublic(LeadBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    owner_name: str | None = None
    created_at: datetime
