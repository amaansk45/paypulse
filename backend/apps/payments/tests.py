from decimal import Decimal
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from apps.users.models import User
from apps.wallets.services import WalletService
from apps.payments.models import Transaction, PaymentRequest
from apps.payments.services import PaymentService
from apps.payments.gateway import SandboxPaymentGateway


class PaymentFlowTests(TestCase):
    def setUp(self):
        self.sender = User.objects.create_user(
            username='alice',
            email='alice@test.com',
            password='Password@123',
            phone_number='+919000000001'
        )
        self.receiver = User.objects.create_user(
            username='bob',
            email='bob@test.com',
            password='Password@123',
            phone_number='+919000000002'
        )
        self.sender.set_pin('1234')
        self.sender.save()

        self.sender_wallet = WalletService.get_or_create_wallet(self.sender)
        self.receiver_wallet = WalletService.get_or_create_wallet(self.receiver)

        # Deposit funds into sender wallet
        WalletService.credit_wallet(
            wallet=self.sender_wallet,
            amount=Decimal('2000.00'),
            reference_type='ADD_MONEY',
            reference_id='DEP-TEST-01'
        )

    def test_send_money_success(self):
        txn = PaymentService.send_money(
            sender=self.sender,
            recipient_identifier='bob',
            amount=Decimal('500.00'),
            note="Project fee",
            pin='1234'
        )

        self.assertEqual(txn.status, 'SUCCESS')
        self.assertEqual(txn.amount, Decimal('500.00'))

        self.sender_wallet.refresh_from_db()
        self.receiver_wallet.refresh_from_db()
        self.assertEqual(self.sender_wallet.balance, Decimal('1500.00'))
        self.assertEqual(self.receiver_wallet.balance, Decimal('500.00'))

    def test_send_money_invalid_pin(self):
        with self.assertRaises(ValidationError):
            PaymentService.send_money(
                sender=self.sender,
                recipient_identifier='bob',
                amount=Decimal('500.00'),
                pin='9999'
            )

    def test_send_money_cannot_self_transfer(self):
        with self.assertRaises(ValidationError):
            PaymentService.send_money(
                sender=self.sender,
                recipient_identifier='alice',
                amount=Decimal('100.00'),
                pin='1234'
            )

    def test_payment_request_and_acceptance(self):
        req = PaymentService.create_payment_request(
            requester=self.receiver,
            payer_identifier='alice',
            amount=Decimal('300.00'),
            note="Team lunch"
        )
        self.assertEqual(req.status, 'PENDING')

        txn = PaymentService.accept_payment_request(
            payer=self.sender,
            request_id=req.request_id,
            pin='1234'
        )
        self.assertEqual(txn.status, 'SUCCESS')
        req.refresh_from_db()
        self.assertEqual(req.status, 'ACCEPTED')

        self.sender_wallet.refresh_from_db()
        self.receiver_wallet.refresh_from_db()
        self.assertEqual(self.sender_wallet.balance, Decimal('1700.00'))
        self.assertEqual(self.receiver_wallet.balance, Decimal('300.00'))

    def test_sandbox_add_money_flow(self):
        init_res = PaymentService.add_money_initiate(
            user=self.sender,
            amount=Decimal('750.00')
        )
        self.assertIn("transaction_id", init_res)
        order_id = init_res["order_id"]

        mock_confirm = SandboxPaymentGateway.generate_mock_payment_confirmation(order_id)

        txn = PaymentService.add_money_complete(
            user=self.sender,
            transaction_id=init_res["transaction_id"],
            gateway_payment_id=mock_confirm["payment_id"],
            gateway_order_id=mock_confirm["order_id"],
            gateway_signature=mock_confirm["signature"],
            payment_method='CARD'
        )
        self.assertEqual(txn.status, 'SUCCESS')
        self.sender_wallet.refresh_from_db()
        self.assertEqual(self.sender_wallet.balance, Decimal('2750.00'))
