from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.users.models import User
from .models import Wallet


@receiver(post_save, sender=User)
def create_user_wallet(sender, instance, created, **kwargs):
    """
    Ensures every newly created user gets an initialized wallet with unique wallet number.
    """
    if created:
        Wallet.objects.create(
            user=instance,
            wallet_number=Wallet.generate_wallet_number()
        )
