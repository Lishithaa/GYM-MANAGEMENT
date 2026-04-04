from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user
from models.tables import Complaint, PartnerRequest, Trainer, User
from schemas.platform import ComplaintCreateIn, ComplaintOut, PartnerRequestIn

router = APIRouter(prefix="/api", tags=["platform"])


@router.post("/partner-requests", status_code=201)
async def create_partner_request(body: PartnerRequestIn, db: AsyncSession = Depends(get_db)):
    row = PartnerRequest(
        organization_name=body.organization_name.strip(),
        contact_name=body.contact_name.strip(),
        email=body.email.strip().lower(),
        phone=(body.phone or "").strip() or None,
        message=body.message.strip(),
    )
    db.add(row)
    await db.flush()
    return {"request_id": row.request_id, "message": "Thanks — our partnerships team will reach out."}


@router.post("/complaints", status_code=201, response_model=ComplaintOut)
async def create_complaint(
    body: ComplaintCreateIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    about_uid = body.about_user_id
    if body.about_trainer_id:
        tres = await db.execute(select(Trainer).where(Trainer.trainer_id == body.about_trainer_id.strip()))
        tr = tres.scalar_one_or_none()
        if not tr:
            raise HTTPException(404, "Trainer not found")
        about_uid = tr.user_id
    if not about_uid:
        raise HTTPException(422, "Provide about_user_id or about_trainer_id")
    if about_uid == user.user_id:
        raise HTTPException(422, "You cannot complain about yourself")
    other = await db.execute(select(User).where(User.user_id == about_uid))
    if not other.scalar_one_or_none():
        raise HTTPException(404, "User not found")
    row = Complaint(
        from_user_id=user.user_id,
        about_user_id=about_uid,
        subject=body.subject.strip(),
        body=body.body.strip(),
    )
    db.add(row)
    await db.flush()
    return ComplaintOut.model_validate(row)


@router.get("/complaints/mine")
async def my_complaints(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sent_res = await db.execute(
        select(Complaint).where(Complaint.from_user_id == user.user_id).order_by(Complaint.created_at.desc())
    )
    recv_res = await db.execute(
        select(Complaint).where(Complaint.about_user_id == user.user_id).order_by(Complaint.created_at.desc())
    )
    return {
        "filed_by_me": [ComplaintOut.model_validate(c) for c in sent_res.scalars().all()],
        "about_me": [ComplaintOut.model_validate(c) for c in recv_res.scalars().all()],
    }
