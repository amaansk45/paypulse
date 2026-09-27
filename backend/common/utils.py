import uuid
import secrets
import string
import time


def generate_transaction_id() -> str:
    """
    Generates a unique, high-entropy transaction ID: TXN + epoch timestamp + random hex.
    Example: TXN1727431200A8F9E1
    """
    timestamp = int(time.time())
    random_hex = secrets.token_hex(4).upper()
    return f"TXN{timestamp}{random_hex}"


def generate_reference_id(prefix="REF") -> str:
    """
    Generates a unique reference ID.
    Example: REF-88A7D9C2E1F4
    """
    random_hex = secrets.token_hex(6).upper()
    return f"{prefix}-{random_hex}"


def generate_payment_identifier() -> str:
    """
    Generates a public, opaque unique payment identifier for QR / PayLink.
    Example: PAY-A1B2C3D4E5F6
    """
    return f"PAY-{secrets.token_hex(8).upper()}"


def generate_otp_code(length: int = 6) -> str:
    """
    Generates a cryptographically secure numeric OTP code.
    """
    digits = string.digits
    return ''.join(secrets.choice(digits) for _ in range(length))


def get_client_ip(request) -> str:
    """
    Extracts the client's real IP address from request headers.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip


def get_user_agent(request) -> str:
    """
    Extracts User-Agent string from request.
    """
    return request.META.get('HTTP_USER_AGENT', 'Unknown Client')[:255]


def mask_email(email: str) -> str:
    """
    Masks email for privacy display. Example: j***e@example.com
    """
    if not email or '@' not in email:
        return email
    name, domain = email.split('@', 1)
    if len(name) <= 2:
        masked_name = name[0] + "*"
    else:
        masked_name = name[0] + "*" * (len(name) - 2) + name[-1]
    return f"{masked_name}@{domain}"


def mask_phone(phone: str) -> str:
    """
    Masks phone for privacy display. Example: +91 ******4567
    """
    if not phone or len(phone) < 6:
        return phone
    return phone[:3] + "*" * (len(phone) - 5) + phone[-2:]
