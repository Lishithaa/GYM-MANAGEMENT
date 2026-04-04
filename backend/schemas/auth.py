from pydantic import BaseModel, ConfigDict
from typing import Optional


class UserRegisterIn(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = None
    role: str = "user"
    referral_code: Optional[str] = None


class UserLoginIn(BaseModel):
    email: str
    password: str


class TokenRefreshIn(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    email: str
    name: str
    phone: Optional[str]
    role: str
    is_verified: bool
    picture: Optional[str]
    referral_code: Optional[str] = None


class UserMeOut(UserOut):
    referrals_count: int = 0


class UserProfilePatch(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    picture: Optional[str] = None


class AdminUserCreateIn(BaseModel):
    email: str
    password: str
    name: str
    role: str = "user"
    phone: Optional[str] = None


class LoginOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    user: UserOut
