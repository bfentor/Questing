from django.core.exceptions import ImproperlyConfigured
from django.core.management.base import BaseCommand, CommandError

from accounts.models import User
from sampledata import services
from sampledata.demo import DEMO_PASSWORD


class Command(BaseCommand):
    help = (
        "Create a showcase of people, events and posts that exercises every feature. "
        "The same as Generate on the admin's Sample data page."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--viewer",
            default=services.DEMO_EMAIL,
            help=(
                "The account everything is set up around (default: the demo account). "
                "Deleting the sample data later leaves this account and its own posts."
            ),
        )
        parser.add_argument(
            "--fresh",
            action="store_true",
            help="Replace existing sample data, so the dates start from now again.",
        )

    def handle(self, *args, viewer, fresh, **options):
        if services.exists() and not fresh:
            self.stdout.write("Sample data already exists; --fresh replaces it.")
            return
        try:
            services.generate(viewer)
        except ImproperlyConfigured as error:
            raise CommandError(error) from error
        except User.DoesNotExist as error:
            raise CommandError(error) from error
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded the showcase around {viewer}. Everyone else signs in with "
                f"<handle>@sidequest.test / {DEMO_PASSWORD}"
            )
        )
