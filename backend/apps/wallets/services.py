from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from .models import Wallet, WalletLedger
from .exceptions import InsufficientFundsException, WalletFrozenException, WalletLimitExceededException


class WalletService:
    @staticmethod
    def get_or_create_wallet(user) -> Wallet:
        wallet, created = Wallet.objects.get_or_create(
            user=user,
            defaults={'wallet_number': Wallet.generate_wallet_number()}
        )
        return wallet

    @staticmethod
    def credit_wallet(
        wallet: Wallet,
        amount: Decimal,
        reference_type: str,
        reference_id: str,
        idempotency_key: str = None,
        description: str = ""
    ) -> tuple[WalletLedger, Wallet]:
        """
        Atomically credits a wallet balance through an immutable ledger entry.
        Guarantees idempotency and race condition safety via row-level locks.
        """
        amount = Decimal(str(amount))
        if amount <= Decimal('0.00'):
            raise ValueError("Credit amount must be greater than zero.")

        with transaction.atomic():
            # Idempotency check
            if idempotency_key:
                existing_entry = WalletLedger.objects.filter(idempotency_key=idempotency_key).first()
                if existing_entry:
                    return existing_entry, existing_entry.wallet

            # Acquire lock on wallet
            locked_wallet = Wallet.objects.select_for_update().get(id=wallet.id)

            balance_before = locked_wallet.balance
            balance_after = balance_before + amount

            ledger_entry = WalletLedger.objects.create(
                wallet=locked_wallet,
                entry_type='CREDIT',
                amount=amount,
                balance_before=balance_before,
                balance_after=balance_after,
                reference_type=reference_type,
                reference_id=reference_id,
                idempotency_key=idempotency_key,
                description=description
            )

            locked_wallet.balance = balance_after
            locked_wallet.save(update_fields=['balance', 'updated_at'])

            return ledger_entry, locked_wallet

    @staticmethod
    def debit_wallet(
        wallet: Wallet,
        amount: Decimal,
        reference_type: str,
        reference_id: str,
        idempotency_key: str = None,
        description: str = ""
    ) -> tuple[WalletLedger, Wallet]:
        """
        Atomically debits a wallet balance through an immutable ledger entry.
        Prevents negative balances and double-spending via row-level locks.
        """
        amount = Decimal(str(amount))
        if amount <= Decimal('0.00'):
            raise ValueError("Debit amount must be greater than zero.")

        with transaction.atomic():
            # Idempotency check
            if idempotency_key:
                existing_entry = WalletLedger.objects.filter(idempotency_key=idempotency_key).first()
                if existing_entry:
                    return existing_entry, existing_entry.wallet

            # Acquire lock on wallet
            locked_wallet = Wallet.objects.select_for_update().get(id=wallet.id)

            if locked_wallet.is_frozen:
                raise WalletFrozenException(f"Wallet {locked_wallet.wallet_number} is frozen.")

            if locked_wallet.balance < amount:
                raise InsufficientFundsException(
                    f"Insufficient balance. Available: {locked_wallet.currency} {locked_wallet.balance}, requested: {locked_wallet.currency} {amount}."
                )

            balance_before = locked_wallet.balance
            balance_after = balance_before - amount

            ledger_entry = WalletLedger.objects.create(
                wallet=locked_wallet,
                entry_type='DEBIT',
                amount=amount,
                balance_before=balance_before,
                balance_after=balance_after,
                reference_type=reference_type,
                reference_id=reference_id,
                idempotency_key=idempotency_key,
                description=description
            )

            locked_wallet.balance = balance_after
            locked_wallet.save(update_fields=['balance', 'updated_at'])

            return ledger_entry, locked_wallet

    @staticmethod
    def transfer(
        sender_wallet: Wallet,
        receiver_wallet: Wallet,
        amount: Decimal,
        reference_type: str,
        reference_id: str,
        idempotency_key: str = None,
        sender_note: str = "",
        receiver_note: str = ""
    ) -> tuple[WalletLedger, WalletLedger]:
        """
        Atomically transfers funds from sender to receiver.
        Locks both wallets in canonical order to eliminate deadlocks.
        """
        amount = Decimal(str(amount))
        if amount <= Decimal('0.00'):
            raise ValueError("Transfer amount must be greater than zero.")
        if sender_wallet.id == receiver_wallet.id:
            raise ValueError("Sender and receiver wallets cannot be identical.")

        with transaction.atomic():
            # Check idempotency
            sender_key = f"{idempotency_key}_DEBIT" if idempotency_key else None
            receiver_key = f"{idempotency_key}_CREDIT" if idempotency_key else None

            if sender_key and receiver_key:
                existing_debit = WalletLedger.objects.filter(idempotency_key=sender_key).first()
                existing_credit = WalletLedger.objects.filter(idempotency_key=receiver_key).first()
                if existing_debit and existing_credit:
                    return existing_debit, existing_credit

            # Acquire locks in deterministic UUID order to prevent deadlocks
            ids = sorted([sender_wallet.id, receiver_wallet.id])
            wallets_map = {w.id: w for w in Wallet.objects.select_for_update().filter(id__in=ids)}

            locked_sender = wallets_map[sender_wallet.id]
            locked_receiver = wallets_map[receiver_wallet.id]

            if locked_sender.is_frozen:
                raise WalletFrozenException(f"Sender wallet {locked_sender.wallet_number} is frozen.")
            if locked_receiver.is_frozen:
                raise WalletFrozenException(f"Receiver wallet {locked_receiver.wallet_number} is frozen.")

            if locked_sender.balance < amount:
                raise InsufficientFundsException(
                    f"Insufficient balance. Current balance is {locked_sender.currency} {locked_sender.balance}."
                )

            # Sender Ledger
            s_before = locked_sender.balance
            s_after = s_before - amount
            debit_entry = WalletLedger.objects.create(
                wallet=locked_sender,
                entry_type='DEBIT',
                amount=amount,
                balance_before=s_before,
                balance_after=s_after,
                reference_type=reference_type,
                reference_id=reference_id,
                idempotency_key=sender_key,
                description=sender_note
            )
            locked_sender.balance = s_after
            locked_sender.save(update_fields=['balance', 'updated_at'])

            # Receiver Ledger
            r_before = locked_receiver.balance
            r_after = r_before + amount
            credit_entry = WalletLedger.objects.create(
                wallet=locked_receiver,
                entry_type='CREDIT',
                amount=amount,
                balance_before=r_before,
                balance_after=r_after,
                reference_type=reference_type,
                reference_id=reference_id,
                idempotency_key=receiver_key,
                description=receiver_note
            )
            locked_receiver.balance = r_after
            locked_receiver.save(update_fields=['balance', 'updated_at'])

            return debit_entry, credit_entry
