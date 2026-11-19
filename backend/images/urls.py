from django.urls import path

from .views import ImageCropView, ImageDetailView, ImageUploadView

urlpatterns = [
    path("images/", ImageUploadView.as_view(), name="image-upload"),
    path("images/<int:pk>/", ImageDetailView.as_view(), name="image-detail"),
    path("images/<int:pk>/crop/", ImageCropView.as_view(), name="image-crop"),
]
