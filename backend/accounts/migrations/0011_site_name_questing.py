from django.db import migrations


def to_questing(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    Site.objects.filter(pk=1).update(name="Questing")


def back_to_sidequest(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    Site.objects.filter(pk=1).update(name="Sidequest")


class Migration(migrations.Migration):
    """The app is called Questing now, which is what allauth's emails are signed with."""

    dependencies = [
        ("accounts", "0010_site_domain_questing_again"),
    ]

    operations = [migrations.RunPython(to_questing, back_to_sidequest)]
