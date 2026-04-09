import asyncio

from schemas.locality import TrainerInvitationIn
from services.notification_service import NotificationHub


def test_trainer_invitation_schema_parses_valid_payload():
    payload = TrainerInvitationIn(
        trainer_id="trainer_123",
        apartment_id="apt_123",
        date="2026-04-09",
        start_time="06:00",
        end_time="07:00",
        amount=799,
        workout="Strength",
        note="Bring mat",
    )
    assert payload.trainer_id == "trainer_123"
    assert payload.amount == 799


def test_notification_hub_publish_delivers_message():
    hub = NotificationHub()

    async def _run():
        gen = hub.subscribe("user_1")
        stream = gen.__aiter__()
        await stream.__anext__()  # ready event
        await hub.publish("user_1", "notification", {"ok": True})
        msg = await asyncio.wait_for(stream.__anext__(), timeout=1.0)
        return msg

    message = asyncio.run(_run())
    assert "event: notification" in message
    assert '"ok": true' in message.lower()
