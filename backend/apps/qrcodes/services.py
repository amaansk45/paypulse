import json
import io
import qrcode
from PIL import Image
from decimal import Decimal
from django.core.files.base import ContentFile
from django.utils import timezone
from datetime import timedelta
from rest_framework.exceptions import ValidationError

from apps.users.models import User
from apps.wallets.services import WalletService
from apps.wallets.exceptions import InsufficientFundsException
from apps.payments.models import Transaction
from apps.payments.services import PaymentService
from apps.notifications.services import send_notification
from apps.audit.services import record_audit_log
from .models import QRCode


class QRService:
    @classmethod
    def generate_qr_image_file(cls, qr_payload_str: str, filename: str) -> ContentFile:
        """
        Renders a high-resolution QR code image into a ContentFile.
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_payload_str)
        qr.make(fit=True)

        img = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        return ContentFile(buffer.getvalue(), name=filename)

    @classmethod
    def get_or_create_personal_qr(cls, user: User) -> QRCode:
        """
        Returns the user's permanent personal QR code, creating and rendering it if missing.
        """
        qr_obj = QRCode.objects.filter(user=user, qr_type='PERSONAL', is_active=True).first()
        if not qr_obj:
            qr_obj = QRCode(
                user=user,
                qr_type='PERSONAL',
                currency='INR'
            )
            qr_obj.save()

        # Check if image file exists
        if not qr_obj.qr_image:
            payload = {
                "app": "paypulse",
                "pid": qr_obj.payment_identifier,
                "type": "PERSONAL",
                "username": user.username,
                "name": getattr(user.profile, 'full_name', user.username),
                "sig": qr_obj.signature
            }
            img_file = cls.generate_qr_image_file(json.dumps(payload), f"qr_{qr_obj.payment_identifier}.png")
            qr_obj.qr_image.save(f"qr_{qr_obj.payment_identifier}.png", img_file, save=True)

        return qr_obj

    @classmethod
    def create_dynamic_qr(cls, user: User, amount: Decimal, note: str = "", expiry_minutes: int = 30) -> QRCode:
        """
        Creates a time-bound dynamic invoice QR code.
        """
        amount = Decimal(str(amount))
        if amount <= Decimal('0.00'):
            raise ValidationError("Dynamic QR amount must be greater than zero.")

        expires_at = timezone.now() + timedelta(minutes=expiry_minutes)

        qr_obj = QRCode(
            user=user,
            qr_type='DYNAMIC',
            amount=amount,
            currency='INR',
            note=note,
            expires_at=expires_at
        )
        qr_obj.save()

        payload = {
            "app": "paypulse",
            "pid": qr_obj.payment_identifier,
            "type": "DYNAMIC",
            "amount": str(amount),
            "currency": qr_obj.currency,
            "username": user.username,
            "note": note,
            "expires_at": expires_at.isoformat(),
            "sig": qr_obj.signature
        }

        img_file = cls.generate_qr_image_file(json.dumps(payload), f"dyn_{qr_obj.payment_identifier}.png")
        qr_obj.qr_image.save(f"dyn_{qr_obj.payment_identifier}.png", img_file, save=True)

        return qr_obj

    @classmethod
    def resolve_qr_identifier(cls, raw_data: str) -> str:
        """
        Extracts payment_identifier whether input is raw PID, a URL, or JSON payload.
        """
        if not raw_data:
            return ""
        clean = raw_data.strip()
        if clean.startswith("{") and clean.endswith("}"):
            try:
                data = json.loads(clean)
                return data.get("pid", "")
            except Exception:
                pass
        if "pid=" in clean:
            import urllib.parse as urlparse
            parsed = urlparse.urlparse(clean)
            qs = urlparse.parse_qs(parsed.query)
            if "pid" in qs:
                return qs["pid"][0]
        return clean

    @classmethod
    def validate_qr(cls, raw_identifier: str, scanning_user: User) -> dict:
        """
        Validates scanned QR code and returns recipient profile details.
        """
        pid = cls.resolve_qr_identifier(raw_identifier)
        if not pid:
            raise ValidationError("Invalid or empty QR code data.")

        qr_obj = QRCode.objects.filter(payment_identifier=pid).select_related('user', 'user__profile').first()
        if not qr_obj:
            raise ValidationError("QR code not recognized in the PayPulse payment network.")

        is_valid, reason = qr_obj.is_valid_for_payment()
        if not is_valid:
            raise ValidationError(reason)

        if qr_obj.user.id == scanning_user.id:
            raise ValidationError("You cannot scan and pay your own QR code.")

        profile = getattr(qr_obj.user, 'profile', None)
        avatar_url = profile.avatar.url if profile and profile.avatar else None

        return {
            "payment_identifier": qr_obj.payment_identifier,
            "qr_type": qr_obj.qr_type,
            "amount": str(qr_obj.amount) if qr_obj.amount is not None else None,
            "currency": qr_obj.currency,
            "note": qr_obj.note,
            "recipient": {
                "id": str(qr_obj.user.id),
                "username": qr_obj.user.username,
                "full_name": profile.full_name if profile else qr_obj.user.username,
                "avatar": avatar_url,
                "kyc_status": profile.kyc_status if profile else 'UNVERIFIED',
            },
            "expires_at": qr_obj.expires_at.isoformat() if qr_obj.expires_at else None
        }

    @classmethod
    def pay_via_qr(
        cls,
        payer: User,
        raw_identifier: str,
        amount: Decimal = None,
        pin: str = None,
        note: str = "",
        request=None
    ) -> Transaction:
        """
        Authorizes and settles a payment via scanned QR code.
        """
        pid = cls.resolve_qr_identifier(raw_identifier)
        qr_obj = QRCode.objects.filter(payment_identifier=pid).select_related('user').first()
        if not qr_obj:
            raise ValidationError("QR code not found.")

        is_valid, reason = qr_obj.is_valid_for_payment()
        if not is_valid:
            raise ValidationError(reason)

        if qr_obj.user.id == payer.id:
            raise ValidationError("You cannot pay your own QR code.")

        # Determine payment amount
        if qr_obj.qr_type == 'DYNAMIC' and qr_obj.amount is not None:
            pay_amount = qr_obj.amount
        else:
            if amount is None or Decimal(str(amount)) <= Decimal('0.00'):
                raise ValidationError("Please specify a valid payment amount.")
            pay_amount = Decimal(str(amount))

        # Check PIN
        PaymentService.verify_user_pin_if_required(payer, pay_amount, pin)

        receiver = qr_obj.user
        payer_wallet = WalletService.get_or_create_wallet(payer)
        receiver_wallet = WalletService.get_or_create_wallet(receiver)

        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            txn = Transaction.objects.create(
                sender=payer,
                receiver=receiver,
                amount=pay_amount,
                fee=Decimal('0.00'),
                net_amount=pay_amount,
                currency=payer_wallet.currency,
                transaction_type='QR_PAYMENT',
                payment_method='QR',
                status='PROCESSING',
                description=note or qr_obj.note or f"QR Payment to {receiver.username}",
                metadata={'payment_identifier': qr_obj.payment_identifier, 'qr_type': qr_obj.qr_type}
            )

            try:
                WalletService.transfer(
                    sender_wallet=payer_wallet,
                    receiver_wallet=receiver_wallet,
                    amount=pay_amount,
                    reference_type='QR_PAYMENT',
                    reference_id=txn.transaction_id,
                    sender_note=f"QR payment to {receiver.username}",
                    receiver_note=f"QR payment received from {payer.username}"
                )

                txn.status = 'SUCCESS'
                txn.completed_at = timezone.now()
                txn.save(update_fields=['status', 'completed_at'])

                # If dynamic, mark used
                if qr_obj.qr_type == 'DYNAMIC':
                    qr_obj.is_used = True
                    qr_obj.save(update_fields=['is_used'])

            except InsufficientFundsException as e:
                txn.status = 'FAILED'
                txn.failure_reason = str(e)
                txn.save(update_fields=['status', 'failure_reason'])
                raise ValidationError(str(e))

        send_notification(
            user=payer,
            title="QR Payment Successful",
            message=f"You paid {payer_wallet.currency} {pay_amount:.2f} to {receiver.username} using QR scan.",
            notification_type='QR_PAYMENT',
            data={'transaction_id': txn.transaction_id, 'amount': str(pay_amount)}
        )
        send_notification(
            user=receiver,
            title="QR Payment Received",
            message=f"You received {receiver_wallet.currency} {pay_amount:.2f} from {payer.username} via QR.",
            notification_type='QR_PAYMENT',
            data={'transaction_id': txn.transaction_id, 'amount': str(pay_amount)}
        )

        record_audit_log(
            request=request,
            user=payer,
            action="QR_PAYMENT_SUCCESS",
            status="SUCCESS",
            reference_id=txn.transaction_id,
            metadata={"amount": str(pay_amount), "recipient": receiver.username, "qr_pid": qr_obj.payment_identifier}
        )

        return txn
