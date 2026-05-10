from django.conf import settings
from django.db import models


class UserState(models.Model):
    """One saved board per Django user (lists, prefs, itinerary JSON)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="planner_state",
    )
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.user.email or str(self.user.pk)
