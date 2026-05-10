from django.http import JsonResponse
from django.urls import re_path

from .views import BuildItineraryView, DiscoverView, PlacePopularityView, UserStateView

urlpatterns = [
    # Optional trailing slash — matches both `/api/build` and `/api/build/` after proxying.
    re_path(r"^health/?$", lambda request: JsonResponse({"ok": True})),
    re_path(r"^popularity/?$", PlacePopularityView.as_view()),
    re_path(r"^discover/?$", DiscoverView.as_view()),
    re_path(r"^build/?$", BuildItineraryView.as_view()),
    re_path(r"^state/(?P<user_id>[^/]+)/?$", UserStateView.as_view()),
]
