from decimal import Decimal
from django.test import TestCase
from apps.users.models import User
from apps.wallets.models import Wallet, WalletLedger
from apps.wallets.services import WalletService
from apps.wallets.exceptions import InsufficientFundsException


class WalletLedgerTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@test.com',
            password='Password@123'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@test.com',
            password='Password@123'
        )
        self.wallet1 = WalletService.get_or_create_wallet(self.user1)
        self.wallet2 = WalletService.get_or_create_wallet(self.user2)

    def test_wallet_initial_state(self):
        self.assertEqual(self.wallet1.balance, Decimal('0.00'))
        self.assertIsNotNone(self.wallet1.wallet_number)

    def test_credit_wallet_creates_ledger(self):
        ledger, wallet = WalletService.credit_wallet(
            wallet=self.wallet1,
            amount=Decimal('500.00'),
            reference_type='ADD_MONEY',
            reference_id='REF-TEST-001',
            description="Initial deposit"
        )
        self.assertEqual(wallet.balance, Decimal('500.00'))
        self.assertEqual(ledger.entry_type, 'CREDIT')
        self.assertEqual(ledger.amount, Decimal('500.00'))
        self.assertEqual(ledger.balance_after, Decimal('500.00'))
        self.assertEqual(self.wallet1.ledger_entries.count(), 1)

    def test_debit_wallet_creates_ledger(self):
        WalletService.credit_wallet(
            wallet=self.wallet1,
            amount=Decimal('1000.00'),
            reference_type='ADD_MONEY',
            reference_id='REF-TEST-002'
        )
        ledger, wallet = WalletService.debit_wallet(
            wallet=self.wallet1,
            amount=Decimal('400.00'),
            reference_type='WITHDRAW',
            reference_id='REF-TEST-003'
        )
        self.assertEqual(wallet.balance, Decimal('600.00'))
        self.assertEqual(ledger.entry_type, 'DEBIT')
        self.assertEqual(ledger.balance_before, Decimal('1000.00'))
        self.assertEqual(ledger.balance_after, Decimal('600.00'))

    def test_insufficient_funds_prevents_negative_balance(self):
        with self.assertRaises(InsufficientFundsException):
            WalletService.debit_wallet(
                wallet=self.wallet1,
                amount=Decimal('100.00'),
                reference_type='WITHDRAW',
                reference_id='REF-TEST-FAIL'
            )
        self.wallet1.refresh_from_db()
        self.assertEqual(self.wallet1.balance, Decimal('0.00'))

    def test_transfer_atomic_double_entry(self):
        WalletService.credit_wallet(
            wallet=self.wallet1,
            amount=Decimal('1000.00'),
            reference_type='ADD_MONEY',
            reference_id='REF-INIT'
        )

        debit, credit = WalletService.transfer(
            sender_wallet=self.wallet1,
            receiver_wallet=self.wallet2,
            amount=Decimal('350.00'),
            reference_type='SEND',
            reference_id='REF-XFER-01',
            idempotency_key='IDEM-TEST-XFER'
        )

        self.wallet1.refresh_from_db()
        self.wallet2.refresh_from_db()

        self.assertEqual(self.wallet1.balance, Decimal('650.00'))
        self.assertEqual(self.wallet2.balance, Decimal('350.00'))
        self.assertEqual(debit.entry_type, 'DEBIT')
        self.assertEqual(credit.entry_type, 'CREDIT')
