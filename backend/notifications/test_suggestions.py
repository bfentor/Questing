from datetime import timedelta

from django.contrib.gis.geos import Point
from django.utils import timezone

from events.models import Attendance, Category
from notifications.models import Kind, Notification
from notifications.push import link, render
from notifications.suggestions import send_event_suggestions
from profiles.models import Follow

# (lng, lat)
LAHTI = (25.66, 60.98)
HELSINKI = (24.94, 60.17)


def suggestions_for(user):
    return list(
        Notification.objects.filter(
            recipient=user, kind__in=[Kind.NEARBY_EVENTS, Kind.INTEREST_EVENTS]
        ).values_list("kind", "message")
    )


def test_new_events_near_you(make_user, make_event):
    me, host, friend = make_user(), make_user().profile, make_user().profile
    me.nearby_location = Point(*LAHTI, srid=4326)
    me.suggestions_sent_at = timezone.now() - timedelta(hours=1)
    me.save()
    Follow.objects.create(follower=me.profile, followee=friend)
    just_now = timezone.now() - timedelta(minutes=5)

    def event(organizer, at, **kw):
        return make_event(organizer, at=at, published_at=just_now, **kw)

    event(host, LAHTI)
    event(host, (25.67, 60.99))  # About a kilometre away.
    event(host, HELSINKI)  # Too far.
    event(friend, LAHTI)  # Following them already tells you.
    event(me.profile, LAHTI)  # Your own.
    answered = event(host, LAHTI)
    Attendance.objects.create(event=answered, profile=me.profile, status="interested")
    make_event(host, at=LAHTI, published_at=timezone.now() - timedelta(days=2))  # Old news.

    assert send_event_suggestions() == 1
    assert suggestions_for(me) == [("nearby_events", "2")]
    # Each event is counted once.
    assert send_event_suggestions() == 0


def test_new_events_for_your_interests(make_user, make_event):
    fan, nobody, host = make_user(), make_user(), make_user().profile
    games = Category.objects.get(slug="games")
    fan.profile.interests.add(games)
    just_now = timezone.now() - timedelta(minutes=5)
    for at in (HELSINKI, LAHTI):
        make_event(host, at=at, published_at=just_now).categories.add(games)
    make_event(host, at=LAHTI, published_at=just_now)  # Not about games.

    assert send_event_suggestions() == 1
    assert suggestions_for(fan) == [("interest_events", "2")]
    # Without interests or a location, there's nothing to suggest.
    assert suggestions_for(nobody) == []


def test_sharing_where_you_are_is_rounded_and_can_be_cleared(auth_client, user):
    response = auth_client.patch(
        "/api/me/settings/",
        {"nearby_location": {"lat": 60.98321, "lng": 25.65679}, "nearby_radius_km": 25},
        format="json",
    )
    assert response.json()["nearby_location"] == {"lat": 60.98, "lng": 25.66}
    assert response.json()["nearby_radius_km"] == 25
    user.refresh_from_db()
    # Counting starts now, not with everything already published.
    assert user.suggestions_sent_at is not None

    response = auth_client.patch("/api/me/settings/", {"nearby_location": None}, format="json")
    assert response.json()["nearby_location"] is None
    assert auth_client.get("/api/me/export/").json()["account"]["nearby_events"] is None


def test_suggestion_push_wording_and_link(user):
    near = Notification(recipient=user, kind=Kind.NEARBY_EVENTS, message="5")
    assert render(near) == ("Questing", "5 new events near you")
    assert link(near) == "/nearby"
    one = Notification(recipient=user, kind=Kind.INTEREST_EVENTS, message="1")
    assert render(one) == ("Questing", "1 new event for your interests")
    assert link(one) == "/upcoming?order=forYou"
