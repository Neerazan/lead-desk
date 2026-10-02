import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import func, select

from app.models import User


async def get_all_users(db: AsyncSession) -> list[User]:
    """Retrieve all users ordered by creation date descending."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    """Retrieve a single user by their UUID."""
    return await db.get(User, user_id)


async def get_users_count(db: AsyncSession) -> int:
    """Return total count of registered users."""
    result = await db.execute(select(func.count()).select_from(User))
    return result.scalar_one() or 0


async def delete_user(db: AsyncSession, user: User) -> None:
    """Delete a user from the database."""
    await db.delete(user)
