"""gunicorn's settings for the API; it reads this file from the working directory by itself."""

import os

bind = "0.0.0.0:8000"
# A few processes, so one slow request doesn't hold up everyone else.
workers = int(os.environ.get("WEB_CONCURRENCY", 3))
# Requests should be quick; anything slow (like generating sample data) runs in the background.
timeout = 60
accesslog = "-"
