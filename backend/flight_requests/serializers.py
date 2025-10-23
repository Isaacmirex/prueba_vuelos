from rest_framework import serializers
from .models import FlightRequest
from destinations.serializers import DestinationListSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class FlightRequestListSerializer(serializers.ModelSerializer):
    destination = DestinationListSerializer(read_only=True)
    origin = DestinationListSerializer(read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = FlightRequest
        fields = ['id', 'user_username', 'destination', 'origin', 'travel_date', 'status', 'companions', 'created_at']


class FlightRequestDetailSerializer(serializers.ModelSerializer):
    destination = DestinationListSerializer(read_only=True)
    origin = DestinationListSerializer(read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    reserved_by_username = serializers.CharField(source='reserved_by.username', read_only=True)
    
    class Meta:
        model = FlightRequest
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'reservation_code', 'reserved_by', 'reserved_at']


class FlightRequestCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlightRequest
        fields = ['destination', 'origin', 'travel_date', 'status', 'companions', 'notes']
        
    def validate_companions(self, value):
        if value < 1:
            raise serializers.ValidationError("Companions must be at least 1")
        if value > 10:
            raise serializers.ValidationError("Maximum 10 companions allowed")
        return value
