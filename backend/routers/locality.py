from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user, get_current_user_optional, require_roles
from models.tables import Apartment, TrainerApartment, User, UserRoleEnum
from schemas.locality import (
    ApartmentIn,
    ApartmentOut,
    ApartmentPatch,
    InvitationDecisionIn,
    TrainerInvitationIn,
    TrainerInvitationOut,
    UserNotificationOut,
)
from services import trainer_service
from services.locality_service import (
    create_apartment,
    create_invitation,
    decide_invitation,
    get_opted_trainers_for_apartment,
    list_apartments,
    list_invitations_for_trainer,
    list_invitations_for_user,
    set_trainer_apartment_preference,
)
from services.notification_service import hub, list_notifications, mark_notification_read
from services.notification_service import create_notification
from utils.jwt_utils import decode_token

router = APIRouter(prefix="/api/locality", tags=["locality"])
_admin = require_roles("admin")
_trainer = require_roles("trainer")


@router.get("/apartments", response_model=List[ApartmentOut])
async def get_apartments(
    q: Optional[str] = Query(default=None, min_length=1),
    city: Optional[str] = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    rows = await list_apartments(db, q=q, city=city, limit=limit)
    return [ApartmentOut.model_validate(r) for r in rows]


@router.post("/admin/apartments", response_model=ApartmentOut, status_code=201)
async def admin_create_apartment(
    body: ApartmentIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_admin),
):
    row = await create_apartment(
        db,
        city=body.city,
        locality=body.locality,
        name=body.name,
        lat=body.lat,
        lng=body.lng,
        is_active=body.is_active,
    )
    row.created_by_user_id = admin.user_id
    await db.flush()
    users = (
        await db.execute(
            select(User).where(User.role.in_([UserRoleEnum.TRAINER, UserRoleEnum.USER]), User.is_banned == False)
        )
    ).scalars().all()
    for u in users:
        await create_notification(
            db,
            u.user_id,
            kind="apartment_added",
            title="New locality available",
            body=f"{row.name}, {row.locality} ({row.city}) is now available.",
            payload={"apartment_id": row.apartment_id},
        )
    return ApartmentOut.model_validate(row)


@router.patch("/admin/apartments/{apartment_id}", response_model=ApartmentOut)
async def admin_update_apartment(
    apartment_id: str,
    body: ApartmentPatch,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_admin),
):
    row = (
        await db.execute(select(Apartment).where(Apartment.apartment_id == apartment_id))
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Apartment not found")
    for field in ("city", "locality", "name", "lat", "lng", "is_active"):
        val = getattr(body, field)
        if val is not None:
            setattr(row, field, val.strip() if isinstance(val, str) else val)
    await db.flush()
    return ApartmentOut.model_validate(row)


@router.post("/trainer/apartments/{apartment_id}/opt-in")
async def trainer_opt_in_apartment(
    apartment_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_trainer),
):
    profile = await trainer_service.get_trainer_by_user(db, user.user_id)
    row = await set_trainer_apartment_preference(db, profile.trainer_id, apartment_id, active=True)
    return {"trainer_apartment_id": row.trainer_apartment_id, "active": row.active}


@router.post("/trainer/apartments/{apartment_id}/opt-out")
async def trainer_opt_out_apartment(
    apartment_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_trainer),
):
    profile = await trainer_service.get_trainer_by_user(db, user.user_id)
    row = await set_trainer_apartment_preference(db, profile.trainer_id, apartment_id, active=False)
    return {"trainer_apartment_id": row.trainer_apartment_id, "active": row.active}


@router.get("/trainer/my-apartments")
async def trainer_my_apartments(db: AsyncSession = Depends(get_db), user: User = Depends(_trainer)):
    profile = await trainer_service.get_trainer_by_user(db, user.user_id)
    apartments = await list_apartments(db, limit=100)
    enabled = {
        r.apartment_id for r in (
            await db.execute(
                select(TrainerApartment).where(
                    TrainerApartment.trainer_id == profile.trainer_id,
                    TrainerApartment.active == True,
                )
            )
        ).scalars().all()
    }
    return {
        "trainer_id": profile.trainer_id,
        "apartments": [
            {"apartment_id": a.apartment_id, "name": a.name, "city": a.city, "locality": a.locality, "opted": a.apartment_id in enabled}
            for a in apartments
        ],
    }


@router.get("/apartments/{apartment_id}/trainers")
async def trainers_for_apartment(apartment_id: str, db: AsyncSession = Depends(get_db)):
    trainers = await get_opted_trainers_for_apartment(db, apartment_id)
    names = await trainer_service.user_names_by_user_ids(db, [t.user_id for t in trainers])
    return [trainer_service.to_trainer_out(t, names.get(t.user_id)).model_dump() for t in trainers]


@router.post("/invitations", response_model=TrainerInvitationOut, status_code=201)
async def send_invitation(
    body: TrainerInvitationIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles("user")),
):
    row = await create_invitation(
        db,
        user_id=user.user_id,
        trainer_id=body.trainer_id,
        apartment_id=body.apartment_id,
        date=body.date,
        start_time=body.start_time,
        end_time=body.end_time,
        amount=body.amount,
        workout=body.workout,
        note=body.note,
    )
    return TrainerInvitationOut.model_validate(row)


@router.get("/invitations/mine", response_model=List[TrainerInvitationOut])
async def my_invitations(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role.value == "trainer":
        t = await trainer_service.get_trainer_by_user(db, user.user_id)
        rows = await list_invitations_for_trainer(db, t.trainer_id)
    else:
        rows = await list_invitations_for_user(db, user.user_id)
    return [TrainerInvitationOut.model_validate(r) for r in rows]


@router.post("/invitations/{invitation_id}/decision", response_model=TrainerInvitationOut)
async def trainer_invitation_decision(
    invitation_id: str,
    body: InvitationDecisionIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_trainer),
):
    row = await decide_invitation(db, invitation_id, user.user_id, accept=body.accept)
    return TrainerInvitationOut.model_validate(row)


@router.get("/notifications/mine", response_model=List[UserNotificationOut])
async def my_notifications(
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = await list_notifications(db, user.user_id, limit=limit)
    return [UserNotificationOut.model_validate(r) for r in rows]


@router.post("/notifications/{notification_id}/read", response_model=UserNotificationOut)
async def mark_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        row = await mark_notification_read(db, user.user_id, notification_id)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return UserNotificationOut.model_validate(row)


@router.get("/notifications/stream")
async def notifications_stream(
    token: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    actor = user
    if token:
        payload = decode_token(token)
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(401, "Invalid token")
        actor_row = (await db.execute(select(User).where(User.user_id == uid))).scalar_one_or_none()
        if not actor_row:
            raise HTTPException(401, "User not found")
        actor = actor_row

    if not actor:
        raise HTTPException(401, "Not authenticated")

    async def event_generator():
        async for event in hub.subscribe(actor.user_id):
            yield event

    return StreamingResponse(event_generator(), media_type="text/event-stream")
