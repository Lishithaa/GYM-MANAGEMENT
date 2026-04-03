from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from dependencies import get_current_user
from models.tables import User
from schemas.auth import LoginOut, TokenRefreshIn, UserOut, UserRegisterIn, UserLoginIn
from services import auth_service
from services.email_service import send_verification_email
from utils.jwt_utils import decode_token, create_verify_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class ResendIn(BaseModel):
    email: str


@router.post("/register", status_code=201)
async def register(
    body: UserRegisterIn,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    user, token = await auth_service.register_user(
        db, body.email, body.password, body.name, body.role, body.phone
    )
    bg.add_task(send_verification_email, user.email, user.name, token)
    return {
        "message": "Registration successful. Please check your email to verify your account.",
        "user_id": user.user_id,
    }


@router.get("/verify-email")
async def verify_email(
    token: str,
    format: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    fe = settings.FRONTEND_URL.rstrip("/")

    def _finish_ok():
        if format == "json":
            return {"message": "Email verified successfully. You can now log in."}
        return RedirectResponse(url=f"{fe}/login?verified=1", status_code=302)

    def _finish_err():
        if format == "json":
            raise HTTPException(400, "Invalid or expired verification link")
        return RedirectResponse(url=f"{fe}/login?verify_error=1", status_code=302)

    try:
        payload = decode_token(token)
        if payload.get("type") != "email_verify":
            return _finish_err()
        await auth_service.verify_email(db, payload["sub"])
        return _finish_ok()
    except HTTPException:
        return _finish_err()


@router.post("/login", response_model=LoginOut)
async def login(body: UserLoginIn, db: AsyncSession = Depends(get_db)):
    user, access, refresh = await auth_service.login_user(db, body.email, body.password)
    return LoginOut(
        access_token=access,
        refresh_token=refresh,
        user=UserOut.model_validate(user),
    )


@router.post("/refresh")
async def refresh_token(body: TokenRefreshIn, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid token type")
    new_access = await auth_service.rotate_access_token(db, body.refresh_token, payload["sub"])
    return {"access_token": new_access, "token_type": "Bearer"}


@router.post("/logout")
async def logout(body: TokenRefreshIn, db: AsyncSession = Depends(get_db)):
    await auth_service.revoke_refresh_token(db, body.refresh_token)
    return {"message": "Logged out"}


@router.post("/resend-verification")
async def resend_verification(
    body: ResendIn,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(404, "No account found with that email")
    if user.is_verified:
        return {"message": "This account is already verified. Please log in."}

    token = create_verify_token(user.user_id, user.email)
    bg.add_task(send_verification_email, user.email, user.name, token)
    return {"message": "Verification email re-sent. Please check your inbox."}


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
