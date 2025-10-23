# Admin configuration for destinations app
from django.contrib import admin
from .models import Destination


@admin.register(Destination)
class DestinationAdmin(admin.ModelAdmin):
    """
    Admin interface for Destination model
    """
    list_display = [
        'id',
        'code',
        'name',
        'province',
        'is_active',
        'has_coordinates',
        'created_at',
    ]
    list_filter = ['is_active', 'province', 'created_at']
    search_fields = ['name', 'code', 'province']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'province', 'image_url')
        }),
        ('Location', {
            'fields': ('latitude', 'longitude')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_coordinates(self, obj):
        """Check if destination has coordinates"""
        return bool(obj.latitude and obj.longitude)
    has_coordinates.boolean = True
    has_coordinates.short_description = 'Has Coordinates'
    
    actions = ['activate_destinations', 'deactivate_destinations']
    
    def activate_destinations(self, request, queryset):
        """Activate selected destinations"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} destination(s) activated successfully.')
    activate_destinations.short_description = 'Activate selected destinations'
    
    def deactivate_destinations(self, request, queryset):
        """Deactivate selected destinations"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} destination(s) deactivated successfully.')
    deactivate_destinations.short_description = 'Deactivate selected destinations'
