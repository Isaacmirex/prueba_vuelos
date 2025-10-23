from django.contrib import admin
from .models import Flight

@admin.register(Flight)
class FlightAdmin(admin.ModelAdmin):
    list_display = [
        'flight_code',
        'airline',
        'origin',
        'destination',
        'departure_datetime',
        'arrival_datetime',
        'adult_price',
        'available_seats',
        'status'
    ]
    list_filter = ['status', 'airline', 'number_of_stops', 'departure_datetime']
    search_fields = ['flight_code', 'origin', 'destination', 'airline__name']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'departure_datetime'
    
    fieldsets = (
        ('Información del Vuelo', {
            'fields': ('flight_code', 'airline', 'status')
        }),
        ('Ruta', {
            'fields': ('origin', 'destination', 'number_of_stops')
        }),
        ('Horarios', {
            'fields': ('departure_datetime', 'arrival_datetime')
        }),
        ('Precios', {
            'fields': ('adult_price', 'child_price', 'special_price', 'available_seats')
        }),
        ('Información Adicional', {
            'fields': ('notes', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
