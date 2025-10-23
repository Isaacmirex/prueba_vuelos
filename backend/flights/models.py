from django.db import models


class Flight(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('delayed', 'Delayed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]
    
    flight_code = models.CharField(max_length=20, unique=True)
    airline = models.ForeignKey('airlines.Airline', on_delete=models.CASCADE, related_name='flights', db_column='airline_id')
    origin = models.CharField(max_length=255)  # Cambio: ahora es CharField
    destination = models.CharField(max_length=255)  # Cambio: ahora es CharField
    departure_datetime = models.DateTimeField()
    arrival_datetime = models.DateTimeField()
    number_of_stops = models.IntegerField(default=0)
    adult_price = models.DecimalField(max_digits=10, decimal_places=2)
    child_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    special_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    available_seats = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'flights'
        ordering = ['departure_datetime']

    def __str__(self):
        return f"{self.flight_code} - {self.origin} to {self.destination}"

    @property
    def duration_minutes(self):
        """Calculate flight duration in minutes"""
        if self.arrival_datetime and self.departure_datetime:
            delta = self.arrival_datetime - self.departure_datetime
            return int(delta.total_seconds() / 60)
        return None

    @property
    def is_available(self):
        """Check if flight has available seats and is scheduled"""
        return self.available_seats > 0 and self.status == 'scheduled'
