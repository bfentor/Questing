from django.utils.translation import gettext as _
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from events.models import Category
from images.serializers import ImageSerializer, OwnImageField
from students.serializers import UniversitySerializer
from students.services import current_university

from .models import Profile


class ProfileSummarySerializer(serializers.ModelSerializer):
    """Compact profile representation embedded in events and posts."""

    avatar = ImageSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Profile
        fields = ["handle", "display_name", "kind", "avatar", "verified"]
        read_only_fields = fields


class ProfileSerializer(serializers.ModelSerializer):
    """Full profile. Expects a queryset annotated with `with_social_stats`."""

    avatar = ImageSerializer(read_only=True, allow_null=True)
    avatar_id = OwnImageField(
        source="avatar",
        write_only=True,
        required=False,
        allow_null=True,
        help_text="An image uploaded with POST /api/images/.",
    )
    cover = ImageSerializer(read_only=True, allow_null=True)
    cover_id = OwnImageField(
        source="cover",
        write_only=True,
        required=False,
        allow_null=True,
        help_text="An image uploaded with POST /api/images/.",
    )
    study_year = serializers.IntegerField(
        min_value=1, max_value=10, allow_null=True, required=False
    )
    interests = serializers.SlugRelatedField(
        slug_field="slug",
        many=True,
        queryset=Category.objects.all(),
        required=False,
        help_text="Category slugs (GET /api/categories/).",
    )
    follower_count = serializers.IntegerField(read_only=True)
    following_count = serializers.IntegerField(read_only=True)
    student_of = serializers.SerializerMethodField(
        help_text="The university this person is a verified student of."
    )
    is_followed = serializers.BooleanField(read_only=True)
    is_requested = serializers.BooleanField(
        read_only=True, help_text="The viewer asked to follow this private profile."
    )
    is_blocked = serializers.BooleanField(read_only=True)
    is_muted = serializers.BooleanField(read_only=True)

    @extend_schema_field(UniversitySerializer(allow_null=True))
    def get_student_of(self, profile):
        university = current_university(profile.user) if profile.user_id else None
        return UniversitySerializer(university).data if university else None

    class Meta:
        model = Profile
        fields = [
            "handle",
            "display_name",
            "kind",
            "bio",
            "avatar",
            "avatar_id",
            "cover",
            "cover_id",
            "pronouns",
            "gender",
            "gender_other",
            "show_gender",
            "university",
            "faculty",
            "study_year",
            "website",
            "instagram",
            "verified",
            "is_private",
            "hide_followers",
            "hide_attendance",
            "interests",
            "created_at",
            "follower_count",
            "following_count",
            "student_of",
            "is_followed",
            "is_requested",
            "is_blocked",
            "is_muted",
        ]
        read_only_fields = ["kind", "created_at", "verified"]
        extra_kwargs = {
            "gender": {
                "help_text": "People only. Left out unless show_gender, or it's your own profile."
            },
            "gender_other": {"help_text": "Their own words, when gender is other; else empty."},
        }

    def validate(self, attrs):
        gender = attrs.get("gender", self.instance.gender if self.instance else "")
        if gender and self.instance and self.instance.kind != Profile.Kind.PERSON:
            raise serializers.ValidationError({"gender": _("Only people have a gender.")})
        # Their own words only go with Other.
        if gender != Profile.Gender.OTHER and ("gender" in attrs or "gender_other" in attrs):
            attrs["gender_other"] = ""
        return attrs

    def to_representation(self, profile):
        data = super().to_representation(profile)
        request = self.context.get("request")
        own = bool(request and profile.user_id and profile.user_id == request.user.id)
        if not (own or profile.show_gender):
            data["gender"] = ""
            data["gender_other"] = ""
        return data


class FollowStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=["following", "requested", "none"],
        help_text="requested: the profile is private and has to accept you first.",
    )


class CurrentProfileDefault:
    """Field default resolving to the requesting user's own profile."""

    requires_context = True

    def __call__(self, serializer_field):
        return serializer_field.context["request"].user.profile


class ActingProfileField(serializers.SlugRelatedField):
    """Write-only handle of a profile the requesting user may act as.

    Used to publish as yourself (the default) or as an organization you
    belong to.
    """

    def __init__(self, **kwargs):
        kwargs.setdefault("default", CurrentProfileDefault())
        super().__init__(slug_field="handle", write_only=True, **kwargs)

    def get_queryset(self):
        return Profile.objects.manageable_by(self.context["request"].user)
