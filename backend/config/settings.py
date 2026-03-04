"""
Django settings for Construx360.
"""
import os
from pathlib import Path
from datetime import timedelta

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from backend/.env if present
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-secret-key-change-in-production')

DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'core',
    'projects',
    'parties',
    'finances',
    'contracts',
    'bills',
    'purchase_orders',
    'variations',
    'documents',
    'equipment',
    'sitelog',
    'guarantees',
    'transfers',
    'partners',
    'employees',
    'reports',
    'notifications',
    'audit',
    'rfi',
    'materials',
    'safety',
    'submittals',
    'estimates',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'audit.middleware.AuditLogMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Use SQLite for easy local run (no PostgreSQL needed). Set USE_SQLITE=1 or leave unset to try SQLite if PostgreSQL fails.
_use_sqlite = os.environ.get('USE_SQLITE', '1').lower() in ('1', 'true', 'yes')

if _use_sqlite:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'construction_db'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }

AUTH_USER_MODEL = 'core.User'

# Django admin: login page and where to redirect after successful login
LOGIN_URL = '/admin/login/'
LOGIN_REDIRECT_URL = '/admin/'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.auth.CookieJWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': int(os.environ.get('DRF_PAGE_SIZE', 20)),
    # Basic rate limiting to protect APIs from abuse
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.AnonRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        # Adjust these in production via env if needed
        'user': os.environ.get('DRF_USER_THROTTLE', '1000/day'),
        'anon': os.environ.get('DRF_ANON_THROTTLE', '100/day'),
    },
}

if not DEBUG:
    # In production only expose JSON (no browsable API)
    REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
        'rest_framework.renderers.JSONRenderer',
    ]

# Frontend base URL (used in emails / WhatsApp links)
FRONTEND_BASE_URL = os.environ.get('FRONTEND_BASE_URL', 'http://localhost:3000')

# Invoice PDF: issuer shown on all bill/invoice PDFs (your real company name and optional address).
# If unset, falls back to the project's company name.
INVOICE_ISSUER_NAME = os.environ.get('INVOICE_ISSUER_NAME', '').strip()
INVOICE_ISSUER_ADDRESS = os.environ.get('INVOICE_ISSUER_ADDRESS', '').strip()

# WhatsApp Cloud API (optional)
WHATSAPP_ENABLED = os.environ.get('WHATSAPP_ENABLED', 'False').lower() == 'true'
WHATSAPP_ACCESS_TOKEN = os.environ.get('WHATSAPP_ACCESS_TOKEN', '')
WHATSAPP_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '')

# Green API (optional test provider for WhatsApp)
GREENAPI_ENABLED = os.environ.get('GREENAPI_ENABLED', 'False').lower() == 'true'
GREENAPI_INSTANCE_ID = os.environ.get('GREENAPI_INSTANCE_ID', '').strip()
GREENAPI_TOKEN = os.environ.get('GREENAPI_TOKEN', '').strip()
GREENAPI_BASE_URL = os.environ.get('GREENAPI_BASE_URL', 'https://api.green-api.com').strip().rstrip('/')

SIMPLE_JWT = {
    # Short-lived access token; rotate refresh tokens for better security
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
}

# Security hardening (mainly for production; safe defaults for local dev)
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
# Save session on every request so admin login redirect persists
SESSION_SAVE_EVERY_REQUEST = True

CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = True
# Allow admin login form POST from your frontend/admin domain (e.g. https://yourdomain.com)
CSRF_TRUSTED_ORIGINS = [o.strip() for o in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',') if o.strip()]

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Basic upload limits (tunable via env)
DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.environ.get('DATA_UPLOAD_MAX_MEMORY_SIZE', 10 * 1024 * 1024))  # 10 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = int(os.environ.get('FILE_UPLOAD_MAX_MEMORY_SIZE', 10 * 1024 * 1024))  # 10 MB

if not DEBUG:
    # Optional HSTS for HTTPS deployments
    if os.environ.get('ENABLE_HSTS', 'true').lower() in ('1', 'true', 'yes'):
        SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', 31536000))  # 1 year
        SECURE_HSTS_INCLUDE_SUBDOMAINS = True
        SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'true').lower() in ('1', 'true', 'yes')

    if SECRET_KEY == 'dev-secret-key-change-in-production':
        # Fail fast if someone deploys with the default dev secret key
        raise RuntimeError('DJANGO_SECRET_KEY must be set to a strong value in production.')

# Logging configuration: send structured logs to stdout with configurable levels
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
DJANGO_LOG_LEVEL = os.environ.get('DJANGO_LOG_LEVEL', LOG_LEVEL)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        },
        'simple': {
            'format': '[%(levelname)s] %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose' if not DEBUG else 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': LOG_LEVEL,
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': DJANGO_LOG_LEVEL,
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': DJANGO_LOG_LEVEL,
            'propagate': False,
        },
        'django.server': {
            'handlers': ['console'],
            'level': DJANGO_LOG_LEVEL,
            'propagate': False,
        },
        # Project-level logger; use logging.getLogger('construx360') in code
        'construx360': {
            'handlers': ['console'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
    },
}

# When running behind a reverse proxy (nginx, load balancer), you can opt-in
# to trusting X-Forwarded-* headers so that Django builds correct HTTPS URLs.
if os.environ.get('USE_PROXY_HEADERS', 'false').lower() in ('1', 'true', 'yes'):
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    USE_X_FORWARDED_HOST = True
