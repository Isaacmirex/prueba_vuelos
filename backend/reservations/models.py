from django.db import models
from django.conf import settings


class ReservationStatus(models.TextChoices):
    PENDING = 'pending', 'Pendiente'
    CONFIRMED = 'confirmed', 'Confirmada'
    CANCELLED = 'cancelled', 'Cancelada'


class Reservation(models.Model):
    reservation_code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Código de Reserva',
        db_column='reservation_code'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reservations',
        verbose_name='Usuario',
        db_column='user_id'
    )
    flight = models.ForeignKey(
        'flight_requests.FlightRequest',
        on_delete=models.CASCADE,
        related_name='reservations',
        verbose_name='Vuelo',
        db_column='flight_id'
    )
    reservation_date = models.DateTimeField(
        verbose_name='Fecha de Reserva',
        db_column='reservation_date'
    )
    total_passengers = models.IntegerField(
        verbose_name='Total de Pasajeros',
        db_column='total_passengers'
    )
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Monto Total',
        db_column='total_amount'
    )
    status = models.CharField(
        max_length=20,
        choices=ReservationStatus.choices,
        default=ReservationStatus.PENDING,
        verbose_name='Estado'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Creado en',
        db_column='created_at'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Actualizado en',
        db_column='updated_at'
    )

    class Meta:
        db_table = 'reservations'
        ordering = ['-created_at']
        verbose_name = 'Reserva'
        verbose_name_plural = 'Reservas'

    def __str__(self):
        return f"{self.reservation_code} - {self.user.username}"
