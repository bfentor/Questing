"""Enough people, events and posts to try every feature, on top of the demo data (demo.py).

It's seen through one account (the demo account unless another is given): its feeds,
notifications, organizations and settings all have something in them. Every date is relative
to now: events from a week ago to a month ahead. Pictures are drawn here, so nothing is
downloaded.
"""

import random
from datetime import date, timedelta
from decimal import Decimal
from io import BytesIO

from allauth.account.models import EmailAddress
from django.conf import settings
from django.contrib.gis.geos import Point
from django.db import transaction
from django.utils import timezone
from PIL import Image as PILImage
from PIL import ImageDraw

from accounts.models import User
from events.attendance import rsvp
from events.models import (
    Attendance,
    Category,
    CoHost,
    Event,
    EventFeedback,
    EventViewDay,
    SavedEvent,
)
from events.services import publish_event
from images.models import Image
from images.processing import normalize
from moderation.models import Block, Mute
from notifications.models import Kind, Notification
from notifications.services import attendees_of, managers_of, notify
from posts.models import Comment, LinkPreview, Post, PostImage, PostLike
from posts.text import notify_mentions
from profiles.models import Follow, FollowRequest, Invitation, Membership, Profile
from students.models import StudentStatus, University

from .demo import DEMO_PASSWORD
from .services import mark

# Lappeenranta, where most of the showcase happens.
CAMPUS = (28.0951, 61.0647)

# Colour pairs (top, bottom) for the generated pictures.
SKIES = {
    "lake": ((255, 190, 120), (60, 110, 180)),
    "night": ((30, 20, 70), (210, 70, 130)),
    "forest": ((40, 90, 65), (175, 215, 150)),
    "food": ((245, 210, 160), (165, 90, 50)),
    "snow": ((215, 230, 245), (95, 125, 165)),
    "campus": ((130, 175, 225), (235, 235, 225)),
    "fire": ((40, 25, 30), (240, 130, 40)),
}

# The organizer of the Lahti events.
LAHTI_ORGANIZER = "lahti_students"

# (venue, (lng, lat)): Lahti's centre, then a few towns around it, nearest first.
LAHTI_PLACES = {
    "market": ("Lahti market square", (25.6573, 60.9833)),
    "sibelius": ("Sibelius Hall", (25.6496, 60.9905)),
    "harbour": ("Vesijärvi harbour", (25.6560, 60.9925)),
    "ski_jumps": ("Lahti Sports Centre", (25.6290, 60.9805)),
    "campus": ("LUT University, Lahti campus", (25.6466, 61.0124)),
    "hollola": ("Tiirismaa, Hollola", (25.5200, 60.9950)),
    "orimattila": ("Orimattila", (25.7300, 60.8040)),
    "heinola": ("Heinola", (26.0360, 61.2050)),
}

# The link previews the posts use; they go with the sample data.
SAUNA_GUIDE = "https://example.com/sauna-guide"
LINK_PREVIEWS = [SAUNA_GUIDE]

# handle, name, pronouns, faculty, study year, bio, interests, has a picture
PEOPLE = [
    (
        "aino",
        "Aino Virtanen",
        "she/her",
        "Software Engineering",
        3,
        "Board games, bouldering and too much coffee ☕",
        ["games", "tech", "outdoors"],
        True,
    ),
    (
        "mikko",
        "Mikko Korhonen",
        "he/him",
        "Industrial Engineering",
        2,
        "Volleyball captain. Ask me about the beach league 🏐",
        ["sports", "party"],
        True,
    ),
    (
        "sofia",
        "Sofia Lindqvist",
        "she/her",
        "Business Administration",
        4,
        "Från Åbo, studerar i Villmanstrand. Jazz, fika och språkcafé.",
        ["music", "culture", "food"],
        True,
    ),
    (
        "leo",
        "Leo Nguyen",
        "they/them",
        "Computational Engineering",
        1,
        "Sauna enthusiast. Making friends one löyly at a time.",
        ["wellbeing", "community"],
        False,
    ),
    (
        "emma",
        "Emma Mäkinen",
        "",
        "Chemical Engineering",
        5,
        "Friends only 🌿",
        ["outdoors", "academic"],
        True,
    ),
    ("oskari", "Oskari Heikkinen", "he/him", "Energy Technology", 3, "", ["sports"], False),
    (
        "jonas",
        "Jonas Berg",
        "",
        "Electrical Engineering",
        1,
        "New in town, say hi!",
        ["tech", "games"],
        True,
    ),
    (
        "helmi",
        "Helmi Laine",
        "she/her",
        "Environmental Engineering",
        2,
        "Volunteering at the food bank on Tuesdays.",
        ["volunteering", "community"],
        False,
    ),
    ("loud_larry", "Loud Larry", "", "", None, "Selling notes. DM me.", [], False),
    ("blocked_bob", "Blocked Bob", "", "", None, "", [], False),
]

LONG_POST = """Five things I wish I'd known as a first-year at LUT 🧵

1. The library's group rooms can be booked two weeks ahead, and they go fast before exams.
2. Join at least one club that has nothing to do with your degree. I joined @outdoor_club \
for the kayaks and stayed for the people.
3. The student lunch is the best deal in town. Fridays are pizza day, plan accordingly 🍕
4. Ask questions in lectures. Everyone else has the same question and is too shy.
5. Saimaa is freezing in May. Swim anyway.

Bonus: get a proper winter coat before November, not after. Trust me on this one ❄️

#lut #freshers #studentlife"""


class Showcase:
    def __init__(self, viewer):
        self.viewer = viewer
        self.me = viewer.profile
        self.now = timezone.now()
        self.random = random.Random(7)
        self.categories = {c.slug: c for c in Category.objects.all()}
        self.lut = University.objects.filter(short_name="LUT").first()

    @transaction.atomic
    def build(self):
        self.people()
        self.organizations()
        self.connections()
        self.events()
        self.lahti()
        self.posts()
        self.notifications()

    # Pictures

    def picture(self, sky, size=(1280, 720), hills=True):
        """A gradient landscape with soft circles: different every call, same every run."""
        width, height = size
        (r1, g1, b1), (r2, g2, b2) = SKIES[sky]
        canvas = PILImage.new("RGB", size)
        draw = ImageDraw.Draw(canvas)
        for y in range(height):
            t = y / height
            draw.line(
                [(0, y), (width, y)],
                fill=(int(r1 + (r2 - r1) * t), int(g1 + (g2 - g1) * t), int(b1 + (b2 - b1) * t)),
            )
        glow = PILImage.new("RGBA", size, (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow)
        for _ in range(self.random.randint(6, 14)):
            radius = self.random.randint(width // 40, width // 8)
            x, y = self.random.randint(0, width), self.random.randint(0, height * 2 // 3)
            alpha = self.random.randint(25, 80)
            glow_draw.ellipse(
                [x - radius, y - radius, x + radius, y + radius], fill=(255, 255, 255, alpha)
            )
        if hills:
            for layer in range(2):
                base = height * (0.7 + 0.12 * layer)
                points = [(0, height)]
                for x in range(0, width + 80, 80):
                    points.append((x, base - self.random.randint(0, height // 8)))
                points.append((width, height))
                shade = 20 + 25 * layer
                glow_draw.polygon(points, fill=(shade, shade + 10, shade + 5, 200))
        canvas = PILImage.alpha_composite(canvas.convert("RGBA"), glow).convert("RGB")
        buffer = BytesIO()
        canvas.save(buffer, format="PNG")
        buffer.seek(0)
        return Image.objects.create(uploader=self.viewer, file=normalize(buffer))

    def avatar(self, sky):
        return self.picture(sky, size=(400, 400), hills=False)

    # People and organizations

    def people(self):
        adult = {
            "birth_date": date(2001, 3, 9),
            "terms_version": settings.TERMS_VERSION,
            "terms_accepted_at": self.now,
            "onboarded_at": self.now,
        }
        skies = list(SKIES)
        self.p = {}
        for index, (
            handle,
            name,
            pronouns,
            faculty,
            year,
            bio,
            interests,
            has_picture,
        ) in enumerate(PEOPLE):
            user = User.objects.create_user(
                email=f"{handle}@sidequest.test", password=DEMO_PASSWORD, **adult
            )
            EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)
            profile = user.profile
            profile.handle = handle
            profile.display_name = name
            profile.pronouns = pronouns
            profile.bio = bio
            profile.faculty = faculty
            profile.study_year = year
            profile.university = "LUT University" if faculty else ""
            profile.is_private = handle in ("emma", "oskari")
            if has_picture:
                profile.avatar = self.avatar(skies[index % len(skies)])
            if handle == "aino":
                profile.instagram = "aino.climbs"
                profile.cover = self.picture("lake", size=(1500, 500))
            if handle == "sofia":
                profile.website = "https://example.com/sofia"
            profile.save()
            profile.interests.set(self.categories[slug] for slug in interests)
            self.p[handle] = profile
        mark(*self.p.values())

        # The viewer: a verified LUT student with a filled-in profile.
        # A new account is named after its email; give the demo account a proper name.
        if self.me.display_name == self.viewer.email.split("@")[0]:
            self.me.display_name = "Demo Student"
        self.me.bio = self.me.bio or "Trying out every corner of Sidequest."
        self.me.faculty = self.me.faculty or "Software Engineering"
        self.me.study_year = self.me.study_year or 2
        self.me.university = self.me.university or "LUT University"
        self.me.avatar = self.me.avatar or self.avatar("campus")
        self.me.save()
        self.me.interests.add(self.categories["games"], self.categories["outdoors"])
        if self.lut is not None:
            StudentStatus.objects.get_or_create(
                user=self.viewer,
                defaults={
                    "university": self.lut,
                    "email": "student@student.lut.fi",
                    "verified_at": self.now,
                },
            )

    def organizations(self):
        union = Profile.objects.get(handle="student_union")
        union.verified = True
        union.bio = "Events, advocacy and the best parties on campus. Every student is welcome."
        union.website = "https://example.com/union"
        union.instagram = "lut.union"
        union.avatar = union.avatar or self.avatar("night")
        union.cover = union.cover or self.picture("campus", size=(1500, 500))
        union.save()

        def organization(handle, name, bio, sky, admins, editors=(), verified=False):
            org = Profile.objects.create(
                kind=Profile.Kind.ORGANIZATION,
                handle=handle,
                display_name=name,
                bio=bio,
                verified=verified,
                avatar=self.avatar(sky),
                cover=self.picture(sky, size=(1500, 500)),
            )
            mark(org)
            for user in admins:
                Membership.objects.create(organization=org, user=user, role=Membership.Role.ADMIN)
            for user in editors:
                Membership.objects.create(organization=org, user=user, role=Membership.Role.EDITOR)
            return org

        self.union = union
        # Run by the viewer: organizer tools, the dashboard, posting as an organization.
        self.outdoor = organization(
            "outdoor_club",
            "LUT Outdoor Club",
            "Kayaking, hiking and bonfires around Saimaa.",
            "forest",
            admins=[self.viewer],
            editors=[self.p["aino"].user],
        )
        self.cafe = organization(
            "cafe_saimaa",
            "Café Saimaa",
            "Coffee, pulla and a language café every Thursday.",
            "food",
            admins=[self.p["sofia"].user],
            verified=True,
        )
        # Invites the viewer, who hasn't answered yet.
        self.guild = organization(
            "tech_guild",
            "Tech Guild",
            "Hackathons, coding dojos and mentoring.",
            "night",
            admins=[self.p["leo"].user],
        )
        Invitation.objects.create(
            organization=self.guild,
            invitee=self.viewer,
            role=Membership.Role.EDITOR,
            invited_by=self.p["leo"].user,
        )

    def follow(self, follower, followee):
        Follow.objects.get_or_create(follower=follower, followee=followee)

    def connections(self):
        p = self.p
        everyone = [p[h] for h in ("aino", "mikko", "sofia", "leo", "emma", "jonas", "helmi")]
        for person in everyone:
            self.follow(person, self.union)
            self.follow(person, self.outdoor)
        for followee in (
            p["aino"],
            p["mikko"],
            p["sofia"],
            p["leo"],
            p["emma"],
            p["loud_larry"],
            self.union,
            self.cafe,
            self.guild,
        ):
            self.follow(self.me, followee)
        # People who follow the viewer back, each with a notification.
        for follower in (p["aino"], p["mikko"], p["sofia"], p["leo"]):
            self.follow(follower, self.me)
            notify([self.viewer], Kind.NEW_FOLLOWER, actor=follower)
        # Friends of friends, for the suggestions screen.
        for person in (p["aino"], p["mikko"], p["sofia"]):
            self.follow(person, p["jonas"])
            self.follow(person, p["helmi"])
        self.follow(p["aino"], p["mikko"])
        self.follow(p["mikko"], p["aino"])
        self.follow(p["sofia"], p["aino"])
        # Emma is private and accepted the viewer; Oskari hasn't answered yet.
        notify([self.viewer], Kind.FOLLOW_ACCEPTED, actor=p["emma"])
        FollowRequest.objects.create(requester=self.me, target=p["oskari"])
        Mute.objects.create(muter=self.me, muted=p["loud_larry"])
        Block.objects.create(blocker=self.me, blocked=p["blocked_bob"])
        notify([self.viewer], Kind.ORGANIZATION_INVITE, actor=self.guild)

    # Events

    def event(
        self, organizer, title, starts_in, hours, *, place=CAMPUS, categories=(), sky=None, **fields
    ):
        starts_at = self.now + timedelta(hours=starts_in)
        lng, lat = place if place else (None, None)
        return publish_event(
            organizer=organizer,
            title=title,
            starts_at=starts_at,
            ends_at=starts_at + timedelta(hours=hours),
            location=Point(lng, lat, srid=4326) if place else None,
            categories=[self.categories[slug] for slug in categories],
            cover=self.picture(sky) if sky else None,
            **fields,
        )

    def near_campus(self):
        """A spot a short walk from campus, so the nearby map isn't one pile of pins."""
        return (
            CAMPUS[0] + self.random.uniform(-0.03, 0.03),
            CAMPUS[1] + self.random.uniform(-0.015, 0.015),
        )

    def events(self):
        p, me = self.p, self.me
        jitter = self.near_campus

        self.gala = self.event(
            self.union,
            "Winter Gala",
            150,
            6,
            sky="night",
            place=jitter(),
            categories=["party", "music"],
            venue_name="Lappeenranta City Hall",
            address="Kauppakatu 1, Lappeenranta",
            price=Decimal("25.00"),
            ticket_url="https://example.com/tickets/winter-gala",
            min_age=18,
            capacity=250,
            co_hosts=[self.cafe],
            description=(
                "The biggest night of the term ✨\n\nThree-course dinner, a live band and "
                "dancing until late. Dress code: smart casual.\n\nCoffee and dessert by "
                "@cafe_saimaa. #wintergala #lut"
            ),
        )
        CoHost.objects.filter(event=self.gala).update(accepted_at=self.now)

        self.kayak = self.event(
            self.outdoor,
            "Evening kayak tour",
            5,
            3,
            sky="lake",
            place=(28.1665, 61.0532),
            categories=["outdoors", "sports"],
            venue_name="Myllysaari beach",
            price=Decimal("10.00"),
            capacity=4,
            description="Two hours on Saimaa as the sun goes down. Kayaks, paddles and life "
            "jackets provided. No experience needed! #kayaking",
        )
        self.study = self.event(
            p["aino"],
            "Algorithms study group",
            26,
            2,
            place=jitter(),
            categories=["academic"],
            venue_name="LUT Library, room 2310",
            students_of=self.lut,
            repeat={"frequency": "weekly", "count": 6},
            description="Working through the weekly problem sets together. Bring your laptop.",
        )
        self.thesis = self.event(
            self.union,
            "Thesis writing workshop",
            72,
            3,
            place=jitter(),
            categories=["academic", "career"],
            venue_name="Main campus auditorium",
            status=Event.Status.POSTPONED,
            description="Structure, sources and staying sane. New date coming soon.",
        )
        self.volleyball = self.event(
            p["mikko"],
            "Beach volleyball tournament",
            48,
            4,
            sky="lake",
            place=jitter(),
            categories=["sports"],
            venue_name="Campus beach courts",
            status=Event.Status.CANCELLED,
            description="Cancelled because of the storm warning, sorry everyone! 🌧️",
        )
        self.sauna = self.event(
            p["leo"],
            "Smoke sauna evening",
            96,
            4,
            sky="fire",
            place=(28.1820, 61.0645),
            categories=["wellbeing"],
            venue_name="Lake Saimaa harbour",
            capacity=6,
            visibility=Event.Visibility.FOLLOWERS,
            description="For people who follow me only — the sauna fits six. Bring a towel 🧖",
        )
        self.draft = self.event(
            self.outdoor,
            "Lapland hiking trip",
            24 * 30,
            72,
            sky="snow",
            place=(24.6, 68.4),
            categories=["outdoors"],
            venue_name="Pallas-Yllästunturi",
            capacity=12,
            price=Decimal("180.00"),
            published_at=None,
            description="Draft: three days of fells and northern lights. Bus from campus.",
        )
        self.scheduled = self.event(
            self.outdoor,
            "Ice swimming for beginners",
            24 * 10,
            2,
            sky="snow",
            place=(28.1665, 61.0532),
            categories=["wellbeing", "outdoors"],
            venue_name="Myllysaari winter swimming spot",
            published_at=self.now + timedelta(days=2),
            description="Scheduled to be announced in two days.",
        )
        self.dojo = self.event(
            self.guild,
            "Remote coding dojo",
            50,
            2,
            place=None,
            categories=["tech"],
            online_url="https://example.com/meet/coding-dojo",
            description="Pair programming on a kata, online. All levels welcome. #tech",
        )
        self.pancakes = self.event(
            self.cafe,
            "Free pancake breakfast",
            40,
            2,
            sky="food",
            place=jitter(),
            categories=["food", "community"],
            venue_name="Café Saimaa",
            co_hosts=[self.outdoor],
            description="On the house for students, while the batter lasts 🥞",
        )
        self.bouldering = self.event(
            p["mikko"],
            "Bouldering open session",
            -1,
            3,
            place=jitter(),
            categories=["sports"],
            venue_name="Campus climbing wall",
            description="Happening now, drop in any time!",
        )
        self.picnic = self.event(
            p["aino"],
            "Aino's birthday picnic",
            24 * 8,
            4,
            place=jitter(),
            categories=["food"],
            venue_name="Linnoitus fortress park",
            visibility=Event.Visibility.UNLISTED,
            description="Only for people with the link 🎂",
        )
        # Past events: no announcement now, they already happened.
        past = {
            "announced_at": self.now - timedelta(days=9),
            "published_at": self.now - timedelta(days=14),
        }
        self.quiz = self.event(
            self.union,
            "Pub quiz",
            -23,
            3,
            place=jitter(),
            categories=["games", "party"],
            venue_name="Student union building",
            **past,
            description="Teams of up to five. Prizes for the top three! #pubquiz",
        )
        self.bonfire = self.event(
            self.outdoor,
            "Autumn bonfire",
            -24 * 8,
            4,
            sky="fire",
            place=jitter(),
            categories=["outdoors", "community"],
            venue_name="Huhtiniemi beach",
            **past,
            description="Sausages, marshmallows and ghost stories 🔥",
        )

        going, interested = Attendance.Status.GOING, Attendance.Status.INTERESTED
        for profile, wants in [
            (me, going),
            (p["aino"], going),
            (p["mikko"], going),
            (p["sofia"], interested),
            (p["leo"], going),
            (p["emma"], going),
        ]:
            rsvp(self.gala, profile, wants)
        # Full, with two people on the waitlist.
        for profile in (p["aino"], p["mikko"], p["sofia"], p["leo"], p["jonas"], p["helmi"]):
            rsvp(self.kayak, profile, going)
        for event, profile, wants in [
            (self.study, me, interested),
            (self.study, p["jonas"], going),
            (self.thesis, me, going),
            (self.thesis, p["helmi"], interested),
            (self.volleyball, me, going),
            (self.volleyball, p["mikko"], going),
            (self.sauna, me, going),
            (self.sauna, p["aino"], going),
            (self.dojo, me, interested),
            (self.dojo, p["leo"], going),
            (self.pancakes, p["sofia"], going),
            (self.bouldering, me, interested),
            (self.bouldering, p["aino"], going),
            (self.picnic, me, going),
            (self.quiz, me, going),
            (self.quiz, p["aino"], going),
            (self.quiz, p["mikko"], going),
            (self.bonfire, p["aino"], going),
            (self.bonfire, p["mikko"], going),
            (self.bonfire, p["sofia"], going),
            (self.bonfire, p["leo"], going),
        ]:
            rsvp(event, profile, wants)
        for event in (self.gala, self.sauna, self.dojo):
            SavedEvent.objects.create(profile=me, event=event)

        # How people rated the past events; the viewer hasn't rated the quiz yet.
        for event, profile, rating, comment in [
            (self.quiz, p["aino"], 5, "So much fun, the music round was brilliant!"),
            (self.quiz, p["mikko"], 4, ""),
            (self.bonfire, p["aino"], 5, "Best night of the term!"),
            (self.bonfire, p["mikko"], 4, "Great vibes, a bit cold."),
            (self.bonfire, p["sofia"], 3, "Needed more marshmallows 😄"),
            (self.bonfire, p["leo"], 5, ""),
        ]:
            EventFeedback.objects.create(
                event=event, profile=profile, rating=rating, comment=comment
            )

        # Two weeks of page views for the outdoor club's dashboard.
        today = timezone.localdate()
        for event in (self.kayak, self.bonfire, self.scheduled):
            EventViewDay.objects.bulk_create(
                EventViewDay(
                    event=event, date=today - timedelta(days=day), count=self.random.randint(3, 40)
                )
                for day in range(14)
            )

        # Questions on the gala's page.
        self.comment(p["sofia"], "Is there a dress code?", event=self.gala)
        self.comment(self.union, "Smart casual! Ties optional 🎩", event=self.gala)
        self.comment(p["aino"], f"@{p['sofia'].handle} let's go together!", event=self.gala)

    def lahti(self):
        """A second town, at distances that fill each of the Nearby tab's radii differently."""
        handles = ["aino", "mikko", "helmi", "outdoor_club"]
        p = {profile.handle: profile for profile in Profile.objects.filter(handle__in=handles)}
        club = Profile.objects.create(
            kind=Profile.Kind.ORGANIZATION,
            handle=LAHTI_ORGANIZER,
            display_name="LUT Lahti Students",
            bio="Events for everyone on the Lahti campus.",
            avatar=self.avatar("lake"),
            cover=self.picture("lake", size=(1500, 500)),
        )
        mark(club)
        Membership.objects.create(
            organization=club, user=p["helmi"].user, role=Membership.Role.ADMIN
        )
        self.follow(self.me, club)
        for slug, organizer, title, starts_in, hours, extra in [
            (
                "market",
                club,
                "Christmas market stroll",
                50,
                3,
                {
                    "categories": ["food", "culture"],
                    "sky": "snow",
                    "description": "Glögi, gingerbread and stalls on the market square 🎄",
                },
            ),
            (
                "sibelius",
                club,
                "Lakeside jazz night",
                4,
                3,
                {
                    "categories": ["music"],
                    "sky": "night",
                    "price": Decimal("15.00"),
                    "description": "A student big band by Lake Vesijärvi. Doors at 19.",
                },
            ),
            (
                "harbour",
                club,
                "Harbour sauna and ice swim",
                28,
                3,
                {
                    "categories": ["wellbeing", "outdoors"],
                    "capacity": 10,
                    "description": "Sauna, then a dip through the ice. Towels provided.",
                },
            ),
            (
                "ski_jumps",
                p["mikko"],
                "Ski jump stairs workout",
                20,
                1,
                {
                    "categories": ["sports"],
                    "description": "Up and down the ski jump stairs. Brutal, but what a view.",
                },
            ),
            (
                "campus",
                club,
                "Career breakfast",
                70,
                2,
                {
                    "categories": ["career"],
                    "students_of": self.lut,
                    "capacity": 30,
                    "description": "Coffee with alumni from local companies. Students only.",
                },
            ),
            (
                "hollola",
                p["outdoor_club"],
                "Tiirismaa day hike",
                24 * 4,
                6,
                {
                    "categories": ["outdoors"],
                    "sky": "forest",
                    "description": "The highest point in southern Finland. Lunch by the fire.",
                },
            ),
            (
                "orimattila",
                p["aino"],
                "Farm visit and pancakes",
                24 * 6,
                4,
                {
                    "categories": ["food", "community"],
                    "sky": "food",
                    "description": "Meet the animals, then pancakes with fresh jam 🥞",
                },
            ),
            (
                "heinola",
                p["outdoor_club"],
                "River paddle in Heinola",
                24 * 8,
                5,
                {
                    "categories": ["outdoors", "sports"],
                    "sky": "lake",
                    "description": "Just outside the widest search, about 30 km from Lahti.",
                },
            ),
        ]:
            venue, place = LAHTI_PLACES[slug]
            event = self.event(
                organizer, title, starts_in, hours, place=place, venue_name=venue, **extra
            )
            # One to three people going, so the cards don't all look the same.
            for handle in ("aino", "mikko", "helmi")[: 1 + starts_in % 3]:
                rsvp(event, p[handle], Attendance.Status.GOING)
            if slug == "sibelius":
                rsvp(event, self.me, Attendance.Status.GOING)

    # Posts

    def post(
        self,
        author,
        body="",
        *,
        hours_ago,
        pictures=(),
        event=None,
        likes=(),
        edited=False,
        preview=None,
    ):
        post = Post.objects.create(author=author, body=body, event=event, link_preview=preview)
        for position, sky in enumerate(pictures):
            PostImage.objects.create(post=post, image=self.picture(sky), position=position)
        notify_mentions(post.body, author=author, post=post)
        for profile in likes:
            self.like(profile, post)
        created = self.now - timedelta(hours=hours_ago)
        Post.objects.filter(pk=post.pk).update(
            created_at=created, edited_at=created + timedelta(minutes=20) if edited else None
        )
        return post

    def like(self, profile, post):
        _like, created = PostLike.objects.get_or_create(post=post, profile=profile)
        if created:
            notify(managers_of(post.author), Kind.REACTION, actor=profile, post=post)

    def comment(self, author, body, *, post=None, event=None):
        Comment.objects.create(author=author, body=body, post=post, event=event)
        owner = post.author if post else event.organizer
        notify(managers_of(owner), Kind.COMMENT, actor=author, post=post, event=event)
        notify_mentions(body, author=author, post=post, event=event)

    def posts(self):
        p, me = self.p, self.me
        friends = [p["aino"], p["mikko"], p["sofia"], p["leo"]]

        # Spread the posts publish_event made over the last few days, so the feed isn't all "now".
        for post in Post.objects.filter(event__isnull=False, body="", author__sample__isnull=False):
            Post.objects.filter(pk=post.pk).update(
                created_at=self.now - timedelta(hours=self.random.randint(2, 90))
            )

        games = self.post(
            p["aino"],
            "Who's up for #boardgames this week? I'm bringing Wingspan 🐦 "
            f"@{p['mikko'].handle} you still owe me a rematch",
            hours_ago=6,
            likes=[p["mikko"], p["sofia"]],
        )
        self.comment(p["mikko"], "Rematch is ON. Bringing Catan too.", post=games)
        self.comment(me, "Count me in!", post=games)

        self.post(
            p["sofia"],
            "Morning light over Saimaa before my 8am lecture ☀️ #saimaa #lappeenranta",
            hours_ago=20,
            pictures=["lake"],
            likes=[p["aino"], p["leo"], me],
        )
        self.post(
            self.union,
            "Thank you to all 40 clubs at last week's freshers' fair! 📸 #lut #freshers",
            hours_ago=50,
            pictures=["campus", "campus", "night", "lake"],
            likes=[p["aino"], p["mikko"], p["sofia"], p["leo"], p["emma"]],
        )
        self.post(
            p["mikko"],
            "New beach volleyball nets are up 🏐 #volleyball",
            hours_ago=74,
            pictures=["lake", "campus"],
            likes=[p["aino"]],
        )
        guide = LinkPreview.objects.create(
            url=SAUNA_GUIDE,
            title="A beginner's guide to sauna etiquette",
            description="How hot, how long, and what to do between rounds.",
            site_name="Example Magazine",
        )
        self.post(
            p["leo"],
            "Sending this to everyone coming to the smoke sauna 🧖 https://example.com/sauna-guide",
            hours_ago=28,
            preview=guide,
            likes=[me],
        )
        tips = self.post(
            p["aino"],
            LONG_POST,
            hours_ago=96,
            edited=True,
            likes=[p["mikko"], p["sofia"], p["leo"], p["jonas"], p["helmi"], me],
        )
        self.comment(p["jonas"], "Number 5 is so true 🥶", post=tips)
        self.comment(p["helmi"], "Saving this for next year's freshers!", post=tips)
        self.post(
            p["sofia"],
            "Någon som vill öva svenska över en fika? ☕ Torsdagar kl. 16 på "
            "@cafe_saimaa! #språkcafé",
            hours_ago=120,
            likes=[p["leo"]],
        )
        self.post(
            p["mikko"],
            "Kuka lähtee huomenna salille? 💪 #treeni",
            hours_ago=26,
            likes=[p["aino"]],
        )
        self.post(
            p["emma"],
            "Lab results finally make sense 🧪 Celebrating with pulla.",
            hours_ago=30,
            pictures=["food"],
            likes=[me],
        )
        self.post(
            self.cafe,
            "Cinnamon buns fresh out of the oven every morning from 8 🥐 #pulla",
            hours_ago=55,
            pictures=["food", "food", "campus"],
            likes=[p["sofia"], p["leo"]],
        )
        hackathon = self.post(
            self.guild,
            "We're looking for mentors for the spring hackathon. Reply here! #hackathon #tech",
            hours_ago=70,
        )
        self.comment(p["leo"], f"@{me.handle} you'd be great at this 👀", post=hackathon)
        self.post(
            self.outdoor,
            "Bonfire photos are up! Thanks for coming 🔥",
            hours_ago=24 * 7,
            pictures=["fire", "fire"],
            event=self.bonfire,
            likes=friends,
        )
        self.post(
            p["aino"],
            "Quiz night photos 📸 we came SECOND",
            hours_ago=18,
            pictures=["night", "night", "fire"],
            event=self.quiz,
            likes=[p["mikko"], me],
        )
        self.post(p["loud_larry"], "BUY MY NOTES!!! DM ME", hours_ago=3)
        self.post(p["jonas"], "Just moved to Lappeenranta, any tips? 🙂", hours_ago=40)

        # The viewer's own posts: one that people reacted to, and one sharing an event.
        welcome = self.post(
            me,
            "First week on Sidequest and I've already found three new clubs! Thanks "
            "@student_union 🙌",
            hours_ago=24 * 6,
            likes=friends,
        )
        self.comment(p["aino"], "Welcome!! 🎉", post=welcome)
        self.comment(p["sofia"], "See you at the gala?", post=welcome)
        self.post(
            me, "Who else is going? 💃", hours_ago=22, event=self.gala, likes=[p["aino"], p["emma"]]
        )

    # Notifications the services above don't send by themselves

    def notifications(self):
        p, me = self.p, [self.viewer]
        notify(me, Kind.EVENT_CHANGED, actor=self.union, event=self.gala)
        notify(attendees_of(self.thesis), Kind.EVENT_POSTPONED, actor=self.union, event=self.thesis)
        notify(
            attendees_of(self.volleyball),
            Kind.EVENT_CANCELLED,
            actor=p["mikko"],
            event=self.volleyball,
        )
        notify(me, Kind.EVENT_REMINDER, event=self.bouldering)
        notify(me, Kind.FEEDBACK_REQUEST, event=self.quiz)
        notify(me, Kind.WAITLIST_PROMOTED, event=self.sauna)
        # The demo account gets everything from Aino, posts too.
        Follow.objects.filter(follower=self.viewer.profile, followee=p["aino"]).update(
            notify=Follow.Notify.ALL
        )
        aino_post = Post.objects.filter(author=p["aino"]).order_by("-created_at").first()
        if aino_post:
            notify(me, Kind.NEW_POST, actor=p["aino"], post=aino_post)
        # The daily suggestions carry their count in the message.
        notify(me, Kind.INTEREST_EVENTS, message="3")
        notify(me, Kind.NEARBY_EVENTS, message="4")
        notify(
            attendees_of(self.gala),
            Kind.ANNOUNCEMENT,
            actor=self.union,
            event=self.gala,
            message="Doors open at 18:30. Bring your student card for the welcome drink! 🥂",
        )

        spread_inbox(self.viewer, self.now)


# How many of the newest notifications are left unread, like after a few days away.
UNREAD = 8


def spread_inbox(user, now):
    """Newest first, a couple of hours apart, the newest few unread: a realistic inbox."""
    inbox = Notification.objects.filter(recipient=user).order_by("-pk")
    for index, notification in enumerate(inbox):
        created = now - timedelta(minutes=7 + index * 110)
        Notification.objects.filter(pk=notification.pk).update(
            created_at=created, read_at=None if index < UNREAD else created
        )
