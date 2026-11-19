from django.core.exceptions import ImproperlyConfigured
from django.core.management.base import BaseCommand, CommandError

from sampledata.demo import DEMO_PASSWORD, seed_demo
from sampledata.services import DEMO_EMAIL


class Command(BaseCommand):
    help = "Create demo users, organizations, events and posts for local development."

    def handle(self, *args, **options):
        try:
            made = seed_demo()
        except ImproperlyConfigured as error:
            raise CommandError(error) from error
        if not made:
            self.stdout.write("Demo data already exists.")
            return
        message = f"Seeded demo data. Sign in as {DEMO_EMAIL} / {DEMO_PASSWORD}"
        self.stdout.write(self.style.SUCCESS(message))
