from django.conf import settings
from rest_framework import serializers

from events.fields import LatLngField
from events.models import Event
from profiles.serializers import ProfileSummarySerializer

from .models import Kind, Notification


class NotificationEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ["id", "title", "starts_at"]
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    actor = ProfileSummarySerializer(read_only=True, allow_null=True)
    event = NotificationEventSerializer(read_only=True, allow_null=True)
    read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "kind", "actor", "event", "post", "message", "created_at", "read"]
        read_only_fields = fields

    def get_read(self, notification) -> bool:
        return notification.read_at is not None


class MarkReadSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Notifications to mark read; all of them when left out.",
    )


class UnreadCountSerializer(serializers.Serializer):
    unread = serializers.IntegerField()


class PushDeviceSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=255, help_text="The device's Expo push token.")


class AccountSettingsSerializer(serializers.Serializer):
    email = serializers.EmailField(
        read_only=True, help_text="Change it through allauth: /_allauth/app/v1/account/email."
    )
    language = serializers.ChoiceField(choices=settings.LANGUAGES, required=False)
    birth_date = serializers.DateField(
        required=False, help_text="Can only be added when missing (older accounts)."
    )
    terms_version = serializers.CharField(read_only=True, help_text="The version you accepted.")
    current_terms_version = serializers.CharField(read_only=True)
    email_digest = serializers.BooleanField(
        required=False, help_text="A weekly email of upcoming events (off unless turned on)."
    )
    onboarded = serializers.BooleanField(
        required=False, help_text="Whether the first-run steps are done; set it once they are."
    )
    nearby_location = LatLngField(
        allow_null=True,
        required=False,
        help_text="Where to look for new events near you, for a daily notification (stored "
        "rounded to about a kilometre); null turns it off.",
    )
    nearby_radius_km = serializers.IntegerField(min_value=1, max_value=100, required=False)
    push = serializers.DictField(
        child=serializers.BooleanField(),
        required=False,
        help_text="Push on (true) or off (false), by notification kind. Missing kinds are on.",
    )

    def validate_push(self, value):
        unknown = set(value) - set(Kind.values)
        if unknown:
            raise serializers.ValidationError(f"Unknown kinds: {', '.join(sorted(unknown))}")
        return value
