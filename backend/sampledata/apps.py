from django.apps import AppConfig


class SampleDataConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "sampledata"
    verbose_name = "Sample data"
