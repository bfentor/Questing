"""Making and removing the sample data: made-up people, organizations, events and posts.

Every profile the generator makes is marked with a SampleProfile; everything else it makes
belongs to one of them, so `delete_sample_data` finds all of it (and nothing real) through them.
Dates are relative to when it's generated: generating again moves everything back around today.
"""

from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from events.models import Event
from images.models import Image
from moderation.models import Report
from posts.models import LinkPreview, Post
from profiles.models import Profile

from .models import SampleProfile

# The account sample data is seen through, unless another is given.
DEMO_EMAIL = "demo@sidequest.test"


def sensible_start(now, hours, hour=None):
    """`hours` from `now`, at a time people would actually meet.

    With `hour`, at that hour on the same day (the next or previous day if that would put an
    upcoming event in the past, or a past one in the future). Otherwise on a quarter hour, and
    moved out of the night to 18:00 the same day, as long as that keeps an upcoming event
    upcoming and a past one over. Events that are on right now stay put.
    """
    if hour is not None and not -6 < hours <= 0:
        local = timezone.localtime(now + timedelta(hours=hours))
        start = local.replace(hour=hour, minute=0, second=0, microsecond=0)
        if hours > 0 and start < now + timedelta(hours=1):
            start += timedelta(days=1)
        elif hours < 0 and start > now - timedelta(hours=8):
            start -= timedelta(days=1)
        return start
    local = timezone.localtime(now + timedelta(hours=hours))
    local = local.replace(minute=local.minute - local.minute % 15, second=0, microsecond=0)
    if -6 < hours <= 0 or 8 <= local.hour < 22:
        return local
    evening = local.replace(hour=18, minute=0)
    if (hours > 0 and evening > now + timedelta(hours=1)) or (
        hours < 0 and evening < now - timedelta(hours=8)
    ):
        return evening
    return local


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
    # Reports point at what they're about loosely, so they'd outlive it.
    Report.objects.filter(reporter__in=users).delete()
    users.delete()
    # Organizations have no account of their own.
    profiles.delete()
    Image.orphans().filter(pk__in=pictures).delete()
    LinkPreview.objects.filter(url__in=LINK_PREVIEWS).delete()
    return count
