from django.utils.translation import gettext_lazy as _
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Image
from .processing import MAX_UPLOAD_BYTES, normalize


class CropSerializer(serializers.Serializer):
    """Part of a picture, as fractions of its width and height (0 to 1, from the top left)."""

    x = serializers.FloatField(min_value=0, max_value=1)
    y = serializers.FloatField(min_value=0, max_value=1)
    width = serializers.FloatField(min_value=0.01, max_value=1)
    height = serializers.FloatField(min_value=0.01, max_value=1)

    def validate(self, crop):
        # A little slack for rounding on the client.
        if crop["x"] + crop["width"] > 1.001 or crop["y"] + crop["height"] > 1.001:
            raise serializers.ValidationError(_("The crop has to stay inside the picture."))
        return {
            **crop,
            "width": min(crop["width"], 1 - crop["x"]),
            "height": min(crop["height"], 1 - crop["y"]),
        }


def absolute_url(image, context):
    request = context.get("request")
    return request.build_absolute_uri(image.file.url) if request else image.file.url


class OriginalImageSerializer(serializers.ModelSerializer):
    """The whole picture a crop was made from."""

    url = serializers.SerializerMethodField()

    class Meta:
        model = Image
        fields = ["id", "url", "width", "height"]
        read_only_fields = fields

    def get_url(self, image) -> str:
        return absolute_url(image, self.context)


class ImageSerializer(serializers.ModelSerializer):
    """How images appear inside other resources."""

    url = serializers.SerializerMethodField()

    class Meta:
        model = Image
        fields = ["id", "url", "width", "height"]
        read_only_fields = fields

    def get_url(self, image) -> str:
        return absolute_url(image, self.context)


class ImageDetailSerializer(ImageSerializer):
    """An image with what it was cropped from, for reframing it."""

    original = OriginalImageSerializer(source="source", read_only=True, allow_null=True)
    crop = CropSerializer(read_only=True, allow_null=True)

    class Meta(ImageSerializer.Meta):
        fields = [*ImageSerializer.Meta.fields, "original", "crop"]
        read_only_fields = fields


class ImageUploadSerializer(ImageSerializer):
    file = serializers.ImageField(write_only=True)

    class Meta(ImageSerializer.Meta):
        fields = [*ImageSerializer.Meta.fields, "file"]
        read_only_fields = ImageSerializer.Meta.fields

    def validate_file(self, upload):
        if upload.size > MAX_UPLOAD_BYTES:
            raise serializers.ValidationError(_("The picture is too large (at most 10 MB)."))
        return normalize(upload)

    def create(self, validated_data):
        return Image.objects.create(uploader=self.context["request"].user, **validated_data)


# The queryset depends on the request, so the schema can't infer the id's type.
@extend_schema_field(OpenApiTypes.INT)
class OwnImageField(serializers.PrimaryKeyRelatedField):
    """Refers to an image the requesting user uploaded."""

    def get_queryset(self):
        return Image.objects.filter(uploader=self.context["request"].user)
