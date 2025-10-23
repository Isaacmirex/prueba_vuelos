from django.apps import AppConfig


class ReservationPassengersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'reservation_passengers'
    verbose_name = 'Reservation Passengers'
    
    def ready(self):
        
        pass
