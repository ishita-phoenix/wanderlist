from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserState
from .serializers import BuildSerializer, DiscoverSerializer, PopularityLookupSerializer, StateSerializer
from .services import build_itinerary, discover_places, enrich_discover_with_ai, foursquare_star_popularity


class DiscoverView(APIView):
    def post(self, request):
        serializer = DiscoverSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        results = discover_places(
            data["city"],
            data.get("country", ""),
            data.get("interests", {}),
            data["limit"],
        )
        results = enrich_discover_with_ai(
            data["city"],
            data.get("country", ""),
            results,
            data.get("interests", {}),
        )
        return Response({"results": results})


class PlacePopularityView(APIView):
    """
    Resolve popularityScore from Foursquare Places `rating` (~0–10 → 0–100) when FOURSQUARE_API_KEY is set.
    Otherwise scale the client's `clientRating` (0–5★) to 0–100.
    """

    def post(self, request):
        ser = PopularityLookupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        score, _, raw_rt = foursquare_star_popularity(
            d["name"],
            d["city"],
            d.get("country") or "",
            d.get("lat"),
            d.get("lng"),
        )
        if score is not None:
            return Response({"popularityScore": score, "source": "foursquare", "foursquareRating": raw_rt})
        cr = float(d.get("clientRating") or 4.2)
        cr = max(0.0, min(5.0, cr))
        fallback = round((cr / 5.0) * 100.0, 2)
        return Response({"popularityScore": fallback, "source": "client_stars", "foursquareRating": None})


class BuildItineraryView(APIView):
    def post(self, request):
        serializer = BuildSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        built = build_itinerary(serializer.validated_data)
        return Response(built)


class UserStateView(APIView):
    def get(self, request, user_id: str):
        state = UserState.objects.filter(user_id=user_id).first()
        if not state:
            return Response({"userId": user_id, "preferences": {}, "cityLists": [], "itinerary": None})
        return Response(state.payload)

    def post(self, request, user_id: str):
        incoming = dict(request.data)
        incoming["userId"] = user_id
        serializer = StateSerializer(data=incoming)
        serializer.is_valid(raise_exception=True)
        UserState.objects.update_or_create(
            user_id=user_id,
            defaults={"payload": serializer.validated_data},
        )
        return Response({"saved": True})
