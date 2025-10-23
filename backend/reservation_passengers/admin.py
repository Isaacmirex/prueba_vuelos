from django.contrib import admin
from .models import ReservationPassenger


@admin.register(ReservationPassenger)
class ReservationPassengerAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'reservation',
        'passenger_type',
        'first_name',
        'last_name',
        'identity_document',
        'passenger_category',
        'seat_number',
        'created_at'
    ]
    
    list_filter = [
        'passenger_type',
        'passenger_category',
        'gender',
        'created_at',
    ]
    
    search_fields = [
        'first_name',
        'last_name',
        'identity_document',
        'country_of_residence'
    ]
    
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Información de Reserva', {
            'fields': ('reservation',)
        }),
        ('Tipo de Pasajero', {
            'fields': (
                'passenger_type',
                'passenger_category',
            )
        }),
        ('Datos Personales', {
            'fields': (
                'first_name',
                'last_name',
                'date_of_birth',
                'gender',
            )
        }),
        ('Documentación', {
            'fields': (
                'identity_document',
                'country_of_residence',
            )
        }),
        ('Asiento', {
            'fields': ('seat_number',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )
    
    ordering = ['-created_at']
    
    date_hierarchy = 'created_at'
    
    list_per_page = 25
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('reservation')
