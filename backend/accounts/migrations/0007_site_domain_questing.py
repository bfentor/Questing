from django.db import migrations


def move_site(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    Site.objects.filter(pk=1).update(domain="questing.fi")


def move_site_back(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    Site.objects.filter(pk=1).update(domain="sidequest.fentorweb.hu")


class Migration(migrations.Migration):
    """The site moved to questing.fi (staging is at staging.questing.fi until production)."""

    dependencies = [
        ("accounts", "0006_user_email_digest"),
    ]

    operations = [migrations.RunPython(move_site, move_site_back)]
