from decimal import Decimal
from django.test import TestCase
from apps.users.models import User
from apps.wallets.services import WalletService
from apps.qrcodes.models import QRCode
from apps.qrcodes.services import QRService


class QRCodePaymentTests(TestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(
            username='user_a',
            email='usera@test.com',
            password='Password@123'
        )
        self.user_b = User.objects.create_user(
            username='user_b',
            email='userb@test.com',
            password='Password@123'
        )
        self.wallet_a = WalletService.get_or_create_wallet(self.user_a)
        self.wallet_b = WalletService.get_or_create_wallet(self.user_b)

        # Deposit to user B (payer)
        WalletService.credit_wallet(
            wallet=self.wallet_b,
            amount=Decimal('1000.00'),
            reference_type='ADD_MONEY',
            reference_id='INIT-B'
        )

    def test_personal_qr_creation_and_payment(self):
        qr_a = QRService.get_or_create_personal_qr(self.user_a)
        self.assertEqual(qr_a.qr_type, 'PERSONAL')
        self.assertTrue(qr_a.payment_identifier.startswith("PAY-"))

        val = QRService.validate_qr(qr_a.payment_identifier, scanning_user=self.user_b)
        self.assertEqual(val["recipient"]["username"], "user_a")

        txn = QRService.pay_via_qr(
            payer=self.user_b,
            raw_identifier=qr_a.payment_identifier,
            amount=Decimal('150.00')
        )
        self.assertEqual(txn.status, 'SUCCESS')
        self.wallet_a.refresh_from_db()
        self.wallet_b.refresh_from_db()
        self.assertEqual(self.wallet_a.balance, Decimal('150.00'))
        self.assertEqual(self.wallet_b.balance, Decimal('850.00'))

    def test_dynamic_qr_one_time_use(self):
        dyn_qr = QRService.create_dynamic_qr(
            user=self.user_a,
            amount=Decimal('200.00'),
            note="Invoice #889"
        )
        self.assertEqual(dyn_qr.qr_type, 'DYNAMIC')
        self.assertEqual(dyn_qr.amount, Decimal('200.00'))

        txn = QRService.pay_via_qr(
            payer=self.user_b,
            raw_identifier=dyn_qr.payment_identifier
        )
        self.assertEqual(txn.status, 'SUCCESS')

        dyn_qr.refresh_from_db()
        self.assertTrue(dyn_qr.is_used)

        # Attempt second payment with used dynamic QR
        is_valid, reason = dyn_qr.is_valid_for_payment()
        self.assertFalse(is_valid)
        self.assertIn("already been redeemed", reason)
