import os
from datetime import timedelta
from io import BytesIO, StringIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.utils import timezone
from PIL import Image as PILImage

from images.models import Image


@pytest.fixture(autouse=True)
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


def photo(size=(3000, 1500), gps=True, name="photo.jpg"):
    """A JPEG like a phone's, with an EXIF GPS position."""
    image = PILImage.new("RGB", size, "teal")
    exif = PILImage.Exif()
    if gps:
        exif[0x8825] = {1: "N", 2: (61.0, 3.0, 54.0), 3: "E", 4: (28.0, 5.0, 38.0)}
    buffer = BytesIO()
    image.save(buffer, format="JPEG", exif=exif)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")


def upload(client, file):
    return client.post("/api/images/", {"file": file}, format="multipart")


def test_upload_is_resized_reencoded_and_stripped(auth_client, user):
    response = upload(auth_client, photo())

    assert response.status_code == 201, response.json()
    body = response.json()
    assert (body["width"], body["height"]) == (2048, 1024)
    assert body["url"].startswith("http://testserver/media/images/")

    image = Image.objects.get(pk=body["id"])
    assert image.uploader == user
    with PILImage.open(image.file) as stored:
        assert stored.format == "WEBP"
        assert not stored.getexif()


def test_rejects_files_that_are_not_images(auth_client):
    file = SimpleUploadedFile("notes.jpg", b"not an image", content_type="image/jpeg")
    assert upload(auth_client, file).status_code == 400


def test_upload_requires_sign_in(api_client, db):
    assert upload(api_client, photo()).status_code in (401, 403)


def test_avatar_must_be_your_own_upload(auth_client, make_user, api_client):
    other = make_user()
    api_client.force_authenticate(other)
    theirs = upload(api_client, photo(gps=False)).json()["id"]
    mine = upload(auth_client, photo(gps=False)).json()["id"]

    assert auth_client.patch("/api/me/", {"avatar_id": theirs}).status_code == 400
    response = auth_client.patch("/api/me/", {"avatar_id": mine})
    assert response.status_code == 200
    assert response.json()["avatar"]["id"] == mine


def test_orphan_images_are_deleted_after_a_day(auth_client, user):
    attached = Image.objects.get(pk=upload(auth_client, photo(gps=False)).json()["id"])
    orphan = Image.objects.get(pk=upload(auth_client, photo(gps=False)).json()["id"])
    recent = Image.objects.get(pk=upload(auth_client, photo(gps=False)).json()["id"])
    user.profile.avatar = attached
    user.profile.save()
    Image.objects.filter(pk__in=[attached.pk, orphan.pk]).update(
        created_at=timezone.now() - timedelta(days=2)
    )
    orphan_file = orphan.file.path

    call_command("delete_orphan_images", stdout=StringIO())

    assert set(Image.objects.values_list("pk", flat=True)) == {attached.pk, recent.pk}
    assert not os.path.exists(orphan_file)


def halves(size=(400, 200)):
    """A PNG whose left half is red and right half is blue."""
    image = PILImage.new("RGB", size, "red")
    image.paste((0, 0, 255), (size[0] // 2, 0, size[0], size[1]))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return SimpleUploadedFile("halves.png", buffer.getvalue(), content_type="image/png")


def crop(client, image_id, **rect):
    return client.post(f"/api/images/{image_id}/crop/", rect, format="json")


def test_crop_cuts_out_part_and_reframing_starts_from_the_original(auth_client, user):
    original = upload(auth_client, halves()).json()

    right = crop(auth_client, original["id"], x=0.5, y=0, width=0.5, height=1)
    assert right.status_code == 201, right.json()
    body = right.json()
    assert (body["width"], body["height"]) == (200, 200)
    assert body["original"]["id"] == original["id"]
    assert body["crop"] == {"x": 0.5, "y": 0, "width": 0.5, "height": 1}
    with Image.objects.get(pk=body["id"]).file.open("rb") as file:
        assert PILImage.open(file).convert("RGB").getpixel((100, 100))[2] > 200  # blue

    # Reframing the crop crops the original again, so the left half is still there.
    left = crop(auth_client, body["id"], x=0, y=0, width=0.5, height=1).json()
    assert left["original"]["id"] == original["id"]
    with Image.objects.get(pk=left["id"]).file.open("rb") as file:
        assert PILImage.open(file).convert("RGB").getpixel((100, 100))[0] > 200  # red

    detail = auth_client.get(f"/api/images/{left['id']}/").json()
    assert detail["original"]["url"] == original["url"]


def test_crop_has_to_stay_inside_the_picture(auth_client, user):
    original = upload(auth_client, halves()).json()

    assert crop(auth_client, original["id"], x=0.6, y=0, width=0.5, height=1).status_code == 400
    assert crop(auth_client, original["id"], x=0, y=0, width=0, height=1).status_code == 400
    assert crop(auth_client, 999999, x=0, y=0, width=1, height=1).status_code == 404


def test_crops_keep_their_original_from_being_cleaned_up(auth_client, user):
    original = upload(auth_client, halves()).json()
    cropped = crop(auth_client, original["id"], x=0, y=0, width=0.5, height=1).json()

    orphans = set(Image.orphans().values_list("pk", flat=True))

    # The crop isn't used by anything yet; its original is, by the crop.
    assert cropped["id"] in orphans
    assert original["id"] not in orphans


def test_gifs_stay_animated(auth_client):
    colours = ["red", "green", "blue"]
    frames = [PILImage.new("RGB", (1200, 600), colour) for colour in colours]
    buffer = BytesIO()
    frames[0].save(
        buffer, format="GIF", save_all=True, append_images=frames[1:], duration=120, loop=0
    )
    gif = SimpleUploadedFile("party.gif", buffer.getvalue(), content_type="image/gif")

    response = upload(auth_client, gif)

    assert response.status_code == 201, response.json()
    assert (response.json()["width"], response.json()["height"]) == (800, 400)
    with PILImage.open(Image.objects.get(pk=response.json()["id"]).file) as stored:
        assert stored.format == "WEBP"
        assert stored.is_animated
        assert stored.n_frames == 3
        stored.seek(1)
        stored.load()
        assert stored.info["duration"] == 120


def test_a_single_frame_gif_is_a_still(auth_client):
    buffer = BytesIO()
    PILImage.new("RGB", (100, 50), "orange").save(buffer, format="GIF")
    gif = SimpleUploadedFile("still.gif", buffer.getvalue(), content_type="image/gif")
    response = upload(auth_client, gif)
    with PILImage.open(Image.objects.get(pk=response.json()["id"]).file) as stored:
        assert not getattr(stored, "is_animated", False)
