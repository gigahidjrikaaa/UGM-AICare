# backend/app/utils/email_utils.py
import smtplib
import os
import logging
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Ensure environment variables are loaded (if not done globally)
# load_dotenv() # Typically loaded once in main.py

logger = logging.getLogger(__name__)

# Fetch email credentials and server info from environment variables
EMAIL_USERNAME = os.getenv("EMAIL_USERNAME")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD") # Use App Password if using Gmail
EMAIL_SMTP_SERVER = os.getenv("EMAIL_SMTP_SERVER") # e.g., smtp.gmail.com
EMAIL_SMTP_PORT = os.getenv("EMAIL_SMTP_PORT") # e.g., 587 or 465

def _html_to_plain(html_content: str) -> str:
    """Derive a readable plain-text alternative from the branded HTML so
    spam filters and text-only clients both see real content."""
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html_content, flags=re.S | re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</(p|div|h[1-6]|li)>", "\n", text, flags=re.I)
    text = re.sub(r"<a [^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>", r"\2 (\1)", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    lines = [line.strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line)

def send_email(recipient_email: str, subject: str, html_content: str, plain_content: str = "", reply_to: str = "") -> bool:
    """Sends an email using configured SMTP settings.

    Attaches a plain-text alternative (derived from the HTML when not given)
    for deliverability and text-only clients."""
    if not all([EMAIL_USERNAME, EMAIL_PASSWORD, EMAIL_SMTP_SERVER, EMAIL_SMTP_PORT]):
        logger.error("Email SMTP settings not fully configured in .env. Cannot send email.")
        return False

    message = MIMEMultipart("alternative")
    # Consider setting a friendly sender name
    message["Subject"] = subject
    message["From"] = f"Aika from UGM AI-Care  <{EMAIL_USERNAME}>" # Example friendly name
    message["To"] = recipient_email
    if reply_to:
        message["Reply-To"] = reply_to

    # Attach plain-text alternative first (preferred fallback), then HTML
    plain = plain_content or _html_to_plain(html_content)
    message.attach(MIMEText(plain, "plain"))
    message.attach(MIMEText(html_content, "html"))

    try:
        port = int(EMAIL_SMTP_PORT)
        if port not in [465, 587]:
            logger.error(f"Invalid SMTP port: {port}. Expected 465 (SSL) or 587 (TLS).")
            return False
        logger.debug("Attempting to send email via %s:%s (recipient withheld from logs)", EMAIL_SMTP_SERVER, port)
        # Use with statement for automatic connection closing
        if port == 465: # SMTP_SSL
             with smtplib.SMTP_SSL(EMAIL_SMTP_SERVER, port) as server:
                server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
                server.sendmail(EMAIL_USERNAME, recipient_email, message.as_string())
        else: # Assume port 587 (TLS) or other standard port
            with smtplib.SMTP(EMAIL_SMTP_SERVER, port) as server:
                server.ehlo() # Identify server
                server.starttls() # Secure the connection
                server.ehlo() # Re-identify after TLS
                server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
                server.sendmail(EMAIL_USERNAME, recipient_email, message.as_string())

        logger.info(f"Email sent successfully to {recipient_email} (Subject: {subject})")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {e}", exc_info=True)
        return False