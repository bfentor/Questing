"""Marks what `seed_demo` and `seed_showcase` made before sample data was marked.

Accounts at @sidequest.test (a reserved domain, so never a real person's) and the organizations
the seeds made, if every member is one of those accounts.
"""

from django.db import migrations

DOMAIN = "@sidequest.test"
ORGANIZATIONS = ["student_union", "outdoor_club", "cafe_saimaa", "tech_guild", "lahti_students"]


def mark(apps, schema_editor):
    Profile = apps.get_model("profiles", "Profile")
    User = apps.get_model("accounts", "User")
    SampleProfile = apps.get_model("sampledata", "SampleProfile")
    people = Profile.objects.filter(user__email__iendswith=DOMAIN)
    organizations = Profile.objects.filter(kind="organization", handle__in=ORGANIZATIONS).exclude(
        memberships__user__in=User.objects.exclude(email__iendswith=DOMAIN)
    )
    SampleProfile.objects.bulk_create(
        [SampleProfile(profile=profile) for profile in [*people, *organizations]],
        ignore_conflicts=True,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("sampledata", "0001_initial"),
        ("accounts", "0006_user_email_digest"),
    ]

    operations = [migrations.RunPython(mark, migrations.RunPython.noop)]
