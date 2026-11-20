# Demo video

`record.mjs` records a three-minute tour of Questing for pitches and funding applications: the
web app at 1920×1080, with a visible cursor, captions and a title card at each end, as an MP4.
It signs in as the showcase's demo account (Ella Saarinen) and goes through the home feed,
posting, upcoming events and filters, an event with questions, nearby on a map, notifications,
the calendar, search, a profile, the organizer's dashboard, the new-event form, calendar sync,
and Finnish and dark mode.

It changes the data it's shown (it posts, likes, follows and asks a question), so generate the
showcase afresh before every take. That also keeps the dates current.

```sh
# 1. A database of its own with fresh showcase data
cd backend
createdb questing_demo   # once; or with psql
DATABASE_URL=postgis://sidequest:sidequest@localhost:5432/questing_demo uv run python manage.py migrate
DATABASE_URL=postgis://sidequest:sidequest@localhost:5432/questing_demo SAMPLE_DATA_ENABLED=true \
  uv run python manage.py seed_showcase --fresh

# 2. The API with it (port 8010, beside a dev server on 8000)
DATABASE_URL=postgis://sidequest:sidequest@localhost:5432/questing_demo DJANGO_DEBUG=1 \
  CORS_ALLOWED_ORIGINS=http://localhost:3000 uv run python manage.py runserver 8010
cd ..

# 3. The web app, built to talk to it (shared links and embeds say app.questing.fi)
cd apps/app && EXPO_PUBLIC_API_URL=http://localhost:8010 EXPO_PUBLIC_WEB_URL=https://app.questing.fi \
  npx expo export -p web && cd ../..
PORT=3000 node apps/web-server/server.js

# 4. Record (needs ffmpeg); about three minutes, in real time
node e2e/demo-video/record.mjs        # → e2e/demo-video/out/questing-demo.mp4
```

It prints its progress every five seconds. If the app's labels change, the tour stops where it
can't find something; the error names it. The captions and their timing are all in `tour()`.
