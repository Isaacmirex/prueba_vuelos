# App configuration for destinations app
from django.apps import AppConfig


class DestinationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'destinations'
    verbose_name = 'Destinations Management'
