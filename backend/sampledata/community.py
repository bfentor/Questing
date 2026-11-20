"""A town's worth of people around the showcase (showcase.py), so Questing looks lived in.

Dozens of people (students and not), organizations from a choir to a climbing gym, a month
of their events with crowds going, posts and conversations, and the things only organizers
and moderators see: an imported calendar, a verification request, pending invitations,
reports, and a dashboard with a month of numbers.
"""

from datetime import datetime, time, timedelta
from decimal import Decimal

from allauth.account.models import EmailAddress
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db.models import Count, Q
from django.utils import timezone

from accounts.models import User
from events.attendance import rsvp
from events.models import (
    Attendance,
    CalendarSource,
    Event,
    EventFeedback,
    EventViewDay,
    SavedEvent,
)
from moderation.models import Report
from notifications.models import Kind
from notifications.services import notify
from posts.models import Post
from profiles.models import Follow, Invitation, Membership, Profile, VerificationRequest
from students.models import StudentStatus, University

from .demo import DEMO_PASSWORD
from .services import mark

# Places around Lappeenranta (lng, lat), so the nearby map has pins all over town.
PLACES = {
    "church": ("St. Mary's Church", (28.1868, 61.0635)),
    "fortress": ("Linnoitus fortress", (28.1832, 61.0650)),
    "harbour": ("Old Harbour", (28.1795, 61.0629)),
    "library": ("Lappeenranta City Library", (28.1885, 61.0584)),
    "centre": ("Kauppatori market square", (28.1891, 61.0573)),
    "gym": ("Saimaa Climbing, Pallonlyöjänkatu", (28.1495, 61.0516)),
    "kimpinen": ("Kimpinen sports park", (28.1612, 61.0498)),
    "noppa": ("Noppa, Valtakatu 40", (28.1876, 61.0579)),
    "foodbank": ("Food bank, Snellmaninkatu 5", (28.1923, 61.0552)),
    "startup": ("Green Campus Open", (28.0985, 61.0630)),
    "gallery": ("Gallery Pihatto", (28.1840, 61.0592)),
    "rauha": ("Rauha beach", (28.6030, 61.1880)),
    "kaukas": ("Kaukas park", (28.1310, 61.0760)),
}

# (handle, name, bio, interests, university short name for verified students, picture)
PEOPLE = [
    (
        "ville",
        "Ville Koskinen",
        "Nurse, runner, sauna on Sundays.",
        ["sports", "wellbeing"],
        None,
        "lake",
    ),
    (
        "anna_k",
        "Anna Kallio",
        "Primary school teacher. Choir alto 🎶",
        ["music", "culture"],
        None,
        "snow",
    ),
    (
        "pekka",
        "Pekka Rantanen",
        "Retired engineer. Fishing, chess and the library.",
        ["games", "culture"],
        None,
        None,
    ),
    (
        "liisa",
        "Liisa Hämäläinen",
        "Barista at Café Saimaa. Ask me for oat milk.",
        ["food", "music"],
        None,
        "food",
    ),
    (
        "matti",
        "Matti Salo",
        "Developer by day, bass player by night.",
        ["tech", "music"],
        None,
        "night",
    ),
    (
        "johanna",
        "Johanna Nieminen",
        "Moved here for the lake. Kayaks, books, cats.",
        ["outdoors", "culture"],
        None,
        "forest",
    ),
    (
        "ahmed",
        "Ahmed Hassan",
        "MSc student. Football, cooking, new people.",
        ["sports", "food", "community"],
        "LUT",
        "fire",
    ),
    (
        "maria",
        "María García",
        "Exchange student from Valencia 🇪🇸 Show me Finland!",
        ["party", "culture", "outdoors"],
        "LUT",
        "lake",
    ),
    (
        "lukas",
        "Lukas Weber",
        "Exchange, Industrial Management. Climbing every day I can.",
        ["sports", "outdoors"],
        "LUT",
        "snow",
    ),
    (
        "chen",
        "Chen Wei",
        "PhD in energy systems. Board games are my research break.",
        ["games", "academic", "tech"],
        "LUT",
        None,
    ),
    (
        "priya",
        "Priya Sharma",
        "Data science, dancing and dosas.",
        ["tech", "party", "food"],
        "LUT",
        "night",
    ),
    (
        "elina",
        "Elina Turunen",
        "Art teacher, life drawing on Wednesdays ✏️",
        ["culture", "community"],
        None,
        "campus",
    ),
    (
        "tuomas",
        "Tuomas Lehtonen",
        "Futsal, energy drinks, terrible puns.",
        ["sports", "games"],
        "LUT",
        "fire",
    ),
    (
        "sanna",
        "Sanna Laaksonen",
        "Volunteer coordinator at the food bank.",
        ["volunteering", "community"],
        None,
        "forest",
    ),
    (
        "olli",
        "Olli Järvinen",
        "Pub quiz champion (self-proclaimed).",
        ["games", "party"],
        None,
        None,
    ),
    (
        "kaisa",
        "Kaisa Peltonen",
        "Choir, crosswords, cinnamon buns.",
        ["music", "food"],
        None,
        "snow",
    ),
    (
        "henrik",
        "Henrik Ström",
        "Hej! Svenskspråkig i Villmanstrand. Löpning och jazz.",
        ["sports", "music"],
        None,
        "lake",
    ),
    (
        "ida",
        "Ida Holm",
        "Studerar ekonomi. Brädspel och bastu.",
        ["games", "wellbeing"],
        "LUT",
        "campus",
    ),
    (
        "jussi",
        "Jussi Mattila",
        "Founder at a small battery startup ⚡",
        ["career", "tech"],
        None,
        "night",
    ),
    (
        "noora",
        "Noora Aaltonen",
        "Yoga teacher. Breathe in, breathe out.",
        ["wellbeing", "outdoors"],
        None,
        "forest",
    ),
    (
        "eetu",
        "Eetu Saarinen",
        "First-year, still finding my way around 🙂",
        ["games", "party", "tech"],
        "LUT",
        None,
    ),
    (
        "veera",
        "Veera Kinnunen",
        "Photographer. I'll be the one with the camera.",
        ["culture", "outdoors"],
        None,
        "lake",
    ),
    (
        "antti",
        "Antti Laitinen",
        "Dad of two, trail runner, pancake chef.",
        ["outdoors", "food", "sports"],
        None,
        None,
    ),
    (
        "tiina",
        "Tiina Heino",
        "Librarian. Recommends books whether you ask or not 📚",
        ["culture", "academic"],
        None,
        "campus",
    ),
    (
        "samuel",
        "Samuel Okafor",
        "Electrical engineering, gospel choir, good vibes.",
        ["music", "community"],
        "LUT",
        "fire",
    ),
    (
        "mira",
        "Mira Leinonen",
        "Climber, knitter, cat person.",
        ["sports", "community"],
        None,
        "snow",
    ),
    (
        "arttu",
        "Arttu Vainio",
        "Guitar, gigs and grilled sausages.",
        ["music", "party"],
        None,
        "night",
    ),
    (
        "hanna",
        "Hanna Lindroos",
        "Kemisti. Hiihto ja lautapelit.",
        ["outdoors", "games"],
        None,
        "forest",
    ),
    (
        "daniel",
        "Daniel Novak",
        "Software engineer from Prague. Running, beer, chess.",
        ["sports", "games"],
        None,
        "lake",
    ),
    (
        "laura",
        "Laura Kemppainen",
        "Business student, event volunteer, coffee addict.",
        ["volunteering", "career", "food"],
        "LUT",
        "food",
    ),
    (
        "ronja",
        "Ronja Mustonen",
        "Dance, drag shows and everything glittery ✨",
        ["party", "culture"],
        None,
        "night",
    ),
    (
        "erkki",
        "Erkki Manninen",
        "Seventy-two and still ice swimming every morning.",
        ["wellbeing", "outdoors"],
        None,
        None,
    ),
    (
        "julia",
        "Julia Söderberg",
        "Musikstudent. Sjunger i kör, spelar piano.",
        ["music", "culture"],
        None,
        "snow",
    ),
    ("niko", "Niko Hyvönen", "Startups, sauna and sailing.", ["career", "outdoors"], "LUT", "lake"),
    (
        "aleksi",
        "Aleksi Rinne",
        "Board game designer in training 🎲",
        ["games", "tech"],
        None,
        "campus",
    ),
    (
        "petra",
        "Petra Koivisto",
        "Nurse student. Night shifts and day hikes.",
        ["outdoors", "wellbeing"],
        "LUT",
        "forest",
    ),
]

# (handle, name, bio, sky, admin, verified)
ORGANIZATIONS = [
    (
        "lpr_choir",
        "Lappeenranta Chamber Choir",
        "Thirty voices, all ages. New singers welcome every autumn and spring.",
        "snow",
        "anna_k",
        True,
    ),
    (
        "saimaa_climbing",
        "Saimaa Climbing",
        "Bouldering and rope climbing for everyone, from first-timers to crushers.",
        "forest",
        "mira",
        True,
    ),
    (
        "harbour_pub",
        "The Old Harbour Pub",
        "Craft beer, live music and the toughest quiz in town, every Thursday.",
        "fire",
        "olli",
        True,
    ),
    (
        "lpr_library",
        "Lappeenranta City Library",
        "Books, language cafés, author talks and a quiet place to think.",
        "campus",
        "tiina",
        True,
    ),
    (
        "saimaa_runners",
        "Saimaa Runners",
        "Running club for every pace. Long runs on Sundays.",
        "lake",
        "ville",
        False,
    ),
    (
        "noppa_cafe",
        "Noppa Board Game Café",
        "Over 600 games, good coffee and staff who explain the rules.",
        "food",
        "aleksi",
        False,
    ),
    (
        "lpr_foodbank",
        "Food Bank Lappeenranta",
        "Groceries for families who need them, run by volunteers.",
        "forest",
        "sanna",
        True,
    ),
    (
        "startup_lpr",
        "Startup Lappeenranta",
        "Pitch nights, founder breakfasts and help for anyone with an idea.",
        "night",
        "jussi",
        False,
    ),
    (
        "art_collective",
        "Saimaa Art Collective",
        "Local artists: open studios, markets and life drawing.",
        "campus",
        "elina",
        False,
    ),
]

POSTS = [
    (
        "veera",
        "Frost on the fortress walls this morning ❄️ #lappeenranta #photography",
        ["snow", "snow", "lake"],
    ),
    (
        "harbour_pub",
        "Quiz tonight! Theme: 90s music. Teams of up to six, starts at 19 🎤 #pubquiz",
        [],
    ),
    (
        "maria",
        "My first sauna AND my first ice swim on the same day. Finland, you're crazy "
        "and I love you 🥶🔥",
        ["lake"],
    ),
    (
        "saimaa_climbing",
        "New boulder problems are up in the cave! Six new ones from 4 to 7A 🧗 #bouldering",
        ["forest", "forest"],
    ),
    (
        "lpr_library",
        "Language café is back on Tuesdays: Finnish, Swedish and English tables. "
        "No sign-up, just come 💬 #languagecafe",
        [],
    ),
    (
        "chen",
        "Looking for 2 more players for Terraforming Mars on Friday at @noppa_cafe. "
        "Who's in? #boardgames",
        [],
    ),
    (
        "anna_k",
        "Rehearsals for the Christmas concert are sounding wonderful. Tickets are on sale now 🎄",
        ["night"],
    ),
    (
        "lpr_foodbank",
        "Thank you to the 42 volunteers who packed 300 food parcels last week ❤️ "
        "We still need drivers for Saturday. #volunteering",
        ["campus"],
    ),
    ("ahmed", "Football every Sunday at Kimpinen, 14:00. All levels, just bring shoes ⚽", []),
    ("noora", "Sunrise yoga by the lake. Cold hands, warm heart 🧘", ["lake"]),
    (
        "startup_lpr",
        "Pitch night applications are open: five minutes, one slide, real "
        "investors in the room. #startup",
        [],
    ),
    ("henrik", "Någon som vill springa längs stranden på lördag morgon? 🏃", []),
    (
        "art_collective",
        "Studio doors open this weekend. Come see what we've been making 🎨",
        ["campus", "fire"],
    ),
    ("lukas", "Three months of climbing here and I finally sent my project 💪", ["forest"]),
    ("pekka", "The library's chess corner needs more opponents. I'm there most mornings ♟️", []),
    ("ronja", "Who's coming to the winter gala? Already planning the outfit ✨", ["night"]),
    ("eetu", "Is it normal that it's dark at 3pm? Asking for a friend 😅", []),
    (
        "saimaa_runners",
        "Sunday long run: 15 km, three pace groups, coffee after ☕ #running",
        ["lake"],
    ),
    (
        "tiina",
        "Book tip of the week: a collection of short stories set by Lake Saimaa. "
        "Reserve it in the app 📚",
        [],
    ),
    (
        "priya",
        "Dosa night at mine went from 4 to 14 people. Thanks for coming everyone! 🥘",
        ["food", "food"],
    ),
    (
        "jussi",
        "We're hiring a summer intern for battery testing. Students, message me! #career",
        [],
    ),
    ("kaisa", "Pulla from the choir bake sale. Gone in 20 minutes 🥐", ["food"]),
    ("noppa_cafe", "New arrivals: Wingspan Asia, Cascadia and Sky Team 🎲 #boardgames", ["food"]),
    (
        "matti",
        "Our band plays at @harbour_pub next Friday. Free entry, bad jokes included 🎸",
        ["night"],
    ),
]

COMMENTS = [
    "Count me in!",
    "This looks amazing 😍",
    "See you there!",
    "Can I bring a friend?",
    "Wish I could make it this time 😢",
    "Great photos!",
    "Haha so true",
    "Kiitos! 🙏",
    "Tack, det låter kul!",
    "What time does it end?",
    "Is it okay for beginners?",
    "I'll bring snacks 🍪",
    "Last time was so much fun",
    "Saved, thanks for sharing",
    "Nähdään siellä!",
]


class Community:
    def __init__(self, showcase):
        self.s = showcase
        self.random = showcase.random
        self.now = showcase.now
        self.me = showcase.me
        self.viewer = showcase.viewer

    def build(self):
        self.people()
        self.organizations()
        self.connections()
        self.events()
        self.posts()
        self.organizer_tools()
        self.reports()

    def at(self, days, hour, minute=0):
        """`days` from today, at `hour`:`minute` local time."""
        day = timezone.localdate() + timedelta(days=days)
        return timezone.make_aware(datetime.combine(day, time(hour, minute)))

    def some(self, people, low, high):
        return self.random.sample(people, min(len(people), self.random.randint(low, high)))

    # People and organizations

    def people(self):
        universities = {u.short_name: u for u in University.objects.all()}
        self.p = {}
        for handle, name, bio, interests, university, sky in PEOPLE:
            user = User.objects.create_user(
                email=f"{handle}@sidequest.test",
                password=DEMO_PASSWORD,
                birth_date=datetime(1960 + self.random.randint(0, 45), 6, 1).date(),
                terms_version=settings.TERMS_VERSION,
                terms_accepted_at=self.now,
                onboarded_at=self.now,
            )
            EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)
            profile = user.profile
            profile.handle = handle
            profile.display_name = name
            profile.bio = bio
            if sky:
                profile.avatar = self.s.avatar(sky)
            if university and university in universities:
                profile.university = universities[university].name
                StudentStatus.objects.create(
                    user=user,
                    university=universities[university],
                    email=f"{handle}@student.lut.fi",
                    verified_at=self.now - timedelta(days=self.random.randint(5, 300)),
                )
            profile.save()
            profile.interests.set(self.s.categories[slug] for slug in interests)
            self.p[handle] = profile
        mark(*self.p.values())
        # Everyone the showcase made too, for crowds.
        self.everyone = list(self.p.values()) + [
            self.s.p[h] for h in ("aino", "mikko", "sofia", "leo", "emma", "jonas", "helmi")
        ]

    def organizations(self):
        self.o = {}
        for handle, name, bio, sky, admin, verified in ORGANIZATIONS:
            org = Profile.objects.create(
                kind=Profile.Kind.ORGANIZATION,
                handle=handle,
                display_name=name,
                bio=bio,
                verified=verified,
                avatar=self.s.avatar(sky),
                cover=self.s.picture(sky, size=(1500, 500)),
                website=f"https://example.com/{handle}",
            )
            Membership.objects.create(
                organization=org, user=self.p[admin].user, role=Membership.Role.ADMIN
            )
            for editor in self.some(list(self.p.values()), 0, 2):
                if editor.user != self.p[admin].user:
                    Membership.objects.get_or_create(
                        organization=org,
                        user=editor.user,
                        defaults={"role": Membership.Role.EDITOR},
                    )
            self.o[handle] = org
        mark(*self.o.values())

    def follow(self, follower, followee, days_ago=None):
        follow, created = Follow.objects.get_or_create(follower=follower, followee=followee)
        if created and days_ago is not None:
            Follow.objects.filter(pk=follow.pk).update(
                created_at=self.now - timedelta(days=days_ago, hours=self.random.randint(0, 23))
            )

    def connections(self):
        orgs = list(self.o.values()) + [self.s.union, self.s.outdoor, self.s.cafe]
        for person in self.everyone:
            for org in self.some(orgs, 2, 6):
                self.follow(person, org, days_ago=self.random.randint(0, 120))
            for other in self.some(self.everyone, 3, 12):
                if other != person and not other.is_private:
                    self.follow(person, other, days_ago=self.random.randint(0, 120))
        # The outdoor club, which the viewer runs, has been growing all month (the dashboard).
        for person in self.some(self.everyone, 24, 30):
            self.follow(person, self.s.outdoor, days_ago=self.random.randint(0, 29))
        # The viewer follows about half of town, and about as many follow back.
        for person in self.some(list(self.p.values()), 14, 18):
            self.follow(self.me, person)
        for org in (
            self.o["saimaa_climbing"],
            self.o["harbour_pub"],
            self.o["lpr_library"],
            self.o["noppa_cafe"],
            self.o["saimaa_runners"],
        ):
            self.follow(self.me, org)
        for person in self.some(list(self.p.values()), 18, 24):
            self.follow(person, self.me, days_ago=self.random.randint(0, 60))
        # A few of the newest followers, in the inbox.
        for person in list(self.p.values())[:3]:
            Follow.objects.get_or_create(follower=person, followee=self.me)
            notify([self.viewer], Kind.NEW_FOLLOWER, actor=person)

    # Events

    def event(
        self, organizer, title, when, hours, place, *, crowd=(4, 20), interested=(1, 8), **fields
    ):
        venue, point = PLACES[place] if isinstance(place, str) else (None, place)
        if venue:
            fields.setdefault("venue_name", venue)
        event = self.s.event(organizer, title, when, hours, place=point, **fields)
        if crowd:
            for profile in self.some(self.everyone, *crowd):
                rsvp(event, profile, Attendance.Status.GOING)
            for profile in self.some(self.everyone, *interested):
                if not Attendance.objects.filter(event=event, profile=profile).exists():
                    rsvp(event, profile, Attendance.Status.INTERESTED)
        return event

    def events(self):
        o, p = self.o, self.p
        going, interested = Attendance.Status.GOING, Attendance.Status.INTERESTED
        self.e = {}
        e = self.e
        e["quiz"] = self.event(
            o["harbour_pub"],
            "Thursday pub quiz",
            self.at(self.days_until(3), 19),
            3,
            "harbour",
            categories=["games", "party"],
            sky="fire",
            min_age=18,
            crowd=(14, 22),
            repeat={"frequency": "weekly", "count": 4},
            description="Six rounds, one picture round and a music round. Teams of up to six. "
            "The winners drink for free 🍻 #pubquiz",
        )
        e["concert"] = self.event(
            o["lpr_choir"],
            "Christmas concert: Light in the Dark",
            self.at(12, 18),
            2,
            "church",
            categories=["music", "culture"],
            sky="night",
            price=Decimal("15.00"),
            ticket_url="https://example.com/tickets/christmas-concert",
            capacity=300,
            crowd=(18, 26),
            interested=(6, 12),
            co_hosts=[o["lpr_library"]],
            description="Carols from Finland, Sweden and around the world, by candlelight. "
            "Mulled juice in the interval. #christmas",
        )
        e["rehearsal"] = self.event(
            o["lpr_choir"],
            "Open rehearsal for new singers",
            self.at(3, 18, 30),
            2,
            "church",
            categories=["music"],
            crowd=(3, 7),
            description="Curious about singing in a choir? Come and try one rehearsal, no "
            "audition needed.",
        )
        e["course"] = self.event(
            o["saimaa_climbing"],
            "Beginners' bouldering course",
            self.at(2, 17),
            2,
            "gym",
            categories=["sports"],
            sky="forest",
            price=Decimal("25.00"),
            capacity=8,
            crowd=(10, 12),
            interested=(2, 4),
            description="Two hours with an instructor: technique, falling safely and reading "
            "routes. Shoes included.",
        )
        e["night_climb"] = self.event(
            o["saimaa_climbing"],
            "Night climb & pizza",
            self.at(9, 20),
            4,
            "gym",
            categories=["sports", "party"],
            sky="night",
            crowd=(8, 16),
            description="The gym stays open late, the music goes up and the pizza is on us 🍕",
        )
        e["language"] = self.event(
            o["lpr_library"],
            "Language café",
            self.at(self.days_until(1), 17),
            2,
            "library",
            categories=["culture", "community"],
            crowd=(5, 12),
            repeat={"frequency": "weekly", "count": 4},
            description="Finnish, Swedish and English tables. Practise with locals over coffee. "
            "Free, no sign-up. #languagecafe",
        )
        e["author"] = self.event(
            o["lpr_library"],
            "Author talk: Stories from Saimaa",
            self.at(6, 18),
            2,
            "library",
            categories=["culture"],
            crowd=(6, 14),
            description="An evening with a local author about her new short story collection.",
        )
        e["long_run"] = self.event(
            o["saimaa_runners"],
            "Sunday long run",
            self.at(self.days_until(6), 10),
            2,
            "kimpinen",
            categories=["sports", "outdoors"],
            sky="lake",
            crowd=(6, 15),
            repeat={"frequency": "weekly", "count": 3},
            description="15 km along the lake in three pace groups. Coffee after. #running",
        )
        e["5k"] = self.event(
            o["saimaa_runners"],
            "Lappeenranta Christmas 5K",
            self.at(20, 11),
            3,
            "centre",
            categories=["sports", "community"],
            sky="snow",
            price=Decimal("10.00"),
            capacity=400,
            crowd=(20, 30),
            interested=(8, 14),
            co_hosts=[o["lpr_foodbank"]],
            description="Run, jog or walk in your best Christmas jumper 🎄 All profits go to the "
            "food bank.",
        )
        e["strategy"] = self.event(
            o["noppa_cafe"],
            "Board game night: strategy edition",
            self.at(1, 18),
            5,
            "noppa",
            categories=["games"],
            sky="food",
            crowd=(10, 18),
            description="Bring your brain. Tables for Terraforming Mars, Brass and more 🎲",
        )
        e["dnd"] = self.event(
            o["noppa_cafe"],
            "Dungeons & Dragons one-shot",
            self.at(5, 18),
            4,
            "noppa",
            categories=["games"],
            capacity=5,
            crowd=(7, 8),
            interested=(0, 2),
            description="A beginner-friendly adventure. Characters provided 🐉",
        )
        e["parcels"] = self.event(
            o["lpr_foodbank"],
            "Volunteer shift: Christmas food parcels",
            self.at(10, 9),
            5,
            "foodbank",
            categories=["volunteering", "community"],
            capacity=30,
            crowd=(12, 20),
            description="Pack parcels for 300 families. Lunch provided. No experience needed ❤️",
        )
        e["pitch"] = self.event(
            o["startup_lpr"],
            "Pitch night",
            self.at(8, 17, 30),
            3,
            "startup",
            categories=["career", "tech"],
            sky="night",
            online_url="https://example.com/live/pitch-night",
            crowd=(10, 18),
            description="Ten founders, five minutes each, real investors in the room. Watch on "
            "site or online. #startup",
        )
        e["breakfast"] = self.event(
            o["startup_lpr"],
            "Founder breakfast (online)",
            self.at(4, 8),
            1,
            None,
            categories=["career"],
            online_url="https://example.com/meet/founder-breakfast",
            crowd=(4, 9),
            description="Coffee and honest talk about building a company. Online, cameras "
            "optional.",
        )
        e["market"] = self.event(
            o["art_collective"],
            "Winter art market",
            self.at(15, 11),
            6,
            "fortress",
            categories=["culture", "food"],
            sky="snow",
            crowd=(12, 24),
            interested=(8, 15),
            description="Prints, ceramics, knitwear and hot glögi from thirty local makers.",
        )
        e["drawing"] = self.event(
            o["art_collective"],
            "Life drawing evening",
            self.at(4, 18),
            2,
            "gallery",
            categories=["culture"],
            price=Decimal("8.00"),
            min_age=18,
            crowd=(5, 10),
            description="A model, music and two hours of drawing. Materials provided.",
        )
        e["futsal"] = self.event(
            p["tuomas"],
            "Futsal pickup game",
            self.at(self.days_until(2), 20),
            2,
            "kimpinen",
            categories=["sports"],
            crowd=(8, 12),
            repeat={"frequency": "weekly", "count": 4},
            description="Five-a-side, mixed teams, all levels. Bring indoor shoes.",
        )
        e["dosa"] = self.event(
            p["priya"],
            "Dosa night",
            self.at(7, 18),
            3,
            "centre",
            categories=["food"],
            sky="food",
            visibility=Event.Visibility.FOLLOWERS,
            crowd=(6, 10),
            description="I'm cooking, you bring the drinks. Followers only, my kitchen is small 😄",
        )
        e["sunset"] = self.event(
            p["veera"],
            "Photo walk at the fortress",
            self.at(2, 14),
            2,
            "fortress",
            categories=["culture", "outdoors"],
            sky="snow",
            crowd=(4, 9),
            description="Golden hour is short in November. Any camera works, phones too 📷",
        )
        e["ice_swim"] = self.event(
            p["erkki"],
            "Morning ice swim",
            self.at(1, 8),
            1,
            "rauha",
            categories=["wellbeing", "outdoors"],
            sky="snow",
            crowd=(3, 6),
            description="Every morning at eight. The water is 2 degrees and perfect.",
        )
        e["snowshoe"] = self.event(
            self.s.outdoor,
            "Full moon snowshoe walk",
            self.at(13, 19),
            3,
            "kaukas",
            categories=["outdoors"],
            sky="snow",
            capacity=25,
            crowd=(16, 22),
            interested=(6, 10),
            description="Snowshoes, headlamps off, moonlight on. Hot juice by the fire after.",
        )
        # Past events, with feedback and photos.
        past = {
            "announced_at": self.now - timedelta(days=12),
            "published_at": self.now - timedelta(days=13),
        }
        e["autumn"] = self.event(
            o["lpr_choir"],
            "Autumn concert",
            self.at(-10, 18),
            2,
            "church",
            categories=["music"],
            sky="night",
            crowd=(14, 20),
            **past,
            description="Songs of the season, from Sibelius to the Beatles.",
        )
        e["headlamp"] = self.event(
            o["saimaa_runners"],
            "Headlamp night run",
            self.at(-5, 19),
            2,
            "kaukas",
            categories=["sports", "outdoors"],
            sky="night",
            crowd=(10, 16),
            **past,
            description="8 km in the dark with headlamps. Reflectors on!",
        )
        e["wrapup"] = self.event(
            self.s.outdoor,
            "Kayak season wrap-up",
            self.at(-12, 17),
            4,
            "harbour",
            categories=["outdoors", "community"],
            sky="lake",
            crowd=(15, 22),
            **past,
            description="Last paddle of the year, then sauna and soup.",
        )
        for key, comments in [
            (
                "autumn",
                [
                    "Beautiful, the last song gave me chills",
                    "Lovely evening!",
                    "The church acoustics are perfect for this",
                ],
            ),
            ("headlamp", ["Spooky and fun 👻", "Great route", "More of these please!"]),
            ("wrapup", ["Best soup ever", "Sad the season is over 😢", ""]),
        ]:
            attendees = Profile.objects.filter(attendances__event=e[key], attendances__status=going)
            for index, profile in enumerate(attendees[:9]):
                EventFeedback.objects.create(
                    event=e[key],
                    profile=profile,
                    rating=self.random.choice([4, 5, 5, 5, 3]),
                    comment=comments[index] if index < len(comments) else "",
                )
        self.s.post(
            o["lpr_choir"],
            "Thank you for a full church! 🎶",
            hours_ago=24 * 9,
            pictures=["night", "night", "snow"],
            event=e["autumn"],
            likes=self.some(self.everyone, 10, 18),
        )
        self.s.post(
            p["veera"],
            "Headlamps everywhere 🔦",
            hours_ago=24 * 4,
            pictures=["night", "lake"],
            event=e["headlamp"],
            likes=self.some(self.everyone, 6, 12),
        )
        self.s.post(
            self.s.outdoor,
            "What a way to end the season 🛶",
            hours_ago=24 * 11,
            pictures=["lake", "lake", "fire"],
            event=e["wrapup"],
            likes=self.some(self.everyone, 8, 16),
        )

        # The showcase's own public events, which only had a handful of people going.
        quiet = (
            Event.objects.filter(
                organizer__sample__isnull=False,
                published_at__isnull=False,
                capacity__isnull=True,
                visibility=Event.Visibility.PUBLIC,
                status=Event.Status.ACTIVE,
            )
            .annotate(going=Count("attendances", filter=Q(attendances__status=going)))
            .filter(going__lt=5)
        )
        for event in quiet:
            for profile in self.some(self.everyone, 3, 14):
                if not Attendance.objects.filter(event=event, profile=profile).exists():
                    rsvp(event, profile, going)

        # The viewer's plans: some going, some interested, a few saved.
        for key, wants in [
            ("concert", going),
            ("strategy", going),
            ("snowshoe", going),
            ("market", interested),
            ("pitch", interested),
            ("night_climb", going),
            ("wrapup", going),
            ("autumn", going),
        ]:
            rsvp(e[key], self.me, wants)
        # People the viewer follows going to the same things, so "friends going" shows up.
        for key in ("concert", "strategy", "snowshoe", "market"):
            for friend in self.some(
                [p[h] for h in ("ahmed", "maria", "chen", "ida", "lukas")], 2, 4
            ):
                rsvp(e[key], friend, going)
        for key in ("5k", "drawing", "parcels"):
            SavedEvent.objects.get_or_create(profile=self.me, event=e[key])

        # Questions on a few event pages.
        for key, thread in [
            (
                "concert",
                [
                    ("kaisa", "Is the church heated? 😅"),
                    ("lpr_choir", "Yes! And there's mulled juice in the interval."),
                    ("maria", "Can I buy tickets at the door?"),
                    ("lpr_choir", "If any are left, but most nights sell out."),
                ],
            ),
            (
                "course",
                [
                    ("lukas", "Do I need my own shoes?"),
                    ("saimaa_climbing", "Shoes and chalk are included 👍"),
                ],
            ),
            (
                "5k",
                [
                    ("antti", "Can kids run too?"),
                    ("saimaa_runners", "Of course, under 12s run for free!"),
                    ("henrik", "Is there a costume prize? 🎅"),
                ],
            ),
        ]:
            for handle, body in thread:
                author = self.p.get(handle) or self.o.get(handle)
                self.s.comment(author, body, event=e[key])

        # A month of views on the outdoor club's events, rising towards today.
        today = timezone.localdate()
        for event in Event.objects.filter(organizer=self.s.outdoor, published_at__isnull=False):
            EventViewDay.objects.filter(event=event).delete()
            EventViewDay.objects.bulk_create(
                EventViewDay(
                    event=event,
                    date=today - timedelta(days=day),
                    count=self.random.randint(4, 12) + (30 - day) * self.random.randint(0, 2),
                )
                for day in range(30)
            )
        # RSVPs to its events spread over the month, not all made just now.
        for attendance in Attendance.objects.filter(event__organizer=self.s.outdoor):
            Attendance.objects.filter(pk=attendance.pk).update(
                created_at=self.now - timedelta(days=self.random.randint(0, 29))
            )

    def days_until(self, weekday):
        """Days from today to the next `weekday` (0 is Monday), at least one."""
        return (weekday - timezone.localdate().weekday() - 1) % 7 + 1

    # Posts

    def posts(self):
        everyone = self.everyone + [self.me]
        for index, (handle, body, pictures) in enumerate(POSTS):
            author = self.p.get(handle) or self.o.get(handle)
            post = self.s.post(
                author,
                body,
                hours_ago=1 + index * 5 + self.random.randint(0, 4),
                pictures=pictures,
                likes=self.some(everyone, 2, 24),
            )
            for _ in range(self.random.choice([0, 0, 1, 2, 3, 4])):
                self.s.comment(
                    self.random.choice(self.everyone), self.random.choice(COMMENTS), post=post
                )
        # Someone mentions the viewer.
        self.s.post(
            self.p["maria"],
            f"Thanks @{self.me.handle} for showing me the best sauna in town! 🧖",
            hours_ago=9,
            likes=self.some(everyone, 3, 8),
        )
        # Spread the event announcements over the past days, like the showcase's.
        for post in Post.objects.filter(event__isnull=False, body="", author__in=self.o.values()):
            Post.objects.filter(pk=post.pk).update(
                created_at=self.now - timedelta(hours=self.random.randint(2, 200))
            )

    # What organizers and moderators see

    def organizer_tools(self):
        club = self.s.outdoor
        # A calendar the club already keeps elsewhere, imported and in sync.
        source = CalendarSource.objects.create(
            profile=club,
            url="https://example.com/outdoor-club/calendar.ics",
            added_by=self.viewer,
            synced_at=self.now - timedelta(minutes=35),
        )
        for days, hour, title, place in [
            (6, 10, "Saturday paddle maintenance day", "harbour"),
            (16, 12, "Gear swap and repair café", "library"),
            (27, 9, "Winter hiking first aid course", "kaukas"),
        ]:
            self.event(
                club,
                title,
                self.at(days, hour),
                3,
                place,
                categories=["outdoors"],
                crowd=(3, 8),
                source=source,
                source_uid=f"{title.lower()}@example.com",
            )
        # The club asked for the verified badge; moderators haven't answered yet.
        VerificationRequest.objects.create(
            organization=club,
            requested_by=self.viewer,
            message="We're the official outdoor club of LUT's student union, founded in 1998. "
            "Our board is listed on the union's website.",
        )
        # People the viewer invited to help run the club, who haven't answered yet.
        for handle, role in (("johanna", Membership.Role.EDITOR), ("lukas", Membership.Role.ADMIN)):
            Invitation.objects.create(
                organization=club, invitee=self.p[handle].user, role=role, invited_by=self.viewer
            )
        Membership.objects.get_or_create(
            organization=club,
            user=self.p["petra"].user,
            defaults={"role": Membership.Role.EDITOR},
        )

    def reports(self):
        """A few open reports, so the moderators' queue in the admin isn't empty."""
        larry = self.s.p["loud_larry"]
        spam = Post.objects.filter(author=larry).first()
        for reporter, target, reason, details in [
            (self.viewer, spam, Report.Reason.SPAM, "Posts the same ad every day."),
            (self.p["tiina"].user, spam, Report.Reason.SPAM, ""),
            (self.p["sanna"].user, larry, Report.Reason.SPAM, "Selling things in comments."),
        ]:
            if target is None:
                continue
            Report.objects.create(
                reporter=reporter,
                content_type=ContentType.objects.get_for_model(target),
                object_id=target.pk,
                reason=reason,
                details=details,
            )
