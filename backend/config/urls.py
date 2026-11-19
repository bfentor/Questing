from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from .health import healthz
from .media import media

api_patterns = [
    path("", include("accounts.urls")),
    path("", include("images.urls")),
    path("", include("moderation.urls")),
    path("", include("notifications.urls")),
    path("", include("profiles.urls")),
    path("", include("events.urls")),
    path("", include("posts.urls")),
    path("", include("search.urls")),
    path("", include("students.urls")),
    path("", include("flags.urls")),
    path("feeds/", include("feeds.urls")),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]

urlpatterns = [
    path("healthz", healthz),
    path("admin/", admin.site.urls),
    path("accounts/", include("allauth.urls")),
    path("_allauth/", include("allauth.headless.urls")),
    path("api/", include(api_patterns)),
]

if settings.SERVE_MEDIA:
    urlpatterns += [re_path(rf"^{settings.MEDIA_URL.lstrip('/')}(?P<path>.+)$", media)]
