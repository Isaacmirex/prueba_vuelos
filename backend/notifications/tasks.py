from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.apps import apps
from django.utils import timezone
from datetime import timedelta

# Usamos apps.get_model para evitar importaciones circulares

@shared_task
def send_welcome_email(user_id):
    """
    Envía un correo de bienvenida a un nuevo usuario.
    Se llama después de que el usuario se registra.
    """
    User = apps.get_model('authentication', 'User')
    try:
        user = User.objects.get(id=user_id)
        subject = '¡Bienvenido a Vuelos App!'
        message = f'Hola {user.first_name},\n\nGracias por registrarte en nuestra plataforma. ¡Esperamos que disfrutes tu experiencia!'
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        return f"Correo de bienvenida enviado a {user.email}"
    except User.DoesNotExist:
        return f"Usuario con id {user_id} no encontrado."

@shared_task
def send_flight_reminder_email(reservation_id):
    """
    Envía un recordatorio de vuelo al usuario de la reserva (vuelo confirmado).
    Se activa si el vuelo sale en aproximadamente 48 horas.
    """
    Reservation = apps.get_model('reservations', 'Reservation')
    try:
        reservation = Reservation.objects.select_related('user', 'flight').get(id=reservation_id)
        user = reservation.user
        flight = reservation.flight
        
        subject = f'¡Recordatorio de tu vuelo {flight.flight_code}!'
        message = f'Hola {user.first_name},\n\nEste es un recordatorio de que tu vuelo {flight.flight_code} de {flight.origin} a {flight.destination} sale en aproximadamente 48 horas.\n\nFecha de salida: {flight.departure_datetime.strftime("%Y-%m-%d %H:%M")}\n\n¡Que tengas un excelente viaje!'
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        return f"Recordatorio de vuelo enviado a {user.email} para la reserva {reservation.reservation_code}"
    except Reservation.DoesNotExist:
        return f"Reserva con id {reservation_id} no encontrada."


@shared_task
def send_flight_request_reminder_email(request_id):
    """
    Envía un recordatorio al usuario sobre una Petición de Vuelo pendiente.
    Se activa si la fecha de viaje (travel_date) es en 2 días.
    """
    FlightRequest = apps.get_model('flight_requests', 'FlightRequest')
    try:
        flight_request = FlightRequest.objects.select_related('user', 'origin', 'destination').get(id=request_id)
        user = flight_request.user
        
        subject = '¡Recordatorio sobre tu Petición de Vuelo Pendiente!'
        message = (
            f'Hola {user.first_name},\n\n'
            f'Este es un recordatorio de tu petición de vuelo pendiente de {flight_request.origin.name} '
            f'a {flight_request.destination.name} para la fecha **{flight_request.travel_date}**.\n\n'
            'Por favor, revisa el estado de tu petición en la plataforma para asegurar tu viaje.'
        )
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        return f"Recordatorio de petición de vuelo enviado a {user.email} para la petición {request_id}"
    except FlightRequest.DoesNotExist:
        return f"Petición de Vuelo con id {request_id} no encontrada."
