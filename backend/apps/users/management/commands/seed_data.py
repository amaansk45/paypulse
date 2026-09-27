from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.users.models import User, Profile
from apps.wallets.services import WalletService
from apps.payments.services import PaymentService
from apps.qrcodes.services import QRService
from apps.notifications.services import send_notification


class Command(BaseCommand):
    help = 'Seeds initial users, wallets, QR codes, transactions, and sample platform data.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding PayPulse fintech test data..."))

        # 1. Create Admin
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@paypulse.com',
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
                'is_verified': True,
                'account_status': 'ACTIVE',
                'phone_number': '+919999900000'
            }
        )
        admin_user.set_password('Admin@12345')
        admin_user.set_pin('1234')
        admin_user.save()
        admin_profile = admin_user.profile
        admin_profile.full_name = "System Administrator"
        admin_profile.kyc_status = "VERIFIED"
        admin_profile.save()
        self.stdout.write(self.style.SUCCESS("[OK] Admin user created (username: admin, pass: Admin@12345, PIN: 1234)"))

        # 2. Test Users
        users_meta = [
            {
                'username': 'rahul',
                'email': 'rahul@example.com',
                'phone': '+919876543210',
                'full_name': 'Rahul Sharma',
                'initial_funds': Decimal('12500.00'),
                'city': 'Mumbai'
            },
            {
                'username': 'priya',
                'email': 'priya@example.com',
                'phone': '+919876543211',
                'full_name': 'Priya Patel',
                'initial_funds': Decimal('8400.00'),
                'city': 'Bengaluru'
            },
            {
                'username': 'vikram',
                'email': 'vikram@example.com',
                'phone': '+919876543212',
                'full_name': 'Vikram Singh',
                'initial_funds': Decimal('4200.00'),
                'city': 'New Delhi'
            }
        ]

        created_users = {}
        for u in users_meta:
            user, u_created = User.objects.get_or_create(
                username=u['username'],
                defaults={
                    'email': u['email'],
                    'phone_number': u['phone'],
                    'role': 'USER',
                    'is_verified': True,
                    'account_status': 'ACTIVE'
                }
            )
            user.set_password('Password@123')
            user.set_pin('1234')
            user.save()

            prof = user.profile
            prof.full_name = u['full_name']
            prof.city = u['city']
            prof.kyc_status = 'VERIFIED'
            prof.kyc_document_type = 'PASSPORT'
            prof.kyc_document_number = f"PASS-{u['username'].upper()}8821"
            prof.save()

            # Ensure wallet exists and credit initial test funds
            wallet = WalletService.get_or_create_wallet(user)
            if wallet.balance == Decimal('0.00'):
                WalletService.credit_wallet(
                    wallet=wallet,
                    amount=u['initial_funds'],
                    reference_type='ADD_MONEY',
                    reference_id=f"SEED_{user.username.upper()}",
                    description="Initial seed sandbox wallet deposit"
                )

            # Generate personal QR
            QRService.get_or_create_personal_qr(user)

            created_users[u['username']] = user
            self.stdout.write(self.style.SUCCESS(f"[OK] User '{user.username}' seeded (pass: Password@123, PIN: 1234, balance: Rs {wallet.balance})"))

        # 3. Seed Transactions
        u_rahul = created_users['rahul']
        u_priya = created_users['priya']
        u_vikram = created_users['vikram']

        # Rahul sends Rs 500 to Priya
        try:
            PaymentService.send_money(
                sender=u_rahul,
                recipient_identifier=u_priya.username,
                amount=Decimal('500.00'),
                note="Dinner split from last night",
                pin='1234'
            )
            self.stdout.write(self.style.SUCCESS("[OK] Seeded Send Money: Rahul -> Priya (Rs 500)"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Note on send money: {str(e)}"))

        # Priya creates payment request to Rahul for Rs 1,200
        try:
            PaymentService.create_payment_request(
                requester=u_priya,
                payer_identifier=u_rahul.username,
                amount=Decimal('1200.00'),
                note="Flight tickets reimbursement"
            )
            self.stdout.write(self.style.SUCCESS("[OK] Seeded Payment Request: Priya -> Rahul (Rs 1,200)"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Note on request: {str(e)}"))

        # Vikram sends Rs 250 to Rahul via QR
        try:
            rahul_qr = QRService.get_or_create_personal_qr(u_rahul)
            QRService.pay_via_qr(
                payer=u_vikram,
                raw_identifier=rahul_qr.payment_identifier,
                amount=Decimal('250.00'),
                pin='1234',
                note="Coffee at Blue Tokai"
            )
            self.stdout.write(self.style.SUCCESS("[OK] Seeded QR Payment: Vikram -> Rahul (Rs 250)"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Note on QR pay: {str(e)}"))

        self.stdout.write(self.style.SUCCESS("\n==> Database seeding completed successfully! All accounts and ledgers are active."))

