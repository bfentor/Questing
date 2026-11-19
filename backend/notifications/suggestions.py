"""Daily "N new events near you" (or "for your interests") notifications."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.gis.measure import D
from django.db.models import Exists, OuterRef
from django.utils import timezone

from events.models import Attendance, Event
from profiles.models import Follow

from .models import Kind, Notification

# Events for your interests, when you share where you are: in reach for a day out.
INTEREST_REACH_KM = 50
# How far back the first run looks for someone.
FIRST_LOOK_BACK = timedelta(days=1)


def new_events_for(user, since, now):
    """Upcoming events published since `since` that the user would find in their feeds, and
    hasn't heard about another way: not their own, not from profiles they follow (those
    already notify them), not ones they've answered."""
    profile = user.profile
    followed = Follow.objects.filter(follower=profile).values("followee")
    answered = Attendance.objects.filter(event=OuterRef("pk"), profile=profile)
    return (
        Event.objects.in_feeds_of(profile)
        .filter(published_at__gt=since, published_at__lte=now, starts_at__gt=now)
        .exclude(organizer=profile)
        .exclude(organizer__in=followed)
        .exclude(Exists(answered))
    )


def suggestion_for(user, since, now):
    """(kind, count) of the notification to send, or None: events near you come first."""
    events = new_events_for(user, since, now)
    near = user.nearby_location
    if near is not None:
        count = events.filter(location__dwithin=(near, D(km=user.nearby_radius_km))).count()
        if count:
            return Kind.NEARBY_EVENTS, count
    interests = user.profile.interests.all()
    for_interests = events.filter(categories__in=interests)
    if near is not None:
        for_interests = for_interests.filter(location__dwithin=(near, D(km=INTEREST_REACH_KM)))
    count = for_interests.distinct().count()
    return (Kind.INTEREST_EVENTS, count) if count else None


def send_event_suggestions(now=None):
    """One notification each, for whoever has new events near them or for their interests.
    Returns how many were sent."""
    now = now or timezone.now()
    users = (
        get_user_model()
        .objects.filter(is_active=True, profile__removed_at__isnull=True)
        .exclude(nearby_location__isnull=True, profile__interests__isnull=True)
        .distinct()
        .select_related("profile")
    )
    sent = 0
    for user in users.iterator():
        since = user.suggestions_sent_at or now - FIRST_LOOK_BACK
        suggestion = suggestion_for(user, since, now)
        if suggestion:
            kind, count = suggestion
            # The count travels in the message; the app words it in the reader's language.
            Notification.objects.create(recipient=user, kind=kind, message=str(count))
            sent += 1
        user.suggestions_sent_at = now
        user.save(update_fields=["suggestions_sent_at"])
    return sent
