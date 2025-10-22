from rest_framework import serializers
from .models import FlightRequest

class FlightRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlightRequest
        fields = '__all__'
