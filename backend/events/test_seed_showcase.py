import pytest
from django.contrib.gis.geos import Point
from django.core.management import call_command
from django.core.management.base import CommandError

from accounts.models import User
from events.models import Attendance, Event
from notifications.models import Kind, Notification
from posts.models import Post, PostImage
from profiles.models import Profile


@pytest.fixture(autouse=True)
def debug_with_media_in_tmp(settings, tmp_path):
    settings.DEBUG = True
    settings.MEDIA_ROOT = tmp_path


@pytest.mark.django_db
def test_showcase_covers_the_app_from_the_demo_accounts_view():
    call_command("seed_showcase")

    demo = User.objects.get(email="demo@sidequest.test")
    kinds = set(Notification.objects.filter(recipient=demo).values_list("kind", flat=True))
    # Every kind except follow requests, which only private profiles get.
    assert kinds == set(Kind.values) - {Kind.FOLLOW_REQUEST}

    kayak = Event.objects.get(title="Evening kayak tour")
    statuses = list(kayak.attendances.values_list("status", flat=True))
    assert statuses.count(Attendance.Status.WAITLISTED) == 2

    feed = Post.objects.in_feeds_of(demo.profile).following_feed_for(demo.profile)
    assert feed.filter(link_preview__isnull=False).exists()
    assert not feed.filter(author__handle="loud_larry").exists()  # muted
    assert PostImage.objects.filter(post__author__handle="student_union").count() == 4
    assert Event.objects.filter(published_at__isnull=True, organizer__handle="outdoor_club")


@pytest.mark.django_db
def test_lahti_events_fill_the_nearby_radii_differently():
    call_command("seed_showcase")

    centre = Point(25.6612, 60.9827, srid=4326)
    near = {km: Event.objects.near(centre, km).count() for km in (2, 5, 10, 25)}
    assert 0 < near[2] < near[5] < near[10] < near[25]
    assert not Event.objects.near(centre, 25).filter(title="River paddle in Heinola").exists()


@pytest.mark.django_db
def test_showcase_runs_once():
    call_command("seed_showcase")
    call_command("seed_showcase")
    assert Profile.objects.filter(handle="aino").count() == 1


@pytest.mark.django_db
def test_showcase_needs_an_existing_viewer():
    with pytest.raises(CommandError):
        call_command("seed_showcase", viewer="nobody@example.com")
