from rest_framework import serializers


class PlaceSerializer(serializers.Serializer):
    id = serializers.CharField(required=False)
    name = serializers.CharField()
    description = serializers.CharField(allow_blank=True, required=False)
    image = serializers.CharField(allow_blank=True, required=False)
    category = serializers.CharField()
    duration = serializers.CharField()
    rating = serializers.FloatField(required=False, default=4.2)
    address = serializers.CharField()
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    popularityScore = serializers.FloatField(required=False, allow_null=True, min_value=0, max_value=100)


class DiscoverSerializer(serializers.Serializer):
    city = serializers.CharField()
    country = serializers.CharField(required=False, allow_blank=True)
    interests = serializers.DictField(child=serializers.BooleanField(), required=False)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=30, default=12)


class BuildSerializer(serializers.Serializer):
    city = serializers.CharField()
    country = serializers.CharField(required=False, allow_blank=True)
    startDate = serializers.DateField()
    endDate = serializers.DateField()
    wakeTime = serializers.TimeField()
    sleepTime = serializers.TimeField()
    activities = PlaceSerializer(many=True)
    preferences = serializers.DictField(
        child=serializers.BooleanField(),
        required=False,
        default=dict,
    )


class PopularityLookupSerializer(serializers.Serializer):
    name = serializers.CharField()
    city = serializers.CharField()
    country = serializers.CharField(allow_blank=True, default="")
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    # Stars already shown in UI (Photon/OSM heuristic, etc.); used only when Foursquare lookup misses (0–5).
    clientRating = serializers.FloatField(required=False, default=4.2, min_value=0, max_value=5)


class StateSerializer(serializers.Serializer):
    userId = serializers.CharField()
    preferences = serializers.DictField(child=serializers.BooleanField(), required=False)
    cityLists = serializers.ListField(required=False)
    itinerary = serializers.DictField(required=False, allow_null=True)
