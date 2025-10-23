from django.contrib import admin
from .models import FlightRequest


@admin.register(FlightRequest)
class FlightRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'destination', 'origin', 'travel_date', 'status', 'companions', 'created_at']
    list_filter = ['status', 'travel_date', 'created_at']
    search_fields = ['user__username', 'destination__name', 'origin__name', 'reservation_code', 'notes']
    readonly_fields = ['created_at', 'updated_at', 'reserved_at']
    date_hierarchy = 'travel_date'
    
    fieldsets = (
        ('Flight Information', {
            'fields': ('user', 'destination', 'origin', 'travel_date', 'companions')
        }),
        ('Status', {
            'fields': ('status', 'reservation_code', 'reserved_by', 'reserved_at')
        }),
        ('Additional Information', {
            'fields': ('notes', 'created_at', 'updated_at')
        }),
    )
