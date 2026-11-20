from django.conf import settings
from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.shortcuts import redirect
from django.urls import path, reverse
from django.utils.html import format_html

from . import services
from .demo import DEMO_PASSWORD
from .models import SampleProfile


@admin.register(SampleProfile)
class SampleProfileAdmin(admin.ModelAdmin):
    """The Sample data page: what's there, with buttons to generate a fresh set or delete it."""

    change_list_template = "admin/sampledata/sampleprofile/change_list.html"
    list_display = ["handle", "display_name", "kind", "created_at"]
    # Rows lead to the profile itself (below), not to this marker.
    list_display_links = None
    list_select_related = ["profile"]
    search_fields = ["profile__handle", "profile__display_name"]
    # Profiles are generated and deleted all together, with the buttons.
    actions = None

    @admin.display(ordering="profile__handle")
    def handle(self, sample):
        url = reverse("admin:profiles_profile_change", args=[sample.profile.pk])
        return format_html('<a href="{}">@{}</a>', url, sample.profile.handle)

    @admin.display(ordering="profile__display_name")
    def display_name(self, sample):
        return sample.profile.display_name

    @admin.display(ordering="profile__kind")
    def kind(self, sample):
        return sample.profile.get_kind_display()

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser

    def get_urls(self):
        return [
            path(
                "generate/", self.admin_site.admin_view(self.generate), name="sampledata_generate"
            ),
            path("delete/", self.admin_site.admin_view(self.delete), name="sampledata_delete"),
            *super().get_urls(),
        ]

    def changelist_view(self, request, extra_context=None):
        extra_context = {
            **(extra_context or {}),
            "title": "Sample data",
            "summary": services.summary(),
            "enabled": settings.SAMPLE_DATA_ENABLED,
            "demo_email": services.DEMO_EMAIL,
            "demo_password": DEMO_PASSWORD,
            "status": services.generation_status(),
        }
        return super().changelist_view(request, extra_context)

    def back(self):
        return redirect(reverse("admin:sampledata_sampleprofile_changelist"))

    @staticmethod
    def check_superuser(request):
        if not request.user.is_superuser:
            raise PermissionDenied

    def generate(self, request):
        self.check_superuser(request)
        if request.method != "POST":
            return self.back()
        if not settings.SAMPLE_DATA_ENABLED:
            self.message_user(request, "Sample data is switched off here.", messages.ERROR)
            return self.back()
        if services.start_generating():
            self.message_user(
                request,
                "Generating a fresh set. It takes a minute or two; this page shows when it's done.",
                messages.SUCCESS,
            )
        else:
            self.message_user(request, "A set is being generated already.", messages.WARNING)
        return self.back()

    def delete(self, request):
        self.check_superuser(request)
        if request.method != "POST":
            return self.back()
        if services.generation_status()["started"]:
            self.message_user(
                request, "Wait until the set being generated is done.", messages.WARNING
            )
            return self.back()
        count = services.delete_sample_data()
        self.message_user(
            request, f"Deleted {count} sample profiles and everything they made.", messages.SUCCESS
        )
        return self.back()
