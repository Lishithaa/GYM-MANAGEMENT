from fastapi import HTTPException

from config import settings


def _client():
    if not (settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET):
        raise HTTPException(
            503,
            "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the backend .env.",
        )
    import razorpay

    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_order_inr_paise(*, amount_paise: int, receipt: str, notes: dict[str, str]) -> dict:
    if amount_paise < 100:
        raise HTTPException(400, "Amount must be at least ₹1 (100 paise)")
    client = _client()
    safe_receipt = receipt[:40] if receipt else "rcpt"
    safe_notes = {str(k)[:40]: str(v)[:250] for k, v in notes.items()}
    try:
        order = client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": safe_receipt,
                "payment_capture": 1,
                "notes": safe_notes,
            }
        )
    except Exception as e:
        raise HTTPException(502, f"Could not start payment: {e!s}") from e
    return order


def verify_payment_signature(*, order_id: str, payment_id: str, signature: str) -> None:
    client = _client()
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            }
        )
    except Exception as e:
        raise HTTPException(400, f"Payment verification failed: {e!s}") from e


def public_key_id() -> str:
    if not settings.RAZORPAY_KEY_ID:
        raise HTTPException(503, "Razorpay key id is not configured")
    return settings.RAZORPAY_KEY_ID
