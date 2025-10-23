from django.db import models


class PassengerType(models.TextChoices):
    MAIN = 'main', 'Principal'
    COMPANION = 'companion', 'Acompañante'


class PassengerCategory(models.TextChoices):
    ADULT = 'adult', 'Adulto'
    CHILD = 'child', 'Niño'
    INFANT = 'infant', 'Infante'


class Gender(models.TextChoices):
    MALE = 'M', 'Masculino'
    FEMALE = 'F', 'Femenino'
    OTHER = 'O', 'Otro'


class ReservationPassenger(models.Model):
    reservation = models.ForeignKey(
        'reservations.Reservation',
        on_delete=models.CASCADE,
        related_name='passengers',
        db_column='reservation_id'
    )
    passenger_type = models.CharField(
        max_length=20,
        choices=PassengerType.choices,
        default=PassengerType.MAIN,
        db_column='passenger_type'
    )
    first_name = models.CharField(
        max_length=100,
        verbose_name='Nombre',
        db_column='first_name'
    )
    last_name = models.CharField(
        max_length=100,
        verbose_name='Apellido',
        db_column='last_name'
    )
    country_of_residence = models.CharField(
        max_length=100,
        verbose_name='País de Residencia',
        db_column='country_of_residence'
    )
    identity_document = models.CharField(
        max_length=50,
        verbose_name='Documento de Identidad',
        db_column='identity_document'
    )
    date_of_birth = models.DateField(
        verbose_name='Fecha de Nacimiento',
        db_column='date_of_birth'
    )
    gender = models.CharField(
        max_length=1,
        choices=Gender.choices,
        db_column='gender'
    )
    passenger_category = models.CharField(
        max_length=20,
        choices=PassengerCategory.choices,
        default=PassengerCategory.ADULT,
        db_column='passenger_category'
    )
    seat_number = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        verbose_name='Número de Asiento',
        db_column='seat_number'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Creado en',
        db_column='created_at'
    )

    class Meta:
        db_table = 'reservation_passengers'
        ordering = ['passenger_type', 'created_at']
        verbose_name = 'Pasajero de Reserva'
        verbose_name_plural = 'Pasajeros de Reserva'

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.get_passenger_type_display()}"
