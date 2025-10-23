# Admin configuration for airlines app
from django.contrib import admin
from .models import Airline


@admin.register(Airline)
class AirlineAdmin(admin.ModelAdmin):
    """
    Admin interface for Airline model
    """
    list_display = [
        'id',
        'code',
        'name',
        'logo_url',
        'created_at',
        'updated_at',
    ]
    list_filter = ['created_at', 'updated_at']
    search_fields = ['name', 'code']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'logo_url')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
