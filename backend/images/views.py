from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Image
from .processing import crop
from .serializers import CropSerializer, ImageDetailSerializer, ImageUploadSerializer


class ImageUploadView(generics.CreateAPIView):
    """Upload a picture, to attach to a profile, event or post by its id."""

    serializer_class = ImageUploadSerializer
    parser_classes = [MultiPartParser]
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "uploads"


class ImageDetailView(generics.RetrieveAPIView):
    """A picture, with the original it was cropped from (if it's a crop)."""

    queryset = Image.objects.select_related("source")
    serializer_class = ImageDetailSerializer
    permission_classes = [permissions.IsAuthenticated]


class ImageCropView(APIView):
    """Make a new picture from part of an uploaded one, e.g. to frame a profile picture.

    Cropping a crop starts again from its original, so a picture can be reframed (or zoomed
    back out) any number of times without losing quality.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "uploads"

    @extend_schema(request=CropSerializer, responses={201: ImageDetailSerializer})
    def post(self, request, pk):
        image = generics.get_object_or_404(Image.objects.select_related("source"), pk=pk)
        source = image.source or image
        serializer = CropSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rect = serializer.validated_data
        with source.file.open("rb") as file:
            cropped = crop(file, **rect)
        new = Image.objects.create(uploader=request.user, file=cropped, source=source, crop=rect)
        return Response(
            ImageDetailSerializer(new, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
