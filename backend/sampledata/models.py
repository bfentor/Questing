from django.db import models

from profiles.models import Profile


class SampleProfile(models.Model):
    """Marks a person or organization made up by the sample data generator.

    Everything else the generator makes (events, posts, RSVPs, notifications…) belongs to one of
    these profiles, so deleting them deletes all of it, and nothing real.
    """

    profile = models.OneToOneField(
        Profile, on_delete=models.CASCADE, primary_key=True, related_name="sample"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "sample profile"
        ordering = ["profile__kind", "profile__handle"]

    def __str__(self):
        return f"@{self.profile.handle}"
