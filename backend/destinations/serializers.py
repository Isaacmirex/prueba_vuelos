from rest_framework import serializers
from .models import Destination

class DestinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Destination
        fields = ['id', 'name', 'code', 'province', 'latitude', 'longitude', 'is_active', 'created_at', 'updated_at']
