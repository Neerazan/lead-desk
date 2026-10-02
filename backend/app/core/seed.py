"""
Seed script: creates the two required users and sample leads.

Run automatically by start.sh after `alembic upgrade head`.
Safe to run multiple times — records are only inserted if they don't exist yet.
"""
import asyncio
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from sqlmodel import select

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import User, UserRole
from app.models.lead import Lead, LeadStatus

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

SEED_USERS = [
    {
        "name": "Alice Admin",
        "email": "admin@leaddesk.test",
        "password": "Admin@123",
        "role": UserRole.ADMIN,
    },
    {
        "name": "Marcus Member",
        "email": "member@leaddesk.test",
        "password": "Member@123",
        "role": UserRole.MEMBER,
    },
]

# Leads are seeded only for member accounts.
# Admins see all leads globally and do not need pre-seeded leads.
SEED_LEADS: list[dict] = [
    {
        "name": "Priya Sharma",
        "email": "priya.sharma@brightpath.io",
        "company": "BrightPath Solutions",
        "website": "https://brightpath.io",
        "status": LeadStatus.NEW,
    },
    {
        "name": "Daniel Wu",
        "email": "daniel.wu@peakanalytics.com",
        "company": "Peak Analytics",
        "website": "https://peakanalytics.com",
        "status": LeadStatus.CONTACTED,
    },
    {
        "name": "Amara Osei",
        "email": "amara.osei@greenleaf.org",
        "company": "GreenLeaf Ventures",
        "website": None,
        "status": LeadStatus.QUALIFIED,
    },
    {
        "name": "Carlos Rivera",
        "email": "carlos.rivera@fastlaunch.co",
        "company": "FastLaunch Labs",
        "website": "https://fastlaunch.co",
        "status": LeadStatus.NEW,
    },
    {
        "name": "Nina Kowalski",
        "email": "nina.kowalski@urbanstride.eu",
        "company": "UrbanStride",
        "website": "https://urbanstride.eu",
        "status": LeadStatus.LOST,
    },
]


# ---------------------------------------------------------------------------
# Core seeding logic
# ---------------------------------------------------------------------------

async def _seed(session: AsyncSession) -> None:
    seeded_users: list[User] = []

    for idx, user_data in enumerate(SEED_USERS):
        # Check if user already exists
        result = await session.execute(
            select(User).where(User.email == user_data["email"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            logger.info("User already exists, skipping: %s", user_data["email"])
            seeded_users.append(existing)
            continue

        user = User(
            name=user_data["name"],
            email=user_data["email"],
            hashed_password=get_password_hash(user_data["password"]),
            role=user_data["role"],
            is_active=True,
        )
        session.add(user)
        await session.flush()   # populate user.id before using it in leads
        await session.refresh(user)
        logger.info("Created user: %s (%s)", user.email, user.role)
        seeded_users.append(user)

    # Seed leads only for member accounts — admins see all leads globally.
    member_users = [u for u in seeded_users if u.role == UserRole.MEMBER]
    for user in member_users:
        for lead_data in SEED_LEADS:
            # Check by email + owner_id to avoid duplicate leads on re-run
            result = await session.execute(
                select(Lead).where(
                    Lead.email == lead_data["email"],
                    Lead.owner_id == user.id,
                )
            )
            if result.scalar_one_or_none():
                logger.info(
                    "Lead already exists for %s: %s", user.email, lead_data["email"]
                )
                continue

            lead = Lead(
                name=lead_data["name"],
                email=lead_data["email"],
                company=lead_data["company"],
                website=lead_data.get("website"),
                status=lead_data["status"],
                owner_id=user.id,
            )
            session.add(lead)
            logger.info(
                "Created lead '%s' for user %s", lead_data["name"], user.email
            )

    await session.commit()
    logger.info("Seeding complete.")


async def run_seed() -> None:
    """Entry-point: create an async engine + session and run the seed."""
    engine = create_async_engine(
        settings.ASYNC_DATABASE_URL,
        poolclass=NullPool,
        echo=False,
    )
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    async with session_factory() as session:
        await _seed(session)

    await engine.dispose()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_seed())
