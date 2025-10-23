# Models for airlines app
from django.db import models
from django.utils import timezone


class Airline(models.Model):
    """
    Model to store airline information
    """
    name = models.CharField(max_length=255, unique=True, verbose_name="Airline Name")
    code = models.CharField(max_length=10, unique=True, verbose_name="Airline Code")
    logo_url = models.CharField(max_length=500, blank=True, null=True, verbose_name="Logo URL")
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = 'airlines'
        managed = False  # Django no intentará crear/modificar esta tabla
        verbose_name = 'Airline'
        verbose_name_plural = 'Airlines'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"
