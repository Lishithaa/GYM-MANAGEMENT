"""
Stub auth dependencies for scaffold demo.
Replace with your real JWT/authz logic.
"""

from fastapi import HTTPException


def current_admin():
    # Replace with actual auth lookup.
    class Admin:
        role = "admin"
        id = None

    return Admin()


def current_user():
    # Replace with actual auth lookup.
    class User:
        role = "user"
        id = None

    return User()


def current_trainer_user():
    # Replace with actual auth lookup.
    class TrainerUser:
        role = "trainer"
        id = None

    return TrainerUser()


def ensure_admin(user):
    if getattr(user, "role", None) != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
