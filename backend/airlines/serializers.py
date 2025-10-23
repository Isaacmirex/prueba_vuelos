# Serializers for airlines app
from rest_framework import serializers
from .models import Airline


class AirlineSerializer(serializers.ModelSerializer):
    """
    Serializer for Airline model
    """
    class Meta:
        model = Airline
        fields = [
            'id',
            'name',
            'code',
            'logo_url',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AirlineListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for airline list view
    """
    class Meta:
        model = Airline
        fields = ['id', 'name', 'code', 'logo_url']
        read_only_fields = ['id']


class AirlineCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating airlines
    """
    class Meta:
        model = Airline
        fields = ['name', 'code', 'logo_url']

    def validate_code(self, value):
        """Validate and format airline code"""
        return value.upper().strip()

    def validate_name(self, value):
        """Validate airline name"""
        if len(value) < 3:
            raise serializers.ValidationError("Airline name must be at least 3 characters")
        return value.strip()
