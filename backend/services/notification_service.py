import asyncio
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.tables import UserNotification


def _now() -> datetime:
    return datetime.now(timezone.utc)


class NotificationHub:
    def __init__(self) -> None:
        self._queues: dict[str, set[asyncio.Queue[str]]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, user_id: str) -> AsyncGenerator[str, None]:
        queue: asyncio.Queue[str] = asyncio.Queue()
        async with self._lock:
            self._queues[user_id].add(queue)
        try:
            yield "event: ready\ndata: {}\n\n"
            while True:
                item = await queue.get()
                yield item
        finally:
            async with self._lock:
                bucket = self._queues.get(user_id)
                if bucket and queue in bucket:
                    bucket.remove(queue)
                if bucket is not None and len(bucket) == 0:
                    self._queues.pop(user_id, None)

    async def publish(self, user_id: str, event: str, payload: dict) -> None:
        msg = f"event: {event}\ndata: {json.dumps(payload)}\n\n"
        async with self._lock:
            queues = list(self._queues.get(user_id, set()))
        for q in queues:
            await q.put(msg)


hub = NotificationHub()


async def create_notification(
    db: AsyncSession,
    user_id: str,
    kind: str,
    title: str,
    body: str,
    payload: dict | None = None,
) -> UserNotification:
    row = UserNotification(
        user_id=user_id,
        kind=kind,
        title=title,
        body=body,
        payload=payload or {},
    )
    db.add(row)
    await db.flush()
    await hub.publish(
        user_id,
        "notification",
        {
            "notification_id": row.notification_id,
            "kind": row.kind,
            "title": row.title,
            "body": row.body,
            "payload": row.payload or {},
            "created_at": row.created_at.isoformat(),
        },
    )
    return row


async def list_notifications(db: AsyncSession, user_id: str, limit: int = 50) -> list[UserNotification]:
    result = await db.execute(
        select(UserNotification)
        .where(UserNotification.user_id == user_id)
        .order_by(UserNotification.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def mark_notification_read(db: AsyncSession, user_id: str, notification_id: str) -> UserNotification:
    result = await db.execute(
        select(UserNotification).where(
            UserNotification.notification_id == notification_id,
            UserNotification.user_id == user_id,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise ValueError("Notification not found")
    if not row.is_read:
        row.is_read = True
        row.read_at = _now()
        await db.flush()
    return row
