from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.users.models import User
from apps.wallets.models import Wallet
from apps.wallets.services import WalletService
from apps.wallets.exceptions import InsufficientFundsException, WalletFrozenException
from apps.notifications.services import send_notification
from apps.audit.services import record_audit_log
from .models import Transaction, PaymentRequest, Refund
from .gateway import SandboxPaymentGateway


class PaymentService:
    @staticmethod
    def find_recipient(identifier: str) -> User:
        """
        Locates a user by username, email, phone number, or payment identifier (QR/PayLink).
        """
        clean_id = str(identifier).strip()
        user = User.objects.filter(
            username__iexact=clean_id
        ).first()

        if not user:
            user = User.objects.filter(email__iexact=clean_id).first()

        if not user and clean_id:
            user = User.objects.filter(phone_number=clean_id).first()

        if not user and clean_id:
            from apps.qrcodes.models import QRCode
            qr = QRCode.objects.filter(payment_identifier=clean_id).select_related('user').first()
            if qr:
                user = qr.user

        if not user:
            raise ValidationError(f"Recipient with identifier '{identifier}' was not found.")

        if not user.is_active or user.account_status != 'ACTIVE':
            raise ValidationError("Recipient account is currently inactive or suspended.")

        return user

    @staticmethod
    def verify_user_pin_if_required(user: User, amount: Decimal, raw_pin: str):
        """
        Enforces transaction PIN if set or if transaction exceeds threshold.
        """
        threshold = getattr(settings, 'TRANSACTION_PIN_REQUIRED_THRESHOLD', 500)
        if user.is_pin_set or amount >= Decimal(str(threshold)):
            if not user.is_pin_set:
                raise ValidationError("Please set your Security/Transaction PIN in settings before transferring funds.")
            if not raw_pin:
                raise ValidationError("Security PIN is required to authorize this payment.")
            if not user.check_pin(raw_pin):
                raise ValidationError("Invalid Security PIN entered.")

    @classmethod
    def send_money(
        cls,
        sender: User,
        recipient_identifier: str,
        amount: Decimal,
        note: str = "",
        pin: str = None,
        idempotency_key: str = None,
        payment_method: str = "WALLET",
        request=None
    ) -> Transaction:
        amount = Decimal(str(amount))
        if amount <= Decimal('0.00'):
            raise ValidationError("Transfer amount must be positive.")

        receiver = cls.find_recipient(recipient_identifier)
        if receiver.id == sender.id:
            raise ValidationError("You cannot send money to yourself.")

        # PIN Check
        cls.verify_user_pin_if_required(sender, amount, pin)

        # Sender Wallet Check
        sender_wallet = WalletService.get_or_create_wallet(sender)
        receiver_wallet = WalletService.get_or_create_wallet(receiver)

        with transaction.atomic():
            # Create transaction record in PROCESSING status
            txn = Transaction.objects.create(
                sender=sender,
                receiver=receiver,
                amount=amount,
                fee=Decimal('0.00'),
                net_amount=amount,
                currency=sender_wallet.currency,
                transaction_type='SEND',
                payment_method=payment_method,
                status='PROCESSING',
                description=note or f"Payment to {receiver.username}",
                idempotency_key=idempotency_key,
                metadata={'sender_username': sender.username, 'receiver_username': receiver.username}
            )

            try:
                # Perform atomic double-entry transfer via Ledger
                WalletService.transfer(
                    sender_wallet=sender_wallet,
                    receiver_wallet=receiver_wallet,
                    amount=amount,
                    reference_type='SEND',
                    reference_id=txn.transaction_id,
                    idempotency_key=idempotency_key,
                    sender_note=f"Sent to {receiver.username}: {note}",
                    receiver_note=f"Received from {sender.username}: {note}"
                )

                txn.status = 'SUCCESS'
                txn.completed_at = timezone.now()
                txn.save(update_fields=['status', 'completed_at'])

            except (InsufficientFundsException, WalletFrozenException) as e:
                txn.status = 'FAILED'
                txn.failure_reason = str(e)
                txn.save(update_fields=['status', 'failure_reason'])
                record_audit_log(
                    request=request,
                    user=sender,
                    action="SEND_MONEY_FAILED",
                    status="FAILURE",
                    reference_id=txn.transaction_id,
                    metadata={"error": str(e), "amount": str(amount)}
                )
                raise ValidationError(str(e))
            except Exception as e:
                txn.status = 'FAILED'
                txn.failure_reason = "Transaction failed during ledger processing."
                txn.save(update_fields=['status', 'failure_reason'])
                raise

        # Dispatch Notifications
        send_notification(
            user=sender,
            title="Money Sent Successfully",
            message=f"You have sent {sender_wallet.currency} {amount:.2f} to {receiver.username} (TXN: {txn.transaction_id}).",
            notification_type='MONEY_SENT',
            data={'transaction_id': txn.transaction_id, 'amount': str(amount)}
        )
        send_notification(
            user=receiver,
            title="Money Received",
            message=f"You received {receiver_wallet.currency} {amount:.2f} from {sender.username} (TXN: {txn.transaction_id}).",
            notification_type='MONEY_RECEIVED',
            data={'transaction_id': txn.transaction_id, 'amount': str(amount)}
        )

        record_audit_log(
            request=request,
            user=sender,
            action="SEND_MONEY_SUCCESS",
            status="SUCCESS",
            reference_id=txn.transaction_id,
            metadata={"amount": str(amount), "recipient": receiver.username}
        )

        return txn

    @classmethod
    def create_payment_request(
        cls,
        requester: User,
        payer_identifier: str,
        amount: Decimal,
        note: str = "",
        days_valid: int = 7,
        request=None
    ) -> PaymentRequest:
        amount = Decimal(str(amount))
        if amount <= Decimal('0.00'):
            raise ValidationError("Requested amount must be greater than zero.")

        payer = cls.find_recipient(payer_identifier)
        if payer.id == requester.id:
            raise ValidationError("You cannot request money from yourself.")

        expires_at = timezone.now() + timedelta(days=days_valid)

        req = PaymentRequest.objects.create(
            requester=requester,
            payer=payer,
            amount=amount,
            currency='INR',
            note=note,
            status='PENDING',
            expires_at=expires_at
        )

        send_notification(
            user=payer,
            title="Payment Request Received",
            message=f"{requester.username} requested {req.currency} {amount:.2f} from you: '{note}'.",
            notification_type='PAYMENT_REQUEST',
            data={'request_id': req.request_id, 'amount': str(amount)}
        )

        record_audit_log(
            request=request,
            user=requester,
            action="PAYMENT_REQUEST_CREATED",
            status="SUCCESS",
            reference_id=req.request_id,
            metadata={"amount": str(amount), "payer": payer.username}
        )

        return req

    @classmethod
    def accept_payment_request(cls, payer: User, request_id: str, pin: str = None, request=None) -> Transaction:
        req = PaymentRequest.objects.filter(request_id=request_id).select_related('requester', 'payer').first()
        if not req:
            raise ValidationError("Payment request not found.")

        if req.payer.id != payer.id:
            raise PermissionDenied("You are not authorized to accept this payment request.")

        if req.status != 'PENDING':
            raise ValidationError(f"This payment request is already {req.status.lower()}.")

        if timezone.now() > req.expires_at:
            req.status = 'EXPIRED'
            req.save(update_fields=['status'])
            raise ValidationError("This payment request has expired.")

        # Check PIN
        cls.verify_user_pin_if_required(payer, req.amount, pin)

        payer_wallet = WalletService.get_or_create_wallet(payer)
        requester_wallet = WalletService.get_or_create_wallet(req.requester)

        with transaction.atomic():
            txn = Transaction.objects.create(
                sender=payer,
                receiver=req.requester,
                amount=req.amount,
                fee=Decimal('0.00'),
                net_amount=req.amount,
                currency=req.currency,
                transaction_type='PAYMENT_REQUEST',
                payment_method='WALLET',
                status='PROCESSING',
                description=f"Paid request {req.request_id}: {req.note}",
                metadata={'request_id': req.request_id}
            )

            try:
                WalletService.transfer(
                    sender_wallet=payer_wallet,
                    receiver_wallet=requester_wallet,
                    amount=req.amount,
                    reference_type='PAYMENT_REQUEST',
                    reference_id=txn.transaction_id,
                    sender_note=f"Paid request to {req.requester.username}",
                    receiver_note=f"Request paid by {payer.username}"
                )

                txn.status = 'SUCCESS'
                txn.completed_at = timezone.now()
                txn.save(update_fields=['status', 'completed_at'])

                req.status = 'ACCEPTED'
                req.transaction = txn
                req.save(update_fields=['status', 'transaction', 'updated_at'])

            except InsufficientFundsException as e:
                txn.status = 'FAILED'
                txn.failure_reason = str(e)
                txn.save(update_fields=['status', 'failure_reason'])
                raise ValidationError(str(e))

        send_notification(
            user=req.requester,
            title="Payment Request Accepted",
            message=f"{payer.username} accepted and paid your request for {req.currency} {req.amount:.2f}.",
            notification_type='REQUEST_ACCEPTED',
            data={'request_id': req.request_id, 'transaction_id': txn.transaction_id}
        )
        send_notification(
            user=payer,
            title="Payment Request Paid",
            message=f"You paid {req.currency} {req.amount:.2f} for request from {req.requester.username}.",
            notification_type='MONEY_SENT',
            data={'request_id': req.request_id, 'transaction_id': txn.transaction_id}
        )

        record_audit_log(
            request=request,
            user=payer,
            action="PAYMENT_REQUEST_ACCEPTED",
            status="SUCCESS",
            reference_id=req.request_id,
            metadata={"transaction_id": txn.transaction_id, "amount": str(req.amount)}
        )

        return txn

    @classmethod
    def reject_payment_request(cls, payer: User, request_id: str, request=None) -> PaymentRequest:
        req = PaymentRequest.objects.filter(request_id=request_id).select_related('requester', 'payer').first()
        if not req:
            raise ValidationError("Payment request not found.")

        if req.payer.id != payer.id:
            raise PermissionDenied("You are not authorized to reject this payment request.")

        if req.status != 'PENDING':
            raise ValidationError(f"This payment request is already {req.status.lower()}.")

        req.status = 'REJECTED'
        req.save(update_fields=['status', 'updated_at'])

        send_notification(
            user=req.requester,
            title="Payment Request Rejected",
            message=f"{payer.username} declined your request for {req.currency} {req.amount:.2f}.",
            notification_type='REQUEST_REJECTED',
            data={'request_id': req.request_id}
        )

        record_audit_log(
            request=request,
            user=payer,
            action="PAYMENT_REQUEST_REJECTED",
            status="SUCCESS",
            reference_id=req.request_id
        )

        return req

    @classmethod
    def add_money_initiate(cls, user: User, amount: Decimal, payment_method: str = "SANDBOX_GATEWAY", request=None) -> dict:
        amount = Decimal(str(amount))
        if amount <= Decimal('0.00'):
            raise ValidationError("Top-up amount must be positive.")

        wallet = WalletService.get_or_create_wallet(user)

        with transaction.atomic():
            txn = Transaction.objects.create(
                sender=None,
                receiver=user,
                amount=amount,
                fee=Decimal('0.00'),
                net_amount=amount,
                currency=wallet.currency,
                transaction_type='ADD_MONEY',
                payment_method=payment_method,
                status='PENDING',
                description=f"Wallet top-up via {payment_method}"
            )

            gateway_order = SandboxPaymentGateway.create_order(
                amount=amount,
                currency=wallet.currency,
                customer_id=str(user.id)
            )

            txn.metadata = {'gateway_order': gateway_order}
            txn.save(update_fields=['metadata'])

        return {
            "transaction_id": txn.transaction_id,
            "order_id": gateway_order["order_id"],
            "amount": str(amount),
            "currency": wallet.currency,
            "gateway_order": gateway_order
        }

    @classmethod
    def add_money_complete(
        cls,
        user: User,
        transaction_id: str,
        gateway_payment_id: str,
        gateway_order_id: str,
        gateway_signature: str,
        payment_method: str = "CARD",
        request=None
    ) -> Transaction:
        txn = Transaction.objects.filter(transaction_id=transaction_id, receiver=user).first()
        if not txn:
            raise ValidationError("Transaction not found.")

        if txn.status == 'SUCCESS':
            return txn  # Idempotent return

        if txn.status != 'PENDING':
            raise ValidationError(f"Transaction status is {txn.status}; cannot be completed.")

        # Verify gateway signature
        is_valid = SandboxPaymentGateway.verify_payment(
            order_id=gateway_order_id,
            payment_id=gateway_payment_id,
            signature=gateway_signature
        )

        if not is_valid:
            txn.status = 'FAILED'
            txn.failure_reason = "Payment gateway signature verification failed."
            txn.save(update_fields=['status', 'failure_reason'])
            raise ValidationError("Gateway signature verification failed.")

        wallet = WalletService.get_or_create_wallet(user)

        with transaction.atomic():
            WalletService.credit_wallet(
                wallet=wallet,
                amount=txn.amount,
                reference_type='ADD_MONEY',
                reference_id=txn.transaction_id,
                idempotency_key=f"TOPUP_{txn.transaction_id}",
                description=f"Wallet Top-Up ({payment_method})"
            )

            txn.status = 'SUCCESS'
            txn.completed_at = timezone.now()
            txn.payment_method = payment_method
            txn.metadata.update({
                'gateway_payment_id': gateway_payment_id,
                'gateway_order_id': gateway_order_id,
                'gateway_signature': gateway_signature
            })
            txn.save(update_fields=['status', 'completed_at', 'payment_method', 'metadata'])

        send_notification(
            user=user,
            title="Money Added to Wallet",
            message=f"Successfully credited {wallet.currency} {txn.amount:.2f} to your wallet.",
            notification_type='ADD_MONEY',
            data={'transaction_id': txn.transaction_id, 'amount': str(txn.amount)}
        )

        record_audit_log(
            request=request,
            user=user,
            action="ADD_MONEY_SUCCESS",
            status="SUCCESS",
            reference_id=txn.transaction_id,
            metadata={"amount": str(txn.amount), "method": payment_method}
        )

        return txn

    @classmethod
    def request_refund(cls, requester: User, transaction_id: str, amount: Decimal, reason: str, request=None) -> Refund:
        amount = Decimal(str(amount))
        txn = Transaction.objects.filter(transaction_id=transaction_id).first()
        if not txn:
            raise ValidationError("Transaction not found.")

        # Only sender (or receiver of add_money) can request refund
        if txn.sender != requester and not (txn.transaction_type == 'ADD_MONEY' and txn.receiver == requester):
            raise PermissionDenied("You can only request refunds for payments you initiated.")

        if txn.status != 'SUCCESS':
            raise ValidationError("Only successfully completed transactions can be refunded.")

        if amount > txn.amount:
            raise ValidationError(f"Refund amount cannot exceed original transaction amount ({txn.currency} {txn.amount}).")

        # Check existing refund
        existing = Refund.objects.filter(transaction=txn, status__in=['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSED']).first()
        if existing:
            raise ValidationError(f"A refund has already been requested for this transaction (Status: {existing.status}).")

        rfd = Refund.objects.create(
            transaction=txn,
            requester=requester,
            amount=amount,
            currency=txn.currency,
            reason=reason,
            status='REQUESTED'
        )

        send_notification(
            user=requester,
            title="Refund Request Submitted",
            message=f"Your refund request of {txn.currency} {amount:.2f} for TXN {txn.transaction_id} is under review.",
            notification_type='REFUND',
            data={'refund_id': rfd.refund_id, 'transaction_id': txn.transaction_id}
        )

        record_audit_log(
            request=request,
            user=requester,
            action="REFUND_REQUESTED",
            status="SUCCESS",
            reference_id=rfd.refund_id,
            metadata={"amount": str(amount), "transaction_id": txn.transaction_id}
        )

        return rfd

    @classmethod
    def process_refund(cls, admin_user: User, refund_id: str, action: str, admin_notes: str = "", request=None) -> Refund:
        rfd = Refund.objects.filter(refund_id=refund_id).select_related('transaction', 'requester').first()
        if not rfd:
            raise ValidationError("Refund record not found.")

        if rfd.status in ['APPROVED', 'PROCESSED', 'REJECTED']:
            raise ValidationError(f"This refund has already been processed with status '{rfd.status}'.")

        action = action.upper().strip()
        if action not in ['APPROVE', 'REJECT']:
            raise ValidationError("Action must be either 'APPROVE' or 'REJECT'.")

        txn = rfd.transaction

        if action == 'REJECT':
            rfd.status = 'REJECTED'
            rfd.admin_notes = admin_notes
            rfd.reviewed_by = admin_user
            rfd.reviewed_at = timezone.now()
            rfd.save(update_fields=['status', 'admin_notes', 'reviewed_by', 'reviewed_at', 'updated_at'])

            send_notification(
                user=rfd.requester,
                title="Refund Request Rejected",
                message=f"Your refund request {rfd.refund_id} was rejected: {admin_notes or 'Business policy guidelines.'}",
                notification_type='REFUND',
                data={'refund_id': rfd.refund_id}
            )

            record_audit_log(
                request=request,
                user=admin_user,
                action="ADMIN_REFUND_REJECTED",
                status="SUCCESS",
                reference_id=rfd.refund_id
            )
            return rfd

        # Action is APPROVE -> execute compensating ledger operations
        with transaction.atomic():
            if txn.transaction_type in ['SEND', 'PAYMENT_REQUEST', 'QR_PAYMENT']:
                # Return funds from receiver back to sender
                receiver_wallet = WalletService.get_or_create_wallet(txn.receiver)
                sender_wallet = WalletService.get_or_create_wallet(txn.sender)

                WalletService.transfer(
                    sender_wallet=receiver_wallet,
                    receiver_wallet=sender_wallet,
                    amount=rfd.amount,
                    reference_type='REFUND',
                    reference_id=rfd.refund_id,
                    idempotency_key=f"RFD_{rfd.refund_id}",
                    sender_note=f"Refund deduction for TXN {txn.transaction_id}",
                    receiver_note=f"Refund credited for TXN {txn.transaction_id}"
                )
            elif txn.transaction_type == 'ADD_MONEY':
                # Debit requester's wallet (they received funds from gateway top-up)
                requester_wallet = WalletService.get_or_create_wallet(rfd.requester)
                WalletService.debit_wallet(
                    wallet=requester_wallet,
                    amount=rfd.amount,
                    reference_type='REFUND',
                    reference_id=rfd.refund_id,
                    idempotency_key=f"RFD_{rfd.refund_id}",
                    description=f"Refund adjustment for Top-up TXN {txn.transaction_id}"
                )

            rfd.status = 'APPROVED'
            rfd.admin_notes = admin_notes
            rfd.reviewed_by = admin_user
            rfd.reviewed_at = timezone.now()
            rfd.save(update_fields=['status', 'admin_notes', 'reviewed_by', 'reviewed_at', 'updated_at'])

            txn.status = 'REFUNDED'
            txn.save(update_fields=['status'])

        send_notification(
            user=rfd.requester,
            title="Refund Approved & Credited",
            message=f"Your refund of {rfd.currency} {rfd.amount:.2f} for TXN {txn.transaction_id} has been approved and processed.",
            notification_type='REFUND',
            data={'refund_id': rfd.refund_id, 'amount': str(rfd.amount)}
        )

        record_audit_log(
            request=request,
            user=admin_user,
            action="ADMIN_REFUND_APPROVED",
            status="SUCCESS",
            reference_id=rfd.refund_id,
            metadata={"amount": str(rfd.amount), "transaction_id": txn.transaction_id}
        )

        return rfd
