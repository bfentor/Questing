import uuid
from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image as PILImage
from PIL import ImageOps, ImageSequence

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_SIDE = 2048
# Animations (GIFs) are kept smaller: every frame counts.
MAX_ANIMATED_SIDE = 800
MAX_FRAMES = 300


def normalize(upload) -> ContentFile:
    """Re-encode an uploaded picture as WebP, at most MAX_SIDE pixels on its longest side.

    Rotates it upright first, then drops all metadata: a phone photo's EXIF can
    contain where it was taken. Animations (GIFs, animated WebPs) stay animated.
    """
    with PILImage.open(upload) as source:
        if getattr(source, "is_animated", False):
            return _animated(source)
        image = ImageOps.exif_transpose(source)
        image.thumbnail((MAX_SIDE, MAX_SIDE))
        image = image.convert("RGBA" if image.mode in ("RGBA", "LA", "P") else "RGB")
        buffer = BytesIO()
        image.save(buffer, format="WEBP", quality=85)
    return ContentFile(buffer.getvalue(), name=f"{uuid.uuid4().hex}.webp")


def _animated(source) -> ContentFile:
    """An animated WebP of an animation's frames (the first MAX_FRAMES), each at most
    MAX_ANIMATED_SIDE pixels, with their timing and looping."""
    frames, durations = [], []
    for frame in ImageSequence.Iterator(source):
        if len(frames) == MAX_FRAMES:
            break
        durations.append(frame.info.get("duration") or 100)
        still = frame.convert("RGBA")
        still.thumbnail((MAX_ANIMATED_SIDE, MAX_ANIMATED_SIDE))
        frames.append(still)
    buffer = BytesIO()
    frames[0].save(
        buffer,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=source.info.get("loop", 0),
        quality=80,
    )
    return ContentFile(buffer.getvalue(), name=f"{uuid.uuid4().hex}.webp")


def crop(source, x, y, width, height) -> ContentFile:
    """The part of a stored picture given as fractions of its size, re-encoded like an upload."""
    with PILImage.open(source) as image:
        image.load()
    box = (
        round(x * image.width),
        round(y * image.height),
        round((x + width) * image.width),
        round((y + height) * image.height),
    )
    buffer = BytesIO()
    image.crop(box).save(buffer, format="PNG")
    buffer.seek(0)
    return normalize(buffer)
