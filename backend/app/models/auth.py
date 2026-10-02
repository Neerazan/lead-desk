from enum import StrEnum
import uuid
from datetime import UTC, datetime
from typing import Literal
from typing_extensions import Self

from pydantic import (
    BaseModel,
    EmailStr,
    SecretStr,
    field_validator,
    model_validator,
    Field as PydanticField,
)
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel, func


def get_datetime_utc() -> datetime:
    """Return current UTC datetime."""
    return datetime.now(UTC)


class UserRole(StrEnum):
    ADMIN = "admin"
    MEMBER = "member"


class TimestampMixin(SQLModel):
    """Mixin for created_at and updated_at timestamp columns with timezone."""

    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        sa_column_kwargs={"server_default": func.now()},
    )
    updated_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        sa_column_kwargs={
            "server_default": func.now(),
            "onupdate": func.now(),
        },
    )


class UserBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    role: UserRole = Field(default=UserRole.MEMBER)
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


# Database Model: users table
class User(TimestampMixin, UserBase, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str

    # Relationship to refresh tokens (cascade delete)
    refresh_tokens: list["RefreshToken"] = Relationship(
        back_populates="user",
        cascade_delete=True,
    )


class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


class RefreshTokenBase(SQLModel):
    is_revoked: bool = Field(default=False, index=True)


class RefreshTokenCreate(RefreshTokenBase):
    jti: uuid.UUID
    user_id: uuid.UUID
    expires_at: datetime


class RefreshToken(TimestampMixin, RefreshTokenBase, table=True):
    __tablename__ = "refresh_tokens"

    jti: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        foreign_key="users.id",
        nullable=False,
        ondelete="CASCADE",
        index=True,
    )
    expires_at: datetime = Field(
        sa_type=DateTime(timezone=True),  # type: ignore
        index=True,
    )
    revoked_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

    # Relationships
    user: User | None = Relationship(back_populates="refresh_tokens")


class Message(SQLModel):
    message: str


class AuthTokens(SQLModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(SQLModel):
    sub: str  # User ID as string
    role: UserRole
    type: Literal["access", "refresh"]
    exp: datetime
    iat: datetime
    jti: uuid.UUID | None = None  # JTI for refresh token tracking/revocation


class Authenticate(BaseModel):
    email: EmailStr
    password: str


class ChangePassword(BaseModel):
    old_password: SecretStr = PydanticField(description="The user's current password")
    new_password: SecretStr = PydanticField(
        description="Must be 8-64 characters with uppercase, lowercase, number, and special character.",
    )
    confirm_new_password: SecretStr = PydanticField(
        description="Must match new password exactly."
    )

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: SecretStr) -> SecretStr:
        password = value.get_secret_value()
        if not 8 <= len(password) <= 64:
            raise ValueError("Password must be between 8 and 64 characters.")
        if not any(character.islower() for character in password):
            raise ValueError("Password must contain a lowercase letter.")
        if not any(character.isupper() for character in password):
            raise ValueError("Password must contain an uppercase letter.")
        if not any(character.isdigit() for character in password):
            raise ValueError("Password must contain a number.")
        if not any(character in "@$!%*?&" for character in password):
            raise ValueError("Password must contain a special character: @$!%*?&.")
        return value

    @model_validator(mode="after")
    def validate_password_match_and_difference(self) -> Self:
        old_raw = self.old_password.get_secret_value()
        new_raw = self.new_password.get_secret_value()
        confirm_raw = self.confirm_new_password.get_secret_value()

        if new_raw != confirm_raw:
            raise ValueError("confirm_new_password should match new_password exactly.")

        if old_raw == new_raw:
            raise ValueError(
                "New password can not be identical to the current password."
            )
        return self
