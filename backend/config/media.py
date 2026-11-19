"""Serves uploaded files when they're stored on the API's own disk (no object storage).

That's development and the staging server; nothing else in front of the API serves them.
Stored files never change (a new upload gets a new name), so browsers may keep them a while.
"""

from django.conf import settings
from django.views.static import serve

CACHE_SECONDS = 24 * 60 * 60


def media(request, path):
    response = serve(request, path, document_root=settings.MEDIA_ROOT)
    response["Cache-Control"] = f"public, max-age={CACHE_SECONDS}"
    return response
