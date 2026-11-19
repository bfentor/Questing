from django.db import migrations


def to_questing(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    Site.objects.filter(pk=1).update(domain="questing.fi")


def back_to_fentorweb(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    Site.objects.filter(pk=1).update(domain="sidequest.fentorweb.hu")


class Migration(migrations.Migration):
    """questing.fi is set up now: the site moves there (staging is at staging.questing.fi)."""

    dependencies = [
        ("accounts", "0009_site_domain_back"),
    ]

    operations = [migrations.RunPython(to_questing, back_to_fentorweb)]
