import html
import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.config import settings

logger = logging.getLogger("royal_affair.email")


def email_is_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USERNAME and settings.SMTP_PASSWORD and settings.EMAIL_FROM)


def _layout(title: str, intro: str, content: str, footer: str) -> str:
    return f"""<!doctype html><html><body style="margin:0;background:#f7f1e8;font-family:Arial,sans-serif;color:#33272b">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px"><tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #e5d4b5;border-radius:12px;overflow:hidden">
        <tr><td style="background:#651b35;padding:24px;text-align:center"><div style="color:#f0cc65;font-size:12px;letter-spacing:4px;text-transform:uppercase">Royal Affair</div><div style="color:#fff;font-family:Georgia,serif;font-size:27px;margin-top:7px">{title}</div></td></tr>
        <tr><td style="padding:28px"><p style="font-size:16px;line-height:1.7;margin:0 0 20px">{intro}</p>{content}<p style="color:#806d73;font-size:13px;line-height:1.6;margin:24px 0 0">{footer}</p></td></tr>
        <tr><td style="background:#2d0b18;color:#e8d7c5;text-align:center;padding:16px;font-size:12px">Designer Suits · Handcrafted Elegance · Royal Affair</td></tr>
      </table>
    </td></tr></table></body></html>"""


def _send(to_email: str, subject: str, plain_text: str, html_body: str, reply_to: str | None = None) -> None:
    if not email_is_configured():
        logger.warning("Email skipped because SMTP settings are incomplete.")
        return
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((settings.EMAIL_FROM_NAME, settings.EMAIL_FROM))
    message["To"] = to_email
    if reply_to:
        message["Reply-To"] = reply_to
    message.set_content(plain_text)
    message.add_alternative(html_body, subtype="html")
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
        smtp.ehlo()
        if settings.SMTP_USE_TLS:
            smtp.starttls(); smtp.ehlo()
        smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)


def send_enquiry_emails(enquiry: dict) -> None:
    try:
        name = html.escape(enquiry.get("name", "Customer"))
        subject = html.escape(enquiry.get("subject", "Customer enquiry"))
        message = html.escape(enquiry.get("message", "")).replace("\n", "<br>")
        phone = html.escape(enquiry.get("phone") or "Not provided")
        reference = html.escape(str(enquiry.get("id", "")))
        customer_content = f"""<div style="background:#fbf6ee;border-left:4px solid #c59b45;padding:16px;border-radius:6px"><strong>Subject:</strong> {subject}<br><br>{message}</div><p style="font-size:13px;color:#806d73">Reference: {reference}</p>"""
        customer_html = _layout("Thank you for contacting us", f"Dear {name}, thank you for contacting Royal Affair. Your enquiry has been received successfully and our customer care team will respond as soon as possible.", customer_content, "Please keep the reference number for future communication. You may reply directly to this email if you wish to provide additional information.")
        _send(enquiry["email"], f"Enquiry received | Royal Affair | {enquiry.get('subject', 'Customer Support')}", f"Dear {enquiry.get('name', 'Customer')},\n\nThank you for contacting Royal Affair. We have received your enquiry and our customer care team will respond as soon as possible.\n\nSubject: {enquiry.get('subject', '')}\nMessage: {enquiry.get('message', '')}\nReference: {enquiry.get('id', '')}\n\nRegards,\nRoyal Affair Customer Care", customer_html, settings.ADMIN_NOTIFICATION_EMAIL or settings.EMAIL_FROM)

        if settings.ADMIN_NOTIFICATION_EMAIL:
            admin_content = f"""<table width="100%" cellpadding="8" style="border-collapse:collapse;font-size:14px"><tr><td><strong>Customer</strong></td><td>{name}</td></tr><tr style="background:#fbf6ee"><td><strong>Email</strong></td><td>{html.escape(enquiry['email'])}</td></tr><tr><td><strong>Phone</strong></td><td>{phone}</td></tr><tr style="background:#fbf6ee"><td><strong>Type</strong></td><td>{html.escape(enquiry.get('enquiry_type','general')).title()}</td></tr><tr><td><strong>Subject</strong></td><td>{subject}</td></tr></table><div style="margin-top:18px;padding:16px;background:#fbf6ee;border-radius:6px;line-height:1.6">{message}</div>"""
            admin_html = _layout("New Customer Enquiry", "A customer has submitted a new enquiry through the Royal Affair website. Please review the details below and respond at the earliest convenience.", admin_content, "Please open the Royal Affair Admin Dashboard and visit Enquiries to review, manage, or reply to this request.")
            _send(settings.ADMIN_NOTIFICATION_EMAIL, f"New Customer Enquiry | {enquiry.get('subject', 'General Enquiry')} | Royal Affair", f"A new customer enquiry has been received.\n\nCustomer: {enquiry.get('name')}\nEmail: {enquiry.get('email')}\nPhone: {enquiry.get('phone') or 'Not provided'}\nSubject: {enquiry.get('subject')}\nMessage: {enquiry.get('message')}\nReference: {enquiry.get('id', '')}\n\nRoyal Affair Customer Care", admin_html, enquiry["email"])
    except Exception:
        logger.exception("Failed to send enquiry email notifications.")


def send_enquiry_reply(enquiry: dict, reply_message: str) -> None:
    name = html.escape(enquiry.get("name", "Customer"))
    reply_html = html.escape(reply_message).replace("\n", "<br>")
    original_subject = html.escape(enquiry.get("subject", "Your enquiry"))
    content = f"""<div style="background:#fbf6ee;border-left:4px solid #c59b45;padding:18px;border-radius:6px;line-height:1.7">{reply_html}</div><p style="font-size:13px;color:#806d73"><strong>Regarding:</strong> {original_subject}</p>"""
    body = _layout("A reply from our team", f"Dear {name}, our Royal Affair styling team has responded to your enquiry.", content, "Need anything else? Simply reply to this email and our team will assist you.")
    _send(enquiry["email"], f"Re: {enquiry.get('subject', 'Your Royal Affair enquiry')}", reply_message, body, settings.ADMIN_NOTIFICATION_EMAIL or settings.EMAIL_FROM)
