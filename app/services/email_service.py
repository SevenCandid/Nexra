"""
Email notification service using aiosmtplib.
Gracefully no-ops if SMTP is not configured.
"""
import asyncio
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")


async def send_email(to: str, subject: str, body_html: str, body_text: str = "") -> bool:
    """Send an email. Returns True on success, False if SMTP not configured or on error."""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.debug("SMTP not configured — skipping email notification")
        return False

    try:
        import aiosmtplib

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM or settings.SMTP_USER
        msg["To"] = to

        if body_text:
            msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=settings.SMTP_PORT == 465,
            start_tls=settings.SMTP_PORT == 587,
        )
        logger.info(f"Email sent to {to}: {subject}")
        return True
    except Exception as e:
        logger.warning(f"Email send failed to {to}: {e}")
        return False


async def send_sender_id_status_email(
    to_email: str,
    sender_id: str,
    status: str,
    comment: str | None = None
) -> None:
    """Fire-and-forget email for Sender ID approval/rejection."""
    status_label = "Approved ✅" if status == "approved" else "Rejected ❌"
    color = "#16a34a" if status == "approved" else "#dc2626"
    comment_section = f"<p><strong>Admin Comment:</strong> {comment}</p>" if comment else ""

    body_html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px;">
        <h2 style="color: {color};">Sender ID {status_label}</h2>
        <p>Your Sender ID request for <strong style="font-size: 1.2em;">{sender_id}</strong> has been <strong>{status}</strong>.</p>
        {comment_section}
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #888; font-size: 12px;">NEXRA Messaging Platform</p>
    </div>
    """
    body_text = f"Your Sender ID '{sender_id}' has been {status}. {f'Comment: {comment}' if comment else ''}"
    subject = f"NEXRA: Sender ID '{sender_id}' {status_label}"

    await send_email(to_email, subject, body_html, body_text)
