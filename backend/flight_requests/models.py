from django.db import models
from django.conf import settings


class FlightRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='flight_requests',
        db_column='userid'  # ← NUEVO
    )
    destination = models.ForeignKey(
        'destinations.Destination', 
        on_delete=models.RESTRICT, 
        related_name='destination_requests',
        db_column='destinationid'  # ← NUEVO
    )
    origin = models.ForeignKey(
        'destinations.Destination', 
        on_delete=models.RESTRICT, 
        related_name='origin_requests', 
        null=True, 
        blank=True,
        db_column='originid'  # ← NUEVO
    )
    travel_date = models.DateField(db_column='traveldate')  # ← NUEVO
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    reservation_code = models.CharField(
        max_length=10, 
        null=True, 
        blank=True, 
        unique=True,
        db_column='reservationcode'  # ← NUEVO
    )
    reserved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='reserved_flights',
        db_column='reservedbyid'  # ← NUEVO
    )
    reserved_at = models.DateTimeField(
        null=True, 
        blank=True,
        db_column='reservedat'  # ← NUEVO
    )
    notes = models.TextField(null=True, blank=True)
    companions = models.IntegerField(default=1)
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_column='createdat'  # ← NUEVO
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        db_column='updatedat'  # ← NUEVO
    )

    class Meta:
        managed = False
        db_table = 'flightrequests'
        ordering = ['-created_at']

    def __str__(self):
        return f"Flight Request {self.id} - {self.destination.name} on {self.travel_date}"
