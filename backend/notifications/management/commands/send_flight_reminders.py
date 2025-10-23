# notifications/management/commands/send_flight_reminders.py

from django.core.management.base import BaseCommand
from django.apps import apps
from django.utils import timezone
from datetime import timedelta
from notifications.tasks import send_flight_reminder_email

class Command(BaseCommand):
    """
    Comando para identificar reservas que requieren un correo de recordatorio 
    (vuelo en 48 horas) y encolar la tarea Celery.
    """
    help = 'Busca reservas cuyos vuelos salen en aproximadamente 48 horas y envía recordatorios.'

    def handle(self, *args, **options):
        # Usamos apps.get_model para evitar importaciones circulares, 
        # asumiendo que el modelo está en la app 'reservations'.
        try:
            Reservation = apps.get_model('reservations', 'Reservation')
        except LookupError:
            self.stdout.write(self.style.ERROR("El modelo 'Reservation' no se encontró. Asegúrate de que la app 'reservations' esté configurada correctamente."))
            return

        now = timezone.now()
        
        # Definimos el rango de tiempo para los vuelos:
        # Entre 48 horas (2 días) y 49 horas a partir de ahora.
        # Esto asegura que si el comando se ejecuta una vez al día, 
        # el recordatorio se dispare una única vez para cada reserva.
        time_limit_start = now + timedelta(hours=48)
        time_limit_end = now + timedelta(hours=49)

        # Filtramos las reservas:
        reservations_to_remind = Reservation.objects.filter(
            flight__departure_datetime__gte=time_limit_start,
            flight__departure_datetime__lt=time_limit_end,
            # (Opcional) Puedes añadir un campo 'reminder_sent' al modelo Reservation
            # para evitar enviar el correo dos veces si la lógica de tiempo falla.
            # is_reminder_sent=False 
        ).select_related('user')

        count = reservations_to_remind.count()
        self.stdout.write(self.style.NOTICE(f'Encontradas {count} reservas que necesitan recordatorio.'))

        for reservation in reservations_to_remind:
            # Encola la tarea de Celery de forma asíncrona
            send_flight_reminder_email.delay(reservation.id)
            self.stdout.write(self.style.SUCCESS(f'Tarea encolada para la Reserva #{reservation.id} ({reservation.user.email})'))
            
            # (Opcional) Si usas el campo 'is_reminder_sent', actualízalo aquí:
            # reservation.is_reminder_sent = True
            # reservation.save()

        self.stdout.write(self.style.SUCCESS('Proceso de recordatorios completado.'))
