"""Who may see whose content. Every list and detail endpoint filters through here."""

from django.db.models import Q

from profiles.models import Follow, Profile

from .models import Block, Mute


def viewer_profile(request):
    user = request.user
    return user.profile if user.is_authenticated else None


def hidden_profiles(viewer: Profile | None):
    """Profiles the viewer has blocked or been blocked by."""
    if viewer is None:
        return Profile.objects.none()
    return Profile.objects.filter(
        Q(pk__in=Block.objects.filter(blocker=viewer).values("blocked"))
        | Q(pk__in=Block.objects.filter(blocked=viewer).values("blocker"))
    ).values("pk")


def private_profiles(viewer: Profile | None):
    """Private profiles the viewer doesn't follow, whose content they may not see."""
    return Profile.objects.private_to(viewer).values("pk")


def muted_profiles(viewer: Profile | None):
    if viewer is None:
        return Profile.objects.none()
    return Mute.objects.filter(muter=viewer).values("muted")


def is_blocked_by(viewer: Profile | None, profile: Profile):
    """Whether `profile` has blocked the viewer (so the viewer may not see it)."""
    return viewer is not None and Block.objects.filter(blocker=profile, blocked=viewer).exists()


def shares_attendance(viewer: Profile | None, prefix: str = ""):
    """Profiles whose RSVPs the viewer may see: those shared with everyone, followers-only
    ones the viewer follows, and the viewer's own. `prefix` reaches them through a relation,
    e.g. "profile__" from attendances."""
    visibility = Profile.AttendanceVisibility
    everyone = Q(**{f"{prefix}attendance_visibility": visibility.EVERYONE})
    if viewer is None:
        return everyone
    followed = Follow.objects.filter(follower=viewer).values("followee")
    followers = Q(
        **{f"{prefix}attendance_visibility": visibility.FOLLOWERS, f"{prefix}pk__in": followed}
    )
    return everyone | followers | Q(**{f"{prefix}pk": viewer.pk})


def shares_past_attendance(viewer: Profile | None, prefix: str = ""):
    """Profiles who stay in who went once an event is over (the viewer always sees their own)."""
    shown = Q(**{f"{prefix}show_past_attendance": True})
    return shown | Q(**{f"{prefix}pk": viewer.pk}) if viewer else shown
