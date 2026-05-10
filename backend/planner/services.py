import json
import math
import os
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

import requests
from django.conf import settings

NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
PHOTON_BASE = "https://photon.komoot.io"
OPENVERSE_BASE = "https://api.openverse.org/v1/images/"
ORS_MATRIX_BASE = "https://api.openrouteservice.org/v2/matrix"
FOURSQUARE_BASE = "https://api.foursquare.com/v3/places/search"
WIKIMEDIA_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary"
USER_AGENT = os.getenv("APP_USER_AGENT", "wanderlist/1.0 (non-commercial demo)")

DEFAULT_DISCOVER_MIX = ["landmarks", "museums", "food", "nature", "history", "shopping"]


def _dedupe_search_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Same venue from multiple APIs — keep first, key by rounded coords + name."""
    seen = set()
    out: List[Dict[str, Any]] = []
    for x in items:
        try:
            lat = round(float(x.get("lat", 0)), 4)
            lng = round(float(x.get("lng", 0)), 4)
        except (TypeError, ValueError):
            continue
        name = (x.get("name") or "").strip().lower()[:100]
        key = (lat, lng, name)
        if key in seen:
            continue
        seen.add(key)
        out.append(x)
    return out

# Category display names for better Wikimedia/image queries
CATEGORY_KEYWORDS = {
    "food": "restaurant cuisine food",
    "museums": "museum",
    "landmarks": "landmark monument",
    "nature": "park nature garden",
    "nightlife": "nightlife bar",
    "shopping": "shopping market",
    "art": "art gallery",
    "history": "historic heritage",
    "adventure": "adventure outdoor",
    "relaxation": "spa beach relaxation",
}


def geocode_city(city: str, country: str = "") -> Optional[Tuple[float, float]]:
    query = f"{city}, {country}".strip(", ")
    resp = requests.get(
        f"{NOMINATIM_BASE}/search",
        params={"q": query, "format": "jsonv2", "limit": 1},
        headers={"User-Agent": USER_AGENT},
        timeout=20,
    )
    resp.raise_for_status()
    rows = resp.json()
    if not rows:
        return None
    return float(rows[0]["lat"]), float(rows[0]["lon"])


@lru_cache(maxsize=256)
def geocode_city_bbox(city: str, country: str = "") -> Optional[Tuple[float, float, float, float]]:
    """
    Return Photon/Nominatim bbox: (min_lon, min_lat, max_lon, max_lat) for the city area.
    Nominatim boundingbox order: south, north, west, east.
    """
    query = f"{city}, {country}".strip(", ")
    if not query:
        return None
    try:
        resp = requests.get(
            f"{NOMINATIM_BASE}/search",
            params={"q": query, "format": "jsonv2", "limit": 1},
            headers={"User-Agent": USER_AGENT},
            timeout=20,
        )
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            return None
        row = rows[0]
        bb = row.get("boundingbox")
        if bb and len(bb) >= 4:
            south, north, west, east = map(float, bb)
            return (west, south, east, north)
        lat, lon = float(row["lat"]), float(row["lon"])
        delta = 0.18
        return (lon - delta, lat - delta, lon + delta, lat + delta)
    except Exception:
        return None


def _point_in_bbox(lon: float, lat: float, bbox: Tuple[float, float, float, float]) -> bool:
    min_lon, min_lat, max_lon, max_lat = bbox
    return min_lon <= lon <= max_lon and min_lat <= lat <= max_lat


def _photon_osm_to_category(osm_key: str, osm_value: str) -> str:
    k = f"{osm_key}:{osm_value}".lower()
    if any(x in k for x in ("museum", "gallery", "artwork")):
        return "museums"
    if any(x in k for x in ("restaurant", "cafe", "fast_food", "bar", "pub", "food")):
        return "food"
    if any(x in k for x in ("park", "garden", "forest", "nature", "beach")):
        return "nature"
    if any(x in k for x in ("shop", "mall", "marketplace", "department_store")):
        return "shopping"
    if any(x in k for x in ("historic", "castle", "ruins", "archaeological", "monument", "memorial")):
        return "history"
    if any(x in k for x in ("hotel", "hostel", "guest")):
        return "landmarks"
    return "landmarks"


def _photon_feature_to_item(
    feat: Dict[str, Any], city: str, country: str, bbox: Tuple[float, float, float, float]
) -> Optional[Dict[str, Any]]:
    geom = feat.get("geometry") or {}
    gtype = (geom.get("type") or "").lower()
    coords = geom.get("coordinates")
    if not coords:
        return None
    if gtype == "point" and len(coords) >= 2:
        lon, lat = float(coords[0]), float(coords[1])
    else:
        return None
    if not _point_in_bbox(lon, lat, bbox):
        return None
    props = feat.get("properties") or {}
    name = (props.get("name") or "").strip()
    if not name:
        return None
    osm_id = props.get("osm_id")
    osm_type = props.get("osm_type") or "x"
    pid = f"photon-{osm_type}-{osm_id}" if osm_id is not None else f"photon-{round(lon, 5)}-{round(lat, 5)}-{name[:40]}"
    osm_key = str(props.get("osm_key") or "")
    osm_value = str(props.get("osm_value") or "")
    category = _photon_osm_to_category(osm_key, osm_value)
    street = props.get("street") or ""
    housenumber = props.get("housenumber") or ""
    line1 = " ".join(x for x in [street, housenumber] if x).strip()
    locality = props.get("city") or props.get("town") or props.get("village") or props.get("locality") or ""
    addr = ", ".join(
        x for x in [line1, locality, props.get("postcode"), country or props.get("country")] if x
    )
    if not addr:
        addr = f"{city}, {country}".strip(", ")
    rating = round(min(5.0, 3.7 + (len(name) % 13) / 10), 1)
    return {
        "id": pid,
        "name": name,
        "description": f"Place in {city}.",
        "image": _get_best_image(name, city, category),
        "category": category,
        "duration": duration_for_category(category),
        "rating": rating,
        "address": addr,
        "lat": lat,
        "lng": lon,
    }


def _search_photon(
    city: str, country: str, query: str, limit: int, bbox: Optional[Tuple[float, float, float, float]]
) -> List[Dict[str, Any]]:
    if not bbox or not query.strip():
        return []
    min_lon, min_lat, max_lon, max_lat = bbox
    bbox_str = f"{min_lon},{min_lat},{max_lon},{max_lat}"
    try:
        resp = requests.get(
            f"{PHOTON_BASE}/api",
            params={
                "q": query.strip(),
                "limit": min(50, max(limit * 4, 15)),
                "bbox": bbox_str,
                "lang": "en",
            },
            headers={"User-Agent": USER_AGENT},
            timeout=22,
        )
        if resp.status_code != 200:
            return []
        data = resp.json()
        features = data.get("features") or []
        items: List[Dict[str, Any]] = []
        for feat in features:
            item = _photon_feature_to_item(feat, city, country, bbox)
            if item:
                items.append(item)
        return _dedupe_search_items(items)
    except Exception:
        return []


def _search_nominatim_in_bbox(
    city: str, country: str, query: str, limit: int, bbox: Tuple[float, float, float, float]
) -> List[Dict[str, Any]]:
    """Bounded Nominatim search inside the same bbox as Photon (min_lon, min_lat, max_lon, max_lat)."""
    min_lon, min_lat, max_lon, max_lat = bbox
    # viewbox: min_lon, max_lat, max_lon, min_lat (Nominatim docs)
    viewbox = f"{min_lon},{max_lat},{max_lon},{min_lat}"
    try:
        resp = requests.get(
            f"{NOMINATIM_BASE}/search",
            params={
                "q": f"{query} {city}".strip(),
                "format": "jsonv2",
                "addressdetails": 1,
                "limit": min(25, max(limit * 2, 10)),
                "bounded": 1,
                "viewbox": viewbox,
            },
            headers={"User-Agent": USER_AGENT},
            timeout=20,
        )
        resp.raise_for_status()
        rows = resp.json()
        items: List[Dict[str, Any]] = []
        for row in rows:
            try:
                rlon, rlat = float(row["lon"]), float(row["lat"])
            except (KeyError, TypeError, ValueError):
                continue
            if not _point_in_bbox(rlon, rlat, bbox):
                continue
            name = row.get("name") or row.get("display_name", "").split(",")[0]
            if not name:
                continue
            class_type = f"{row.get('class', '')}:{row.get('type', '')}".lower()
            category = "landmarks"
            if any(k in class_type for k in ["museum", "gallery"]):
                category = "museums"
            elif any(k in class_type for k in ["restaurant", "cafe", "food", "bar"]):
                category = "food"
            elif any(k in class_type for k in ["park", "garden", "nature"]):
                category = "nature"
            elif any(k in class_type for k in ["shop", "mall", "market"]):
                category = "shopping"
            elif any(k in class_type for k in ["historic", "heritage", "castle"]):
                category = "history"
            items.append(
                {
                    "id": f"nom-{row.get('place_id')}",
                    "name": name.strip(),
                    "description": f"Place in {city} via OpenStreetMap.",
                    "image": _get_best_image(name, city, category),
                    "category": category,
                    "duration": duration_for_category(category),
                    "rating": 4.1,
                    "address": row.get("display_name", f"{city}, {country}".strip(", ")),
                    "lat": rlat,
                    "lng": rlon,
                }
            )
        return _dedupe_search_items(items)[:limit]
    except Exception:
        return []


def duration_for_category(category: str) -> str:
    return {
        "landmarks": "1-2 hours",
        "museums": "2-3 hours",
        "food": "1-2 hours",
        "nature": "1-3 hours",
        "nightlife": "2-3 hours",
        "shopping": "2-3 hours",
        "art": "1-2 hours",
        "history": "1-2 hours",
        "adventure": "2-4 hours",
        "relaxation": "1-3 hours",
    }.get(category, "1-2 hours")


def _wikimedia_image(query: str) -> str:
    """Fetch a page thumbnail from Wikimedia/Wikipedia REST API (free, no key needed)."""
    try:
        # Normalise query: take first 2-3 words for best match
        slug = query.strip().replace(" ", "_")
        resp = requests.get(
            f"{WIKIMEDIA_BASE}/{slug}",
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            thumb = data.get("thumbnail", {}).get("source", "")
            if thumb:
                return thumb
        # Try with just the first two words if full slug failed
        parts = query.strip().split()
        if len(parts) > 1:
            slug2 = "_".join(parts[:2])
            resp2 = requests.get(
                f"{WIKIMEDIA_BASE}/{slug2}",
                headers={"User-Agent": USER_AGENT},
                timeout=8,
            )
            if resp2.status_code == 200:
                data2 = resp2.json()
                thumb2 = data2.get("thumbnail", {}).get("source", "")
                if thumb2:
                    return thumb2
    except Exception:
        pass
    return ""


def _openverse_image(query: str) -> str:
    """Fetch a Creative Commons image from Openverse (free, no key needed)."""
    try:
        # Better query construction: strip common generic words
        clean = query.strip()
        resp = requests.get(
            OPENVERSE_BASE,
            params={
                "q": clean,
                "license_type": "commercial",
                "page_size": 3,
                "mature": "false",
            },
            timeout=15,
        )
        resp.raise_for_status()
        rows = resp.json().get("results", [])
        if not rows:
            return ""
        # Prefer results with thumbnails
        for row in rows:
            thumb = row.get("thumbnail") or row.get("url") or ""
            if thumb:
                return thumb
        return ""
    except Exception:
        return ""


def _get_best_image(name: str, city: str, category: str = "") -> str:
    """Get the best available image: Wikimedia first, then Openverse."""
    # Try name + city (most specific)
    img = _wikimedia_image(f"{name}")
    if img:
        return img
    # Try category keyword + city
    cat_kw = CATEGORY_KEYWORDS.get(category, category)
    img = _openverse_image(f"{name} {city} {cat_kw}")
    if img:
        return img
    return ""


def _foursquare_category_to_app(categories: List[Dict[str, Any]]) -> str:
    names = " ".join([c.get("name", "").lower() for c in categories])
    if any(k in names for k in ["museum", "gallery"]):
        return "museums"
    if any(k in names for k in ["restaurant", "cafe", "food", "bar", "pub", "nightclub"]):
        return "food"
    if any(k in names for k in ["park", "garden", "nature", "beach"]):
        return "nature"
    if any(k in names for k in ["historic", "monument", "landmark", "tourist"]):
        return "landmarks"
    if any(k in names for k in ["shop", "mall", "market"]):
        return "shopping"
    if any(k in names for k in ["bar", "nightlife", "club", "lounge"]):
        return "nightlife"
    if any(k in names for k in ["art", "theater", "theatre", "perform"]):
        return "art"
    return "landmarks"


def _search_foursquare(city: str, country: str, query: str, limit: int) -> List[Dict[str, Any]]:
    api_key = getattr(settings, "FOURSQUARE_API_KEY", "")
    if not api_key:
        return []
    location = geocode_city(city, country)
    if not location:
        return []
    lat, lng = location
    try:
        resp = requests.get(
            FOURSQUARE_BASE,
            headers={"Authorization": api_key, "accept": "application/json"},
            params={
                "query": query,
                "ll": f"{lat},{lng}",
                "radius": 15000,
                "limit": min(50, max(limit, 10)),
                "sort": "POPULARITY",
                "fields": "fsq_id,name,geocodes,categories,location,popularity,rating,photos",
            },
            timeout=25,
        )
        resp.raise_for_status()
        rows = resp.json().get("results", [])
        items: List[Dict[str, Any]] = []
        for row in rows:
            geocodes = row.get("geocodes", {}).get("main", {})
            rlat = geocodes.get("latitude")
            rlng = geocodes.get("longitude")
            if rlat is None or rlng is None:
                continue
            category = _foursquare_category_to_app(row.get("categories", []))
            location_bits = row.get("location", {})
            address = ", ".join(
                [x for x in [location_bits.get("address"), location_bits.get("locality"), country] if x]
            ) or f"{city}, {country}".strip(", ")
            
            # Rating: use FSQ rating if available, else derive from popularity
            fsq_rating = row.get("rating")
            if fsq_rating is not None:
                rating = min(5.0, float(fsq_rating) / 2.0)  # FSQ uses 0-10 scale
            elif row.get("popularity") is not None:
                rating = min(5.0, 3.5 + (float(row.get("popularity")) / 100.0) * 1.5)
            else:
                rating = 4.0

            # Image: try Foursquare photos first, then fall back
            image = ""
            photos = row.get("photos", [])
            if photos:
                p = photos[0]
                prefix = p.get("prefix", "")
                suffix = p.get("suffix", "")
                if prefix and suffix:
                    image = f"{prefix}400x300{suffix}"
            if not image:
                image = _get_best_image(row.get("name", ""), city, category)

            items.append(
                {
                    "id": f"fsq-{row.get('fsq_id')}",
                    "name": (row.get("name") or "Unknown place").strip(),
                    "description": f"Popular {category.replace('_', ' ')} spot in {city}.",
                    "image": image,
                    "category": category,
                    "duration": duration_for_category(category),
                    "rating": round(rating, 1),
                    "address": address,
                    "lat": float(rlat),
                    "lng": float(rlng),
                }
            )
        return _dedupe_search_items(items)[:limit]
    except Exception:
        return []


def _name_tokens(s: str) -> List[str]:
    out: List[str] = []
    cur = []
    for c in s.lower():
        if c.isalnum():
            cur.append(c)
        else:
            if cur:
                w = "".join(cur)
                if len(w) > 2:
                    out.append(w)
                cur = []
    if cur:
        w = "".join(cur)
        if len(w) > 2:
            out.append(w)
    return out


def _name_token_overlap(query: str, candidate: str) -> float:
    qt = set(_name_tokens(query))
    ct = set(_name_tokens(candidate))
    if not qt:
        return 1.0
    hits = sum(1 for t in qt if t in ct)
    return hits / len(qt)


def foursquare_star_popularity(
    name: str,
    city: str,
    country: str,
    lat: Optional[float],
    lng: Optional[float],
) -> Tuple[Optional[float], str, Optional[float]]:
    """
    Look up Places API stars for a venue and convert to popularityScore on 0–100.

    Foursquare exposes `rating` on a ~0–10 scale in v3 responses (see `_search_foursquare` where we divide by 2 for 5★ UI).
    Optional `popularity` (often 0–100) blends in when ratings are sparse.

    Returns (score_or_None, diagnostic, raw_rating_0_10_or_None).
    """
    key = (getattr(settings, "FOURSQUARE_API_KEY", "") or "").strip()
    if not key:
        return None, "foursquare_disabled", None

    has_ll = lat is not None and lng is not None and math.isfinite(float(lat)) and math.isfinite(float(lng))
    if has_ll:
        ll = f"{float(lat)},{float(lng)}"
        radius = 1500
    else:
        center = geocode_city(city, country)
        if not center:
            return None, "no_city_geocode", None
        ll = f"{center[0]},{center[1]}"
        radius = 35000

    try:
        resp = requests.get(
            FOURSQUARE_BASE,
            headers={"Authorization": key, "accept": "application/json"},
            params={
                "query": name.strip(),
                "ll": ll,
                "radius": radius,
                "limit": 15,
                "sort": "RELEVANCE",
                "fields": "name,geocodes,rating,popularity,distance",
            },
            timeout=22,
        )
        if resp.status_code != 200:
            return None, "foursquare_http", None
        rows = resp.json().get("results") or []
    except Exception:
        return None, "foursquare_error", None

    qlow = name.strip().lower()
    best: Tuple[float, float, Optional[float], Optional[float]] = (-1.0, -1.0, None, None)

    for row in rows:
        rname = (row.get("name") or "").strip()
        if not rname:
            continue
        ov = _name_token_overlap(name, rname)
        nlow = rname.lower()
        if qlow == nlow:
            ov = 1.0
        elif qlow in nlow or nlow in qlow:
            ov = max(ov, 0.88)
        elif ov < 0.28:
            continue

        raw_rating = row.get("rating")
        raw_pop = row.get("popularity")
        rt = float(raw_rating) if raw_rating is not None else None
        pp = float(raw_pop) if raw_pop is not None else None
        if rt is None and pp is None:
            continue

        dist = row.get("distance")
        dkey = float(dist) if isinstance(dist, (int, float)) else 999999.0
        tup = (ov, -dkey)
        if tup > (best[0], best[1]):
            best = (tup[0], tup[1], rt, pp)

    _, _, rt, pp = best
    if rt is None and pp is None:
        return None, "foursquare_no_match", None

    # Foursquare `rating`: ~0–10 (“stars-like” aggregate). Map linearly → 0–100 for our planner.
    if rt is not None:
        return round(min(100.0, max(0.0, rt * 10.0)), 2), "foursquare_rating", rt
    # Fallback when rating is absent: Places `popularity` histogram (typically 0–100).
    return round(min(100.0, max(0.0, pp or 0.0)), 2), "foursquare_popularity", None


def _search_nominatim_places(city: str, country: str, query: str, limit: int) -> List[Dict[str, Any]]:
    try:
        q = f"{query} in {city} {country}".strip()
        resp = requests.get(
            f"{NOMINATIM_BASE}/search",
            params={"q": q, "format": "jsonv2", "addressdetails": 1, "limit": min(20, max(limit, 10))},
            headers={"User-Agent": USER_AGENT},
            timeout=20,
        )
        resp.raise_for_status()
        rows = resp.json()
        items: List[Dict[str, Any]] = []
        for row in rows:
            name = row.get("name") or row.get("display_name", "").split(",")[0]
            if not name:
                continue
            class_type = f"{row.get('class', '')}:{row.get('type', '')}".lower()
            category = "landmarks"
            if any(k in class_type for k in ["museum", "gallery"]):
                category = "museums"
            elif any(k in class_type for k in ["restaurant", "cafe", "food", "bar"]):
                category = "food"
            elif any(k in class_type for k in ["park", "garden", "nature"]):
                category = "nature"
            elif any(k in class_type for k in ["shop", "mall", "market"]):
                category = "shopping"
            elif any(k in class_type for k in ["historic", "heritage", "castle"]):
                category = "history"
            items.append(
                {
                    "id": f"nom-{row.get('place_id')}",
                    "name": name.strip(),
                    "description": f"Place in {city} via OpenStreetMap.",
                    "image": _get_best_image(name, city, category),
                    "category": category,
                    "duration": duration_for_category(category),
                    "rating": 4.1,
                    "address": row.get("display_name", f"{city}, {country}".strip(", ")),
                    "lat": float(row["lat"]),
                    "lng": float(row["lon"]),
                }
            )
        return _dedupe_search_items(items)[:limit]
    except Exception:
        return []


def search_places(city: str, country: str, query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Text search scoped to the selected city: Photon (bbox) first, then optional Foursquare,
    then bounded Nominatim, then unbounded Nominatim.
    """
    q = (query or "").strip()
    if not q:
        return []

    bbox = geocode_city_bbox(city, country)
    photon_items = _search_photon(city, country, q, limit, bbox)
    if photon_items:
        return _dedupe_search_items(photon_items)[:limit]

    fsq_items = _search_foursquare(city, country, q, limit)
    if fsq_items:
        return _dedupe_search_items(fsq_items)[:limit]

    if bbox:
        nom_bbox = _search_nominatim_in_bbox(city, country, q, limit, bbox)
        if nom_bbox:
            return _dedupe_search_items(nom_bbox)[:limit]

    return _dedupe_search_items(_search_nominatim_places(city, country, q, limit * 2))[:limit]


def discover_places(city: str, country: str, interests: Dict[str, bool], limit: int) -> List[Dict[str, Any]]:
    categories = [k for k, v in interests.items() if v]
    if not categories:
        categories = DEFAULT_DISCOVER_MIX
    per_category = max(1, math.ceil(limit / len(categories)))
    all_items: List[Dict[str, Any]] = []
    for c in categories:
        keyword = CATEGORY_KEYWORDS.get(c, c.replace("_", " "))
        all_items.extend(search_places(city, country, keyword, per_category))
    unique = {x["id"]: x for x in all_items}
    # Sort by rating — higher-rated, more-famous places first
    items = sorted(unique.values(), key=lambda x: x["rating"], reverse=True)
    return items[:limit]


def _parse_duration_minutes(duration: str) -> int:
    """Parse a duration string like '1-2 hours', '30 minutes', 'half-day', 'full-day' into minutes."""
    if not duration:
        return 90
    d = duration.lower().strip()

    # Named durations
    if "full-day" in d or "full day" in d:
        return 480
    if "half-day" in d or "half day" in d:
        return 240

    # Extract all numbers from the string
    import re
    numbers = [int(n) for n in re.findall(r"\d+", d)]
    if not numbers:
        return 90

    # Determine unit
    if "minute" in d or "min" in d:
        val = numbers[0]
        return max(15, min(180, val))
    else:
        # Assume hours — use average if range given
        if len(numbers) >= 2:
            hours = (numbers[0] + numbers[1]) / 2
        else:
            hours = numbers[0]
        return max(30, min(480, int(hours * 60)))


def _haversine_km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    r = 6371
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    c = 2 * math.asin(math.sqrt(math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2))
    return r * c


def _ors_profile_for_transport(transport: str) -> Tuple[str, float]:
    """ORS matrix profile and duration multiplier (rough door-to-door adjustment)."""
    t = (transport or "rideshare").lower()
    if t == "walking":
        return "foot-walking", 1.0
    if t == "public_transit":
        return "driving-car", 1.35
    return "driving-car", 1.0


def _haversine_matrix_minutes(points: List[Tuple[float, float]], km_h: float) -> List[List[int]]:
    return [
        [0 if i == j else int((_haversine_km(points[i], points[j]) / km_h) * 60) for j in range(len(points))]
        for i in range(len(points))
    ]


def _matrix_minutes(points: List[Tuple[float, float]], transport: str = "rideshare") -> List[List[int]]:
    profile, mult = _ors_profile_for_transport(transport)
    # Walking is slower; driving ~ city 28 km/h for haversine fallback
    fallback_kmh = 4.5 if profile == "foot-walking" else 28.0
    key = getattr(settings, "OPENROUTESERVICE_API_KEY", "")
    if not key:
        m = _haversine_matrix_minutes(points, fallback_kmh)
        return [[int(c * mult) for c in row] for row in m]
    url = f"{ORS_MATRIX_BASE}/{profile}"
    try:
        resp = requests.post(
            url,
            headers={"Authorization": key, "Content-Type": "application/json"},
            json={"locations": [[p[1], p[0]] for p in points], "metrics": ["duration"], "units": "km"},
            timeout=30,
        )
        resp.raise_for_status()
        durations = resp.json().get("durations")
        raw = [[int((d or 0) / 60) for d in row] for row in durations]
        return [[max(1, int(c * mult)) if i != j else 0 for j, c in enumerate(row)] for i, row in enumerate(raw)]
    except Exception:
        m = _haversine_matrix_minutes(points, fallback_kmh)
        return [[int(c * mult) for c in row] for row in m]


def _effective_popularity(a: Dict[str, Any]) -> float:
    """
    `popularityScore` is set when saving: Foursquare Places `rating` (~0–10) → 0–100, or client 0–5★ fallback.
    If missing, derive from `rating` (0–5) so old saved lists still rank sensibly.
    """
    raw = a.get("popularityScore")
    if raw is None:
        return 28.0 + float(a.get("rating", 4.0)) * 11.5
    try:
        v = float(raw)
    except (TypeError, ValueError):
        return 28.0 + float(a.get("rating", 4.0)) * 11.5
    if v < 0:
        return 0.0
    if v > 100:
        return 100.0
    return v


def _preference_bonus(category: str, preferences: Dict[str, bool]) -> float:
    """Give a 0.5 rating bonus to activities matching the user's interests."""
    if not preferences:
        return 0.0
    cat = (category or "").lower().strip()
    if preferences.get(cat, False) or preferences.get(category or "", False):
        return 0.5
    # Align OSM/UI variants with profile keys (e.g. museum → museums)
    synonyms = {
        "museum": "museums",
        "landmark": "landmarks",
        "monument": "landmarks",
        "attraction": "landmarks",
        "restaurant": "food",
        "cafe": "food",
        "park": "nature",
        "gallery": "art",
        "historic": "history",
    }
    mapped = synonyms.get(cat)
    if mapped and preferences.get(mapped, False):
        return 0.5
    return 0.0


def _openai_api_key() -> str:
    v = getattr(settings, "OPENAI_API_KEY", None) or os.getenv("OPENAI_API_KEY", "") or ""
    return v.strip()


def _openai_json_chat(system: str, user: str) -> Optional[Dict[str, Any]]:
    key = _openai_api_key()
    if not key:
        return None
    try:
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                "response_format": {"type": "json_object"},
                "temperature": 0.35,
            },
            timeout=75,
        )
        if r.status_code != 200:
            return None
        text = r.json()["choices"][0]["message"]["content"]
        return json.loads(text)
    except Exception:
        return None


def _ai_itinerary_summary(built: Dict[str, Any], payload: Dict[str, Any]) -> Optional[str]:
    if not _openai_api_key():
        return None
    trip = json.dumps(
        {
            "city": payload.get("city"),
            "days": [
                {
                    "date": d.get("date"),
                    "stops": [(a.get("name"), a.get("startTime"), a.get("endTime")) for a in d.get("activities") or []],
                }
                for d in built.get("days") or []
            ],
        }
    )
    raw = _openai_json_chat(
        "Write one short friendly paragraph (max 400 characters) summarizing this trip plan and pacing. "
        'Return JSON only: {"summary": string}',
        trip,
    )
    if not raw:
        return None
    s = raw.get("summary")
    return s.strip() if isinstance(s, str) else None


def enrich_discover_with_ai(
    city: str,
    country: str,
    results: List[Dict[str, Any]],
    interests: Dict[str, bool],
) -> List[Dict[str, Any]]:
    if not results or not _openai_api_key():
        return results
    active = [k for k, v in interests.items() if v]
    payload = json.dumps(
        [
            {"id": str(x.get("id")), "name": x.get("name"), "category": x.get("category"), "rating": x.get("rating")}
            for x in results[:20]
        ]
    )
    raw = _openai_json_chat(
        "For each place id, add a short 'why visit' tip (max 90 chars). "
        'Return JSON: {"tips":{"<id>":"..."}} only. City context: '
        f"{city}, {country}. User interests: {active}.",
        payload,
    )
    if not raw or not isinstance(raw.get("tips"), dict):
        return results
    tips: Dict[str, Any] = raw["tips"]
    out = []
    for x in results:
        tid = str(x.get("id"))
        tip = tips.get(tid) or tips.get(tid.replace(" ", ""))
        row = dict(x)
        if isinstance(tip, str) and tip.strip():
            row["aiTip"] = tip.strip()[:200]
        out.append(row)
    return out


def _greedy_popularity_visit_order_with_travel(
    mappable: List[Dict[str, Any]],
    preferences: Dict[str, bool],
    travel: List[List[int]],
    wake_minutes: int,
    day_budget: int,
    gap_minutes: int,
) -> Tuple[List[Dict[str, Any]], List[int]]:
    """
    Repeatedly choose the feasible next POI that maximizes (adjusted popularity, then ROI),
    using precomputed pairwise travel minutes (ORS matrix or haversine fallback).

    Returns activities in visit order plus travelMinutesFromPrev aligned (first is always 0).
    """
    n = len(mappable)
    deadline = wake_minutes + day_budget
    if n == 0:
        return [], []
    remaining: set[int] = set(range(n))
    order_indices: List[int] = []
    travels: List[int] = []

    clock = wake_minutes
    last_idx: Optional[int] = None

    def stop_value(act: Dict[str, Any]) -> float:
        pop = _effective_popularity(act)
        pref = _preference_bonus(act.get("category", "") or "", preferences)
        return pop + pref * 10.0

    while remaining:
        best_j: Optional[int] = None
        best_key: Tuple[float, float, float] = (-1.0, -1.0, 1.0)

        for j in remaining:
            dwell = _parse_duration_minutes(mappable[j].get("duration", "1-2 hours"))
            travel_before = 0 if last_idx is None else max(5, int(travel[last_idx][j]))
            end_visit = clock + travel_before + dwell
            if end_visit > deadline:
                continue

            val = stop_value(mappable[j])
            denom = max(1e-6, float(travel_before + dwell))
            roi = val / denom
            # Prefer iconic (high popularity) stops; tie-break by better ROI, then shorter leg
            key = (val, roi, -travel_before - dwell)
            if key > best_key:
                best_key = key
                best_j = j

        if best_j is None:
            break

        travel_before = 0 if last_idx is None else max(5, int(travel[last_idx][best_j]))
        dwell = _parse_duration_minutes(mappable[best_j].get("duration", "1-2 hours"))

        travels.append(travel_before)
        order_indices.append(best_j)
        remaining.remove(best_j)

        clock = clock + travel_before + dwell + gap_minutes
        last_idx = best_j

    ordered = [mappable[idx] for idx in order_indices]
    return ordered, travels


def build_itinerary(payload: Dict[str, Any]) -> Dict[str, Any]:
    activities = payload["activities"]
    start_date = payload["startDate"]
    end_date = payload["endDate"]
    wake = payload["wakeTime"]
    sleep = payload["sleepTime"]
    preferences: Dict[str, bool] = payload.get("preferences") or {}
    gap_minutes = 20

    total_days = (end_date - start_date).days + 1

    def activity_score(a: Dict[str, Any]) -> float:
        pop = _effective_popularity(a)
        rating = float(a.get("rating", 4.0))
        bonus = _preference_bonus(a.get("category", ""), preferences)
        return pop * 1.15 + rating * 2.8 + bonus * 12.0

    scored = sorted(activities, key=activity_score, reverse=True)

    slots: List[List[Dict[str, Any]]] = [[] for _ in range(total_days)]
    for idx, a in enumerate(scored):
        slots[idx % total_days].append(a)

    wake_minutes = wake.hour * 60 + wake.minute
    sleep_minutes = sleep.hour * 60 + sleep.minute
    day_budget = max(180, sleep_minutes - wake_minutes)

    days: List[Dict[str, Any]] = []
    for i in range(total_days):
        day_date = start_date + timedelta(days=i)
        day_items = slots[i]
        if not day_items:
            days.append({"date": day_date.isoformat(), "activities": []})
            continue

        mappable = [x for x in day_items if x.get("lat") and x.get("lng")]
        unmappable = [x for x in day_items if not (x.get("lat") and x.get("lng"))]

        scheduled: List[Dict[str, Any]] = []
        deadline = wake_minutes + day_budget

        # --- Mapped POIs: ORS (or haversine) matrix + greedy visit order ---
        if mappable:
            points = [(float(x["lat"]), float(x["lng"])) for x in mappable]
            travel_mtx = _matrix_minutes(points, "rideshare")
            ordered_geo, geo_leg_times = _greedy_popularity_visit_order_with_travel(
                mappable,
                preferences,
                travel_mtx,
                wake_minutes,
                day_budget,
                gap_minutes,
            )
            clock = wake_minutes
            for activity, tb in zip(ordered_geo, geo_leg_times):
                dwell = _parse_duration_minutes(activity.get("duration", "1-2 hours"))
                arriving = clock + tb
                if arriving + dwell > deadline:
                    break
                scheduled.append(
                    {
                        **activity,
                        "startTime": f"{arriving // 60:02d}:{arriving % 60:02d}",
                        "endTime": f"{(arriving + dwell) // 60:02d}:{(arriving + dwell) % 60:02d}",
                        "travelMinutesFromPrev": tb,
                    }
                )
                clock = arriving + dwell + gap_minutes

        # --- No coords: same greedy marginal rule with a fixed urban transfer estimate ---
        if unmappable:

            def _um_value(act: Dict[str, Any]) -> float:
                return (
                    _effective_popularity(act)
                    + _preference_bonus(act.get("category", "") or "", preferences) * 10.0
                )

            pending_ix = set(range(len(unmappable)))
            if scheduled:
                last_row = scheduled[-1]
                uc = int(last_row["endTime"][:2]) * 60 + int(last_row["endTime"][3:5]) + gap_minutes
            else:
                uc = wake_minutes

            while pending_ix:
                best_ix: Optional[int] = None
                best_k: Tuple[float, float, float] = (-1.0, -1.0, 1.0)
                tb_base = 15 if len(scheduled) > 0 else 0
                for ix in pending_ix:
                    dwell_u = _parse_duration_minutes(unmappable[ix].get("duration", "1-2 hours"))
                    end_visit = uc + tb_base + dwell_u
                    if end_visit > deadline:
                        continue
                    val_u = _um_value(unmappable[ix])
                    denom_u = max(1e-6, float(tb_base + dwell_u))
                    roi_u = val_u / denom_u
                    key_u = (val_u, roi_u, -tb_base - dwell_u)
                    if key_u > best_k:
                        best_k = key_u
                        best_ix = ix
                if best_ix is None:
                    break

                dwell_u = _parse_duration_minutes(unmappable[best_ix].get("duration", "1-2 hours"))
                uc += tb_base
                scheduled.append(
                    {
                        **unmappable[best_ix],
                        "startTime": f"{uc // 60:02d}:{uc % 60:02d}",
                        "endTime": f"{(uc + dwell_u) // 60:02d}:{(uc + dwell_u) % 60:02d}",
                        "travelMinutesFromPrev": tb_base,
                    }
                )
                uc = uc + dwell_u + gap_minutes
                pending_ix.discard(best_ix)

        if not scheduled and day_items:
            # Fallback: chronological pack without greedy if everything failed thresholds
            current_fb = wake_minutes
            for a in sorted(day_items, key=activity_score, reverse=True):
                dw = _parse_duration_minutes(a.get("duration", "1-2 hours"))
                tbf = 0 if not scheduled else 15
                if current_fb + tbf + dw > deadline:
                    break
                current_fb += tbf
                scheduled.append(
                    {
                        **a,
                        "startTime": f"{current_fb // 60:02d}:{current_fb % 60:02d}",
                        "endTime": f"{(current_fb + dw) // 60:02d}:{(current_fb + dw) % 60:02d}",
                        "travelMinutesFromPrev": tbf,
                    }
                )
                current_fb += dw + gap_minutes

        days.append({"date": day_date.isoformat(), "activities": scheduled})

    out = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "wakeTime": payload["wakeTime"].strftime("%H:%M"),
        "sleepTime": payload["sleepTime"].strftime("%H:%M"),
        "days": days,
    }
    summary = _ai_itinerary_summary(out, payload)
    if summary:
        out["aiSummary"] = summary
    return out
