import html
import logging
import os

import requests

from app.otp import CODE_LIFETIME_MINUTES

logger = logging.getLogger("reqhub.email")

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def send_email(to_email: str, to_name: str, subject: str, body_html: str) -> bool:
    api_key = os.getenv("BREVO_API_KEY")
    sender_email = os.getenv("EMAIL_SENDER")
    sender_name = os.getenv("EMAIL_SENDER_NAME", "ReqHub")

    if not api_key or not sender_email:
        logger.warning("Email is not configured, skipping email to %s", to_email)
        return False

    recipient = {"email": to_email}
    if to_name:
        recipient["name"] = to_name

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [recipient],
        "subject": subject,
        "htmlContent": body_html,
    }
    headers = {
        "api-key": api_key,
        "accept": "application/json",
        "content-type": "application/json",
    }

    try:
        response = requests.post(BREVO_URL, json=payload, headers=headers, timeout=10)
        if response.status_code >= 300:
            logger.error(
                "Email service rejected the message (%s): %s",
                response.status_code,
                response.text,
            )
            return False
        return True
    except requests.RequestException as exc:
        logger.error("Could not send email: %s", exc)
        return False


def send_verification_code(to_email: str, code: str) -> bool:
    body = f"""
    <p>Your ReqHub verification code is:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:6px;">{code}</p>
    <p>It expires in {CODE_LIFETIME_MINUTES} minutes. If you did not try to create
    a ReqHub account, you can ignore this email.</p>
    """
    return send_email(to_email, "", "Your ReqHub verification code", body)


def notify_new_quote(
    requester_email: str,
    requester_name: str,
    request_id: int,
    request_title: str,
    provider_name: str,
    price,
    eta,
) -> None:
    frontend = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    link = f"{frontend}/requests/{request_id}"
    eta_line = f"<br>Arrival: {html.escape(eta)}" if eta else ""

    body = f"""
    <p>Hi {html.escape(requester_name)},</p>
    <p><strong>{html.escape(provider_name)}</strong> sent a quote on your request
    "<strong>{html.escape(request_title)}</strong>".</p>
    <p>Price: <strong>&#8377;{price}</strong>{eta_line}</p>
    <p><a href="{link}">View the quote</a></p>
    <p>ReqHub</p>
    """

    send_email(
        requester_email,
        requester_name,
        f"New quote on your request: {request_title}",
        body,
    )