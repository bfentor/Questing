from django.db import migrations


def back_to_fentorweb(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    Site.objects.filter(pk=1).update(domain="sidequest.fentorweb.hu")


def to_questing(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    Site.objects.filter(pk=1).update(domain="questing.fi")


class Migration(migrations.Migration):
    """questing.fi isn't set up yet: staging stays at sidequest.fentorweb.hu for now."""

    dependencies = [
        ("accounts", "0008_event_suggestions"),
    ]

    operations = [migrations.RunPython(back_to_fentorweb, to_questing)]
