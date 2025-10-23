# Serializers for destinations app
from rest_framework import serializers
from .models import Destination


class DestinationSerializer(serializers.ModelSerializer):
    """
    Complete serializer for Destination model
    """
    coordinates = serializers.SerializerMethodField()

    class Meta:
        model = Destination
        fields = [
            'id',
            'name',
            'code',
            'province',
            'latitude',
            'longitude',
            'coordinates',
            'is_active',
            'image_url',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'coordinates']

    def get_coordinates(self, obj):
        """Get coordinates as dict"""
        coords = obj.get_coordinates()
        if coords:
            return {"lat": coords[0], "lng": coords[1]}
        return None


class DestinationListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for destination list view
    """
    class Meta:
        model = Destination
        fields = ['id', 'name', 'code', 'province', 'is_active', 'image_url']
        read_only_fields = ['id']


class DestinationCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating destinations
    """
    class Meta:
        model = Destination
        fields = ['name', 'code', 'province', 'latitude', 'longitude', 'is_active', 'image_url']

    def validate_code(self, value):
        """Validate and format destination code"""
        return value.upper().strip()

    def validate_name(self, value):
        """Validate destination name"""
        if len(value) < 3:
            raise serializers.ValidationError("Destination name must be at least 3 characters")
        return value.strip()

    def validate(self, data):
        """Validate coordinates"""
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if (latitude and not longitude) or (longitude and not latitude):
            raise serializers.ValidationError("Both latitude and longitude must be provided together")
        
        if latitude:
            if not (-90 <= float(latitude) <= 90):
                raise serializers.ValidationError("Latitude must be between -90 and 90")
        
        if longitude:
            if not (-180 <= float(longitude) <= 180):
                raise serializers.ValidationError("Longitude must be between -180 and 180")
        
        return data
