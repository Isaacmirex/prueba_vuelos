import os
from dotenv import load_dotenv
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Carga el .env
load_dotenv(BASE_DIR / '.env') 

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-a(p(%avvz6o_h&0vf4pc^&qeyt1c14x=u(49j!lvadne7rf7vk')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '127.0.0.1,localhost').split(',')


# Application definition
INSTALLED_APPS = [
    # Django apps nativas
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Terceros
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'django_filters',
    'dj_rest_auth',
    'allauth',
    'allauth.account',
    'dj_rest_auth.registration',
    'djcelery_email', # Para correos asíncronos
    
    # Apps locales
    'authentication',
    'destinations',
    'flights',
    'notifications',
    'airlines',
    'flight_requests',
    'reservations',
    'reservation_passengers',
]

# --- ¡CORRECCIÓN DE CACHÉ! ---
# Añadimos los middleware de caché. El orden es MUY importante.
MIDDLEWARE = [
    'django.middleware.cache.UpdateCacheMiddleware', # Debe ser el primero
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'django.middleware.cache.FetchFromCacheMiddleware', # Debe ser el último
]
# --- FIN DE LA CORRECCIÓN ---

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

# Base de datos
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        # ¡CORRECCIÓN DEFINITIVA! Hardcodeamos el puerto de la DB
        # para evitar que EMAIL_PORT lo contamine.
        'PORT': 5432,
    }
}

# Validadores de contraseñas
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internacionalización
LANGUAGE_CODE = 'es'
TIME_ZONE = 'America/Guayaquil'
USE_I18N = True
USE_TZ = True

# Archivos estáticos
STATIC_URL = 'static/'

# Modelo de usuario personalizado
AUTH_USER_MODEL = 'authentication.User'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# --- CONFIGURACIÓN DE REDIS Y CACHÉ ---
# Asegúrate de estar ejecutando Django localmente (no en Docker)
# Si ejecutas Django en Docker, cambia '127.0.0.1' a 'redis-local'
REDIS_HOST = os.getenv('REDIS_HOST', '127.0.0.1')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f'redis://{REDIS_HOST}:{REDIS_PORT}/1', # Base de datos 1 para caché
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'PICKLE_VERSION': -1,
            # 'PARSER_CLASS': 'redis.connection.HiredisParser', # <- Eliminado para compatibilidad
        },
        'KEY_PREFIX': 'flight_system',
        'TIMEOUT': 600,  # 10 minutos (default para cache.set)
    }
}

# Configuración de sesión con Redis
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# Configuración personalizada de caché para API (usado en @cache_page)
API_CACHE_TIMEOUT = 600  # 10 minutos en segundos

# --- FIN DE CONFIGURACIÓN DE REDIS Y CACHÉ ---


# --- CONFIGURACIÓN DE CELERY ---
CELERY_BROKER_URL = f'redis://{REDIS_HOST}:{REDIS_PORT}/0' # Base de datos 0 para Celery
CELERY_RESULT_BACKEND = f'redis://{REDIS_HOST}:{REDIS_PORT}/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
# --- FIN DE CONFIGURACIÓN DE CELERY ---
# --------------------------------------------------------
# --- CONFIGURACIÓN DE CELERY BEAT (Tareas Programadas) ---
# --------------------------------------------------------
from celery.schedules import timedelta
# Si deseas una hora específica (por ejemplo, 9:00 AM), importa crontab:
# from celery.schedules import crontab 

CELERY_BEAT_SCHEDULE = {
    'send-flight-reminders-daily': {
        # Usa la tarea interna de Django para ejecutar management commands
        'task': 'django.core.management.call_command',
        
        # Programar para que se ejecute una vez al día
        'schedule': timedelta(days=1), 
        
        # El comando que se debe ejecutar (nombre del archivo sin .py)
        'args': ['send_flight_reminders'],
        
        # Opcional: Si quieres que se ejecute todos los días a las 9:00 AM (necesita importar crontab)
        # 'schedule': crontab(hour=9, minute=0),
    },
}
# --------------------------------------------------------
# --- FIN DE CONFIGURACIÓN DE CELERY BEAT ---
# --------------------------------------------------------

# --- CONFIGURACIÓN DE EMAIL (CON CELERY) ---

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend" 
EMAIL_HOST =  'smtp.gmail.com'
EMAIL_USE_TLS = True
EMAIL_PORT =  587
EMAIL_USE_SSL = False # Desactivado por defecto.
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER') 
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD') 
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER


# --- FIN DE CONFIGURACIÓN DE EMAIL ---


# Django REST Framework y JWT
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
}

REST_AUTH = {
    'LOGIN_SERIALIZER': 'authentication.serializers.CustomLoginSerializer',
    'USE_JWT': True,
    'JWT_AUTH_COOKIE': 'auth-token',
    'USER_DETAILS_SERIALIZER': 'authentication.serializers.UserSerializer',
}

# Configuración de AllAuth (para dj-rest-auth)
SITE_ID = 1
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_SESSION_REMEMBER = True
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_EMAIL_VERIFICATION = 'none' # Cambiar a 'mandatory' en producción

