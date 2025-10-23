# App configuration for airlines app
from django.apps import AppConfig


class AirlinesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'airlines'
    verbose_name = 'Airlines Management'
