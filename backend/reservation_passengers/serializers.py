from rest_framework import serializers
from .models import ReservationPassenger


class ReservationPassengerSerializer(serializers.ModelSerializer):
    passenger_type_display = serializers.CharField(
        source='get_passenger_type_display',
        read_only=True
    )
    passenger_category_display = serializers.CharField(
        source='get_passenger_category_display',
        read_only=True
    )
    gender_display = serializers.CharField(
        source='get_gender_display',
        read_only=True
    )
    full_name = serializers.SerializerMethodField()
    reservation_code = serializers.CharField(
        source='reservation.reservation_code',
        read_only=True
    )

    class Meta:
        model = ReservationPassenger
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class ReservationPassengerListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    reservation_code = serializers.CharField(source='reservation.reservation_code')

    class Meta:
        model = ReservationPassenger
        fields = [
            'id',
            'full_name',
            'reservation',
            'reservation_code',
            'passenger_type',
            'passenger_category',
            'seat_number',
            'created_at'
        ]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class ReservationPassengerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservationPassenger
        fields = [
            'reservation',
            'passenger_type',
            'first_name',
            'last_name',
            'country_of_residence',
            'identity_document',
            'date_of_birth',
            'gender',
            'passenger_category',
            'seat_number'
        ]
