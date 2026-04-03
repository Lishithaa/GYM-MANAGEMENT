import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import settings

logger = logging.getLogger(__name__)

_SMTP_HOST = "smtp.sendgrid.net"
_SMTP_PORT = 587
_SMTP_USER = "apikey"


def _send_smtp(to: str, subject: str, html: str) -> None:
    if not settings.SENDGRID_API_KEY:
        logger.warning("SENDGRID_API_KEY not set – skipping email to %s", to)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SENDGRID_FROM_EMAIL
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(_SMTP_HOST, _SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(_SMTP_USER, settings.SENDGRID_API_KEY)
        server.sendmail(settings.SENDGRID_FROM_EMAIL, to, msg.as_string())
        logger.info("Email sent via SMTP → %s | %s", to, subject)


async def send_email(to: str, subject: str, html: str) -> None:
    try:
        await asyncio.to_thread(_send_smtp, to, subject, html)
    except Exception as exc:
        logger.error("Email failed → %s: %s", to, exc)


async def send_verification_email(to: str, name: str, token: str) -> None:
    url = f"{settings.PUBLIC_BACKEND_URL}/api/auth/verify-email?token={token}"
    logger.info("Sending verification email to %s (link via %s)", to, settings.PUBLIC_BACKEND_URL)
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px">
      <h2 style="color:#111">Welcome to HourlyGym, {name}!</h2>
      <p>Click below to verify your email and activate your account.</p>
      <a href="{url}"
         style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;
                text-decoration:none;display:inline-block;font-weight:600;margin:16px 0">
        Verify Email
      </a>
      <p style="color:#888;font-size:12px">This link expires in 24 hours.</p>
    </div>"""
    await send_email(to, "Verify your HourlyGym email", html)


async def send_booking_confirmation(to: str, name: str, booking: dict, qr_b64: str) -> None:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px">
      <h2 style="color:#111">Booking Confirmed!</h2>
      <p>Hi {name}, your session is locked in.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border:1px solid #e5e7eb"><b>Booking ID</b></td>
            <td style="padding:8px;border:1px solid #e5e7eb">{booking['booking_id']}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb"><b>Date</b></td>
            <td style="padding:8px;border:1px solid #e5e7eb">{booking['date']}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb"><b>Time</b></td>
            <td style="padding:8px;border:1px solid #e5e7eb">{booking['start_time']} – {booking['end_time']}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb"><b>Amount</b></td>
            <td style="padding:8px;border:1px solid #e5e7eb">₹{booking['amount']}</td></tr>
      </table>
      <p>Show this QR code to your trainer:</p>
      <img src="data:image/png;base64,{qr_b64}" width="200" height="200" alt="Session QR"/>
    </div>"""
    await send_email(to, "HourlyGym – Session Confirmed", html)


async def send_completion_email(to: str, name: str, date: str) -> None:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px">
      <h2 style="color:#111">Session Completed</h2>
      <p>Hi {name}, your session on <b>{date}</b> has been marked complete.</p>
      <a href="{settings.FRONTEND_URL}/dashboard"
         style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;
                text-decoration:none;display:inline-block;font-weight:600;margin:16px 0">
        Rate Your Trainer
      </a>
    </div>"""
    await send_email(to, "HourlyGym – Session Completed", html)
