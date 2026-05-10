import os
from pathlib import Path
from urllib.parse import urlparse

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
# override=True: shell/IDE can export empty GOOGLE_*; without this, dotenv would not replace them.
load_dotenv(BASE_DIR / ".env", override=True)

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-secret-key")
DEBUG = os.getenv("DJANGO_DEBUG", "1") == "1"


def _allowed_hosts() -> list[str]:
    raw = os.getenv("DJANGO_ALLOWED_HOSTS", "").strip()
    hosts = [h.strip() for h in raw.split(",") if h.strip()]
    if hosts:
        return hosts
    ext_url = os.getenv("RENDER_EXTERNAL_URL", "").strip()
    if ext_url:
        host = urlparse(ext_url).hostname
        if host:
            return [host]
    return ["*"]


ALLOWED_HOSTS = _allowed_hosts()

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "planner",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "wanderlust_backend.urls"
TEMPLATES = []
WSGI_APPLICATION = "wanderlust_backend.wsgi.application"

_sqlite_path = (BASE_DIR / "db.sqlite3").resolve().as_posix()
DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{_sqlite_path}",
        conn_max_age=600,
    )
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# JSON POST clients and Next.js rewrites sometimes hit `/api/build` instead of `/api/build/`;
# disabling avoids CommonMiddleware crashing on redirects that drop POST bodies.
APPEND_SLASH = False

CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL_ORIGINS", "1") == "1"
if not CORS_ALLOW_ALL_ORIGINS:
    CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")

OPENROUTESERVICE_API_KEY = os.getenv("OPENROUTESERVICE_API_KEY", "")
FOURSQUARE_API_KEY = os.getenv("FOURSQUARE_API_KEY", "")

# Optional: GPT-powered discover blurbs, itinerary reorder, and trip summary (same key works for all).
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

REST_FRAMEWORK = {
    "UNAUTHENTICATED_USER": None,
}

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
