from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserState
from .serializers import (
    BuildSerializer,
    DiscoverSerializer,
    LoginSerializer,
    PopularityLookupSerializer,
    RegisterSerializer,
    StateSerializer,
)
from .services import build_itinerary, discover_places, enrich_discover_with_ai, foursquare_star_popularity


class DiscoverView(APIView):
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = BuildSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        built = build_itinerary(serializer.validated_data)
        return Response(built)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        raw_email = ser.validated_data["email"].strip().lower()
        uname = raw_email[:150]
        if User.objects.filter(username__iexact=uname).exists() or User.objects.filter(email__iexact=raw_email).exists():
            return Response({"detail": "An account with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(
            username=uname,
            email=raw_email,
            password=ser.validated_data["password"],
            first_name=(ser.validated_data.get("name") or "").strip()[:150],
        )
        token = Token.objects.create(user=user)
        return Response(
            {
                "token": token.key,
                "userId": str(user.pk),
                "email": user.email,
                "name": user.first_name or user.email.split("@")[0],
            }
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        raw_email = ser.validated_data["email"].strip().lower()
        uname = raw_email[:150]
        pwd = ser.validated_data["password"]
        user = authenticate(request, username=uname, password=pwd)
        if user is None:
            user = User.objects.filter(email__iexact=raw_email).first()
            if user is not None:
                user = authenticate(request, username=user.username, password=pwd)
        if user is None:
            return Response({"detail": "Invalid email or password."}, status=status.HTTP_400_BAD_REQUEST)
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "userId": str(user.pk),
                "email": user.email,
                "name": user.first_name or user.email.split("@")[0],
            }
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({"ok": True})


class UserStateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        state = UserState.objects.filter(user=request.user).first()
        uid = str(request.user.pk)
        if not state:
            return Response({"userId": uid, "preferences": {}, "cityLists": [], "itinerary": None})
        payload = dict(state.payload)
        payload.setdefault("userId", uid)
        return Response(payload)

    def post(self, request):
        uid = str(request.user.pk)
        incoming = dict(request.data)
        incoming["userId"] = uid
        serializer = StateSerializer(data=incoming)
        serializer.is_valid(raise_exception=True)
        UserState.objects.update_or_create(
            user=request.user,
            defaults={"payload": serializer.validated_data},
        )
        return Response({"saved": True})
