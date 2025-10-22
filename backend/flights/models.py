from django.db import models
from django.contrib.auth import get_user_model
from destinations.models import Destination

User = get_user_model()

class FlightRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pendiente'),
        ('RESERVED', 'Reservado'),
        ('CANCELLED', 'Cancelado'),
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    destination = models.ForeignKey(Destination, on_delete=models.PROTECT, db_column='destination_id')
    travel_date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    reservation_code = models.CharField(max_length=10, null=True, blank=True)
    reserved_by_id = models.IntegerField(null=True, blank=True)
    reserved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)  # Se llena automáticamente al crear
    updated_at = models.DateTimeField(auto_now=True)      # Se actualiza automáticamente

    class Meta:
        db_table = 'flight_requests'  # Usar la tabla EXISTENTE

    def __str__(self):
        return f"Vuelo: {self.destination.name} para {self.user.email}"
