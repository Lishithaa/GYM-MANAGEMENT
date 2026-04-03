from pydantic import BaseModel, ConfigDict
from typing import Optional


class UserRegisterIn(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = None
    role: str = "user"


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


class LoginOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    user: UserOut
