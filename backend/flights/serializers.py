from rest_framework import serializers
from .models import Flight
from airlines.serializers import AirlineSerializer


class FlightListSerializer(serializers.ModelSerializer):
    airline = AirlineSerializer(read_only=True)
    duration_minutes = serializers.ReadOnlyField()
    is_available = serializers.ReadOnlyField()
    
    class Meta:
        model = Flight
        fields = [
            'id', 'flight_code', 'airline', 'origin', 'destination',
            'departure_datetime', 'arrival_datetime', 'duration_minutes',
            'adult_price', 'available_seats', 'status', 'is_available'
        ]


class FlightDetailSerializer(serializers.ModelSerializer):
    airline = AirlineSerializer(read_only=True)
    duration_minutes = serializers.ReadOnlyField()
    is_available = serializers.ReadOnlyField()
    
    class Meta:
        model = Flight
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class FlightCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flight
        fields = [
            'flight_code', 'airline', 'origin', 'destination',
            'departure_datetime', 'arrival_datetime', 'number_of_stops',
            'adult_price', 'child_price', 'special_price',
            'available_seats', 'status', 'notes'
        ]
        
    def validate(self, data):
        """Validate flight data"""
        if data.get('arrival_datetime') and data.get('departure_datetime'):
            if data['arrival_datetime'] <= data['departure_datetime']:
                raise serializers.ValidationError(
                    "Arrival datetime must be after departure datetime"
                )
        
        if data.get('origin') == data.get('destination'):
            raise serializers.ValidationError(
                "Origin and destination cannot be the same"
            )
            
        if data.get('available_seats', 0) < 0:
            raise serializers.ValidationError(
                "Available seats cannot be negative"
            )
            
        if data.get('number_of_stops', 0) < 0:
            raise serializers.ValidationError(
                "Number of stops cannot be negative"
            )
        
        return data