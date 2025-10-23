from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from datetime import timedelta
import random
import string
from .models import Reservation, ReservationStatus
from .serializers import (
    ReservationListSerializer,
    ReservationDetailSerializer,
    ReservationCreateUpdateSerializer
)


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related('user', 'flight').all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'user', 'flight']
    search_fields = ['reservation_code', 'user__username', 'user__email']
    ordering_fields = ['reservation_date', 'total_amount', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return ReservationListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ReservationCreateUpdateSerializer
        return ReservationDetailSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return self.queryset
        return self.queryset.filter(user=user)

    def perform_create(self, serializer):
        # Generar código de reserva único
        reservation_code = self._generate_reservation_code()
        serializer.save(
            user=self.request.user,
            reservation_code=reservation_code
        )

    def _generate_reservation_code(self):
        """Generar código de reserva único"""
        while True:
            code = 'RES-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if not Reservation.objects.filter(reservation_code=code).exists():
                return code

    @action(detail=False, methods=['get'])
    def my_reservations(self, request):
        """Obtener todas las reservas del usuario actual"""
        reservations = self.get_queryset().filter(user=request.user)
        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Obtener reservas pendientes"""
        reservations = self.get_queryset().filter(status=ReservationStatus.PENDING)
        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def confirmed(self, request):
        """Obtener reservas confirmadas"""
        reservations = self.get_queryset().filter(status=ReservationStatus.CONFIRMED)
        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Obtener reservas recientes (últimos 30 días)"""
        thirty_days_ago = timezone.now() - timedelta(days=30)
        reservations = self.get_queryset().filter(created_at__gte=thirty_days_ago)
        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def confirm(self, request, pk=None):
        """Confirmar una reserva"""
        reservation = self.get_object()
        
        if reservation.status == ReservationStatus.CONFIRMED:
            return Response(
                {'error': 'La reserva ya está confirmada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if reservation.status == ReservationStatus.CANCELLED:
            return Response(
                {'error': 'No se puede confirmar una reserva cancelada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reservation.status = ReservationStatus.CONFIRMED
        reservation.save()
        serializer = self.get_serializer(reservation)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancelar una reserva"""
        reservation = self.get_object()
        
        # Solo el dueño o admin pueden cancelar
        if reservation.user != request.user and not request.user.is_staff:
            return Response(
                {'error': 'No tienes permiso para cancelar esta reserva'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if reservation.status == ReservationStatus.CANCELLED:
            return Response(
                {'error': 'La reserva ya está cancelada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reservation.status = ReservationStatus.CANCELLED
        reservation.save()
        serializer = self.get_serializer(reservation)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def change_status(self, request, pk=None):
        """Cambiar estado de reserva (solo admin)"""
        reservation = self.get_object()
        new_status = request.data.get('status')
        
        valid_statuses = [s[0] for s in ReservationStatus.choices]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Estado debe ser uno de: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reservation.status = new_status
        reservation.save()
        serializer = self.get_serializer(reservation)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_flight(self, request):
        """Obtener reservas por vuelo"""
        flight_id = request.query_params.get('flight_id')
        if not flight_id:
            return Response(
                {'error': 'flight_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reservations = self.get_queryset().filter(flight_id=flight_id)
        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Obtener estadísticas de reservas"""
        queryset = self.get_queryset()
        
        stats = {
            'total': queryset.count(),
            'pending': queryset.filter(status=ReservationStatus.PENDING).count(),
            'confirmed': queryset.filter(status=ReservationStatus.CONFIRMED).count(),
            'cancelled': queryset.filter(status=ReservationStatus.CANCELLED).count(),
            'total_amount': sum(
                r.total_amount for r in queryset.filter(status=ReservationStatus.CONFIRMED)
            ),
            'total_passengers': sum(
                r.total_passengers for r in queryset.filter(status=ReservationStatus.CONFIRMED)
            ),
        }
        
        return Response(stats)

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def update_amount(self, request, pk=None):
        """Actualizar monto de reserva"""
        reservation = self.get_object()
        amount = request.data.get('total_amount')
        
        if amount is None:
            return Response(
                {'error': 'total_amount es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return Response(
                {'error': 'total_amount debe ser un número positivo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reservation.total_amount = amount
        reservation.save()
        serializer = self.get_serializer(reservation)
        return Response(serializer.data)
