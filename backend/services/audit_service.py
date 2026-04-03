import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from models.tables import AuditLog


async def record(
    db: AsyncSession,
    action: str,
    user_id: str,
    resource_type: str,
    resource_id: str,
    meta: dict | None = None,
) -> None:
    log = AuditLog(
        log_id=f"log_{uuid.uuid4().hex[:12]}",
        action=action,
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        meta=meta or {},
        created_at=datetime.now(timezone.utc),
    )
    db.add(log)
