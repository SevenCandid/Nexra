"""
Email notification service using aiosmtplib.
Gracefully no-ops if SMTP is not configured.
"""

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("uvicorn.error")


async def send_email(to: str, subject: str, body_html: str, body_text: str = "") -> bool:
    """Send an email. Returns True on success, False if SMTP not configured or on error."""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.debug("SMTP not configured - skipping email notification")
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
    comment: str | None = None,
    verification_url: str | None = None,
) -> None:
    """Fire-and-forget email for Sender ID status updates."""
    status_labels = {
        "approved": ("Approved ✅", "#16a34a"),
        "need_verification": ("Need Verification 🟡", "#ca8a04"),
        "rejected": ("Rejected ❌", "#dc2626"),
    }
    status_label, color = status_labels.get(status, (status.replace("_", " ").title(), "#334155"))
    comment_section = f"<p><strong>Admin Comment:</strong> {comment}</p>" if comment else ""
    verification_section = (
        f'<p><a href="{verification_url}" style="display:inline-block;padding:12px 18px;background:{color};color:#fff;text-decoration:none;border-radius:10px;font-weight:700;">Open verification page</a></p>'
        if verification_url
        else ""
    )

    body_html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px;">
        <h2 style="color: {color};">Sender ID {status_label}</h2>
        <p>Your Sender ID request for <strong style="font-size: 1.2em;">{sender_id}</strong> has been <strong>{status}</strong>.</p>
        {comment_section}
        {verification_section}
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #888; font-size: 12px;">NEXRA Messaging Platform</p>
    </div>
    """
    body_text = (
        f"Your Sender ID '{sender_id}' has been {status}. "
        f"{f'Comment: {comment}' if comment else ''} "
        f"{f'Verification: {verification_url}' if verification_url else ''}"
    )
    subject = f"NEXRA: Sender ID '{sender_id}' {status_label}"

    await send_email(to_email, subject, body_html, body_text)

async def send_low_balance_email(
    to_email: str,
    organization_name: str,
    current_balance: float,
    threshold: float,
    top_up_url: str
) -> None:
    """Fire-and-forget email alerting a user that their wallet balance is low."""
    
    body_html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #ea580c; margin-top: 0;">Low Balance Alert ⚠️</h2>
        <p>Hello,</p>
        <p>This is an automated notice that the SMS credit balance for <strong>{organization_name}</strong> has dropped below the {threshold} credit threshold.</p>
        
        <div style="background-color: #fff7ed; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #9a3412; font-size: 1.1em;">
                Current Balance: <strong>{current_balance:.2f} credits</strong>
            </p>
        </div>
        
        <p>To ensure your SMS campaigns continue to send without interruption, please top up your wallet.</p>
        
        <p style="margin-top: 30px;">
            <a href="{top_up_url}" style="display:inline-block;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
                Top Up Now
            </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px 0;">
        <p style="color: #64748b; font-size: 12px; margin: 0;">NEXRA Messaging Platform • Automated Billing System</p>
    </div>
    """
    
    body_text = (
        f"Low Balance Alert: The SMS credit balance for {organization_name} is now {current_balance:.2f} credits.\n\n"
        f"To avoid campaign interruptions, please top up your wallet at: {top_up_url}\n"
    )
    
    subject = f"⚠️ Low Balance Alert: {organization_name}"
    
    await send_email(to_email, subject, body_html, body_text)
