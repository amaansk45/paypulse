from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, Profile


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """
    Ensures every user automatically has an associated Profile upon creation.
    """
    if created:
        Profile.objects.create(user=instance, full_name=instance.username)
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
