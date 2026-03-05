from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from app.core.config import settings
from typing import List

async def send_email(recipients: List[str], subject: str, body: str):
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("Email sending is not configured. Skipping email.")
        return

    conf = ConnectionConfig(
        MAIL_USERNAME=settings.SMTP_USER,
        MAIL_PASSWORD=settings.SMTP_PASSWORD,
        MAIL_FROM=settings.EMAILS_FROM_EMAIL,
        MAIL_PORT=settings.SMTP_PORT,
        MAIL_SERVER=settings.SMTP_HOST,
        MAIL_FROM_NAME=settings.EMAILS_FROM_NAME,
        MAIL_STARTTLS=settings.SMTP_TLS,
        MAIL_SSL_TLS=not settings.SMTP_TLS,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True
    )

    message = MessageSchema(
        subject=subject,
        recipients=recipients,
        body=body,
        subtype="html"
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        print(f"Email sent to {', '.join(recipients)}")
    except Exception as e:
        print(f"Failed to send email: {e}")
