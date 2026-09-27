import hmac
import hashlib
import time
import secrets
from decimal import Decimal
from django.conf import settings


class SandboxPaymentGateway:
    """
    Production-grade sandbox/test payment gateway abstraction.
    Simulates external card/UPI payment processing, webhook callbacks,
    and HMAC signature verification without communicating with unauthorized bank APIs.
    """

    @classmethod
    def create_order(cls, amount: Decimal, currency: str = 'INR', customer_id: str = "") -> dict:
        """
        Creates a sandbox payment intent / order.
        """
        timestamp = int(time.time())
        order_id = f"order_sbx_{timestamp}_{secrets.token_hex(4)}"
        amount_cents = int(amount * 100)

        # Generate a sandbox verification signature token
        secret = getattr(settings, 'PAYMENT_GATEWAY_SECRET', 'test_secret').encode('utf-8')
        raw_sig = f"{order_id}|{amount_cents}|{currency}|{customer_id}"
        token = hmac.new(secret, raw_sig.encode('utf-8'), hashlib.sha256).hexdigest()

        return {
            "order_id": order_id,
            "amount": str(amount),
            "amount_cents": amount_cents,
            "currency": currency,
            "gateway_key": getattr(settings, 'PAYMENT_GATEWAY_KEY', 'sandbox_key'),
            "gateway_token": token,
            "gateway_name": "PayPulse Sandbox Gateway",
            "supported_methods": ["CARD", "UPI", "NETBANKING"]
        }

    @classmethod
    def verify_payment(cls, order_id: str, payment_id: str, signature: str) -> bool:
        """
        Verifies sandbox gateway webhook/callback signature.
        """
        if not signature or not payment_id or not order_id:
            return False

        secret = getattr(settings, 'PAYMENT_GATEWAY_SECRET', 'test_secret').encode('utf-8')
        expected_raw = f"{order_id}|{payment_id}"
        expected_sig = hmac.new(secret, expected_raw.encode('utf-8'), hashlib.sha256).hexdigest()

        # Allow test signature bypass for sandbox testing
        if signature.startswith("sbx_mock_valid_") or hmac.compare_digest(signature, expected_sig):
            return True

        return False

    @classmethod
    def generate_mock_payment_confirmation(cls, order_id: str) -> dict:
        """
        Convenience helper to generate valid sandbox verification payload for testing.
        """
        payment_id = f"pay_sbx_{int(time.time())}_{secrets.token_hex(4)}"
        secret = getattr(settings, 'PAYMENT_GATEWAY_SECRET', 'test_secret').encode('utf-8')
        expected_raw = f"{order_id}|{payment_id}"
        sig = hmac.new(secret, expected_raw.encode('utf-8'), hashlib.sha256).hexdigest()
        return {
            "payment_id": payment_id,
            "order_id": order_id,
            "signature": sig
        }
