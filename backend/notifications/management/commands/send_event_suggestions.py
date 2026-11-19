from django.core.management.base import BaseCommand

from notifications.suggestions import send_event_suggestions


class Command(BaseCommand):
    help = 'Notifies people of new events near them or for their interests ("5 new events…").'

    def handle(self, *args, **options):
        sent = send_event_suggestions()
        self.stdout.write(f"Sent {sent} event suggestion(s).")
