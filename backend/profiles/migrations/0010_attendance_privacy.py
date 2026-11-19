from django.db import migrations, models


def hidden_to_nobody(apps, schema_editor):
    """Whoever hid their attendance shares it with nobody."""
    Profile = apps.get_model("profiles", "Profile")
    Profile.objects.filter(hide_attendance=True).update(attendance_visibility="nobody")


def nobody_to_hidden(apps, schema_editor):
    Profile = apps.get_model("profiles", "Profile")
    Profile.objects.filter(attendance_visibility="nobody").update(hide_attendance=True)


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0009_profile_gender"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="attendance_visibility",
            field=models.CharField(
                choices=[
                    ("everyone", "Everyone"),
                    ("followers", "Followers"),
                    ("nobody", "Nobody"),
                ],
                default="everyone",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="profile",
            name="show_past_attendance",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(hidden_to_nobody, nobody_to_hidden),
        migrations.RemoveField(
            model_name="profile",
            name="hide_attendance",
        ),
    ]
