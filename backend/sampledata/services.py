"""Making and removing the sample data: made-up people, organizations, events and posts.

Every profile the generator makes is marked with a SampleProfile; everything else it makes
belongs to one of them, so `delete_sample_data` finds all of it (and nothing real) through them.
Dates are relative to when it's generated: generating again moves everything back around today.
"""

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction

from accounts.models import User
from events.models import Event
from images.models import Image
from posts.models import LinkPreview, Post
from profiles.models import Profile

from .models import SampleProfile

# The account sample data is seen through, unless another is given.
DEMO_EMAIL = "demo@sidequest.test"


def check_enabled():
    if not settings.SAMPLE_DATA_ENABLED:
        raise ImproperlyConfigured(
            "Sample data is switched off here (set SAMPLE_DATA_ENABLED=true to allow it)."
        )


def mark(*profiles):
    SampleProfile.objects.bulk_create(
        [SampleProfile(profile=profile) for profile in profiles], ignore_conflicts=True
    )


def sample_profiles():
    return Profile.objects.filter(sample__isnull=False)


def exists():
    return SampleProfile.objects.exists()


def summary():
    """How much sample data there is, for the admin page."""
    profiles = sample_profiles()
    return {
        "people": profiles.filter(kind=Profile.Kind.PERSON).count(),
        "organizations": profiles.filter(kind=Profile.Kind.ORGANIZATION).count(),
        "events": Event.objects.filter(organizer__in=profiles).count(),
        "posts": Post.objects.filter(author__in=profiles).count(),
    }


@transaction.atomic
def generate(viewer_email=DEMO_EMAIL):
    """Replace any sample data with a fresh set, dated from now.

    It's set up around `viewer_email`'s account (made if it's the demo account): its feeds,
    notifications and organizations all have something in them.
    """
    from .demo import seed_demo
    from .showcase import Showcase

    check_enabled()
    delete_sample_data()
    seed_demo()
    viewer = User.objects.filter(email=viewer_email).first()
    if viewer is None:
        raise User.DoesNotExist(f"No account with the email {viewer_email}.")
    Showcase(viewer).build()


@transaction.atomic
def delete_sample_data():
    """Delete every sample profile and everything that belongs to them. Returns how many."""
    from .showcase import LINK_PREVIEWS

    profiles = sample_profiles()
    users = User.objects.filter(profile__in=profiles)
    # Pictures are kept when their uploader goes, so remove the ones only sample data used.
    pictures = list(Image.objects.filter(uploader__in=users).values_list("pk", flat=True))
    count = profiles.count()
    users.delete()
    # Organizations have no account of their own.
    profiles.delete()
    Image.orphans().filter(pk__in=pictures).delete()
    LinkPreview.objects.filter(url__in=LINK_PREVIEWS).delete()
    return count
