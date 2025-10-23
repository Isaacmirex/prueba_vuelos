# Models for destinations app
from django.db import models
from django.utils import timezone


class Destination(models.Model):
    """
    Model to store destination information
    """
    name = models.CharField(max_length=100, unique=True, verbose_name="Destination Name")
    code = models.CharField(max_length=10, unique=True, verbose_name="Destination Code")
    province = models.CharField(max_length=100, verbose_name="Province")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="Latitude")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="Longitude")
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")
    image_url = models.CharField(max_length=500, blank=True, null=True, verbose_name="Image URL")

    class Meta:
        db_table = 'destinations'
        managed = False  # Django no intentará crear/modificar esta tabla
        verbose_name = 'Destination'
        verbose_name_plural = 'Destinations'
        ordering = ['name']
        indexes = [
            models.Index(fields=['province'], name='idx_destination_province'),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"

    def get_coordinates(self):
        """Return coordinates as tuple"""
        if self.latitude and self.longitude:
            return (float(self.latitude), float(self.longitude))
        return None
