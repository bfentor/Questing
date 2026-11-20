from datetime import datetime, timedelta

import pytest
from django.contrib.gis.geos import Point
from django.core.management import call_command
from django.core.management.base import CommandError
from django.urls import reverse
from django.utils import timezone

from accounts.models import User
from events.attendance import rsvp
from events.models import Attendance, Event
from images.models import Image
from moderation.models import Report
from notifications.models import Kind, Notification
from posts.models import LinkPreview, Post, PostImage, PostLike
from profiles.models import Follow, Profile
from students.models import StudentStatus

from . import services
from .models import SampleProfile


@pytest.fixture(autouse=True)
def sample_data_with_media_in_tmp(settings, tmp_path):
    settings.SAMPLE_DATA_ENABLED = True
    settings.MEDIA_ROOT = tmp_path


@pytest.fixture
def superuser(db, settings):
    # Admin pages link their stylesheets, which aren't collected for tests.
    settings.STORAGES = {
        **settings.STORAGES,
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
    return User.objects.create_superuser(email="admin@example.com", password="x")


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

    # A town's worth of people, and what only organizers and moderators see.
    assert Profile.objects.filter(kind=Profile.Kind.PERSON).count() >= 40
    assert Profile.objects.filter(kind=Profile.Kind.ORGANIZATION).count() >= 12
    outdoor = Profile.objects.get(handle="outdoor_club")
    assert outdoor.calendar_sources.get().events.count() == 3
    assert outdoor.verification_requests.filter(status="pending").exists()
    assert outdoor.invitations.count() == 2
    assert Follow.objects.filter(followee=outdoor).count() >= 20
    assert Report.objects.filter(status="open").exists()
    assert StudentStatus.objects.count() >= 10


@pytest.mark.parametrize(
    "now, hours, expected, hour",
    [
        ("2026-11-20 21:53", 5, "2026-11-21 18:00", None),  # out of the night, still upcoming
        ("2026-11-20 13:07", 5, "2026-11-20 18:00", None),  # on a quarter hour
        ("2026-11-20 13:07", 2, "2026-11-20 15:00", None),
        ("2026-11-20 23:40", -1, "2026-11-20 22:30", None),  # happening now: stays put
        ("2026-11-20 09:00", -24 * 8 - 6, "2026-11-12 18:00", None),  # past, and stays past
        ("2026-11-20 21:53", 20, "2026-11-21 07:00", 7),  # a morning run in the morning
        ("2026-11-21 00:45", -23, "2026-11-19 19:00", 19),  # last night's would still be on
        ("2026-11-20 08:30", 1, "2026-11-21 08:00", 8),  # this morning's is too soon
    ],
)
def test_sample_events_start_at_sensible_times(now, hours, expected, hour):
    now = timezone.make_aware(datetime.fromisoformat(now))
    start = services.sensible_start(now, hours, hour)
    assert start.strftime("%Y-%m-%d %H:%M") == expected


@pytest.mark.django_db
def test_lahti_events_fill_the_nearby_radii_differently():
    call_command("seed_showcase")

    centre = Point(25.6612, 60.9827, srid=4326)
    near = {km: Event.objects.near(centre, km).count() for km in (2, 5, 10, 25)}
    assert 0 < near[2] < near[5] < near[10] < near[25]
    assert not Event.objects.near(centre, 25).filter(title="River paddle in Heinola").exists()


@pytest.mark.django_db
def test_every_profile_it_makes_is_marked():
    call_command("seed_showcase")

    assert not Profile.objects.filter(sample__isnull=True).exists()


@pytest.mark.django_db
def test_events_are_in_the_near_past_or_the_future():
    services.generate()

    now = timezone.now()
    events = Event.objects.all()
    assert events.filter(starts_at__lt=now).exists()
    assert events.filter(starts_at__gt=now + timedelta(days=7)).exists()
    assert not events.filter(starts_at__lt=now - timedelta(days=14)).exists()
    assert not events.filter(starts_at__gt=now + timedelta(days=60)).exists()


@pytest.mark.django_db
def test_seeding_again_leaves_it_unless_fresh():
    call_command("seed_showcase")
    first = set(Event.objects.values_list("pk", flat=True))

    call_command("seed_showcase")
    assert set(Event.objects.values_list("pk", flat=True)) == first

    call_command("seed_showcase", fresh=True)
    assert Profile.objects.filter(handle="aino").count() == 1
    assert not Event.objects.filter(pk__in=first).exists()


@pytest.mark.django_db
def test_showcase_needs_an_existing_viewer():
    with pytest.raises(CommandError):
        call_command("seed_showcase", viewer="nobody@example.com")


@pytest.mark.django_db
def test_generating_is_refused_when_switched_off(settings):
    settings.SAMPLE_DATA_ENABLED = False
    with pytest.raises(CommandError):
        call_command("seed_showcase")
    assert not Profile.objects.exists()


@pytest.mark.django_db
def test_deleting_removes_all_of_it_and_nothing_real(make_user, make_event):
    real = make_user().profile
    real_event = make_event(real, title="A real event")
    services.generate()
    gala = Event.objects.get(title="Winter Gala")
    # A real person who joined in with the sample data.
    rsvp(gala, real, Attendance.Status.GOING)
    Follow.objects.create(follower=real, followee=Profile.objects.get(handle="aino"))
    Post.objects.create(author=real, body="A real post")

    call_command("delete_sample_data")

    assert list(Profile.objects.all()) == [real]
    assert list(Event.objects.all()) == [real_event]
    assert list(Post.objects.values_list("body", flat=True)) == ["A real post"]
    assert not User.objects.filter(email__endswith="@sidequest.test").exists()
    assert not Image.objects.exists()
    assert not LinkPreview.objects.exists()
    assert not PostLike.objects.exists()
    assert not Follow.objects.exists()
    assert not SampleProfile.objects.exists()


@pytest.mark.django_db
def test_the_admin_page_generates_and_deletes(client, superuser):
    client.force_login(superuser)
    page = reverse("admin:sampledata_sampleprofile_changelist")

    assert "no sample data" in client.get(page).content.decode()

    response = client.post(reverse("admin:sampledata_generate"))
    assert response.status_code == 302
    assert Event.objects.filter(title="Winter Gala").exists()
    assert "Delete all" in client.get(page).content.decode()

    client.post(reverse("admin:sampledata_delete"))
    assert not Event.objects.exists()


@pytest.mark.django_db
def test_only_superusers_can_use_the_admin_page(client):
    staff = User.objects.create_user(email="staff@example.com", password="x", is_staff=True)
    client.force_login(staff)

    response = client.post(reverse("admin:sampledata_generate"))

    assert response.status_code == 403
    assert not Profile.objects.exclude(pk=staff.profile.pk).exists()


@pytest.mark.django_db
def test_a_get_does_nothing(client, superuser):
    client.force_login(superuser)

    client.get(reverse("admin:sampledata_generate"))

    assert not Event.objects.exists()
