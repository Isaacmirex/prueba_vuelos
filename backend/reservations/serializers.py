from rest_framework import serializers
from .models import Reservation, ReservationStatus


class ReservationListSerializer(serializers.ModelSerializer):
    # Campos calculados/derivados
    status_display = serializers.ReadOnlyField(source='get_status_display')
    user_username = serializers.CharField(source='user.username', read_only=True)
    flight_id = serializers.IntegerField(source='flight.id', read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id',
            'reservation_code',
            'user',           # id del usuario
            'user_username',  # username para mostrar en lista
            'flight',         # id de la solicitud de vuelo (FlightRequest)
            'flight_id',
            'reservation_date',
            'total_passengers',
            'total_amount',
            'status',
            'status_display',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'reservation_code', 'status_display', 'created_at', 'updated_at'
        ]


class ReservationDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.ReadOnlyField(source='get_status_display')
    user_info = serializers.SerializerMethodField()
    flight_info = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = '__all__'
        read_only_fields = ['id', 'reservation_code', 'created_at', 'updated_at']

    def get_user_info(self, obj):
        u = obj.user
        return {
            'id': u.id,
            'username': u.username,
            'email': getattr(u, 'email', None),
            'full_name': f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip()
        }

    def get_flight_info(self, obj):
        # obj.flight es un FlightRequest
        fr = obj.flight
        if fr is None:
            return None
        return {
            'id': fr.id,
            'status': getattr(fr, 'status', None),
            'reservation_code': getattr(fr, 'reservation_code', None),
            'travel_date': getattr(fr, 'travel_date', None),
            'origin_id': getattr(fr, 'origin_id', None),
            'destination_id': getattr(fr, 'destination_id', None),
            'notes': getattr(fr, 'notes', None),
        }


class ReservationCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = [
            'user',               # opcional si la vista lo setea automáticamente; si lo setea perform_create, hazlo read_only
            'flight',
            'reservation_date',
            'total_passengers',
            'total_amount',
            'status',
        ]

    def validate(self, data):
        # total_passengers
        if data.get('total_passengers') is not None and data['total_passengers'] < 1:
            raise serializers.ValidationError("Total de pasajeros debe ser al menos 1")

        # total_amount
        if data.get('total_amount') is not None and data['total_amount'] <= 0:
            raise serializers.ValidationError("El monto total debe ser mayor a 0")

        # Si viene estado, validar transiciones simples
        instance = getattr(self, 'instance', None)
        next_status = data.get('status')
        if instance and next_status:
            if instance.status == ReservationStatus.CANCELLED and next_status != ReservationStatus.CANCELLED:
                raise serializers.ValidationError("No se puede cambiar el estado de una reserva cancelada")

        return data
