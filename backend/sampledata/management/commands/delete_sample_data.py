from django.core.management.base import BaseCommand

from sampledata.services import delete_sample_data


class Command(BaseCommand):
    help = "Delete the sample people and organizations, and everything they made."

    def handle(self, *args, **options):
        count = delete_sample_data()
        self.stdout.write(self.style.SUCCESS(f"Deleted {count} sample profiles and their data."))
