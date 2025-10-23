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

# --- ¡AÑADIDO PARA REDIS! ---
from django.core.cache import cache
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers # ¡CORRECCIÓN JWT!
# --- FIN DE ADICIONES ---


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
        if self.action in ['update', 'partial_update', 'destroy', 'confirm', 'change_status', 'update_amount']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return self.queryset.all()
        return self.queryset.filter(user=user)

    # --- FUNCIÓN HELPER PARA LIMPIAR CACHÉ ---
    def _clear_reservation_cache(self, pk=None, user_id=None):
        """Limpia el caché de detalle y todas las listas/acciones GET."""
        if pk:
            # Borra el detalle para todos los usuarios que lo hayan cacheado
            cache.delete_pattern(f"reservation_detail_{pk}_user_*")
        
        # ¡CORRECCIÓN JWT! Borra solo el caché del usuario afectado
        if user_id:
            cache.delete_pattern(f"reservations_list_user_{user_id}_*")
        else:
            # Si no hay user_id (borrado masivo), borra todo
            cache.delete_pattern("reservations_list_user_*")
        
        # Borra los cachés de las acciones (key_prefix)
        cache.delete_pattern("reservations_my_reservations*")
        cache.delete_pattern("reservations_pending*")
        cache.delete_pattern("reservations_confirmed*")
        cache.delete_pattern("reservations_recent*")
        cache.delete_pattern("reservations_by_flight*")
        cache.delete_pattern("reservations_statistics*")

    # --- ACCIONES DE LECTURA (GET) CON CACHÉ ---

    # ¡CORRECCIÓN JWT! El 'list' normal ahora depende del usuario
    def list(self, request, *args, **kwargs):
        """List all reservations (con caché por usuario)"""
        # ¡CORRECCIÓN JWT! Clave de caché única por usuario
        cache_key = f"reservations_list_user_{request.user.id}_{request.query_params.urlencode()}"
        
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = self.get_paginated_response(serializer.data).data
        else:
            serializer = self.get_serializer(queryset, many=True)
            response_data = serializer.data
        
        cache.set(cache_key, response_data, settings.API_CACHE_TIMEOUT)
        return Response(response_data)

    def retrieve(self, request, *args, **kwargs):
        """Get a single reservation (con caché por usuario)"""
        pk = kwargs.get('pk')
        # ¡CORRECCIÓN JWT! Clave de caché única por usuario
        cache_key = f"reservation_detail_{pk}_user_{request.user.id}"
        
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        instance = self.get_object() # get_queryset() ya filtra por usuario
        serializer = self.get_serializer(instance)
        response_data = serializer.data
        cache.set(cache_key, response_data, settings.API_CACHE_TIMEOUT)
        return Response(response_data)

    # --- ACCIONES DE ESCRITURA (POST/PUT/DELETE) CON INVALIDACIÓN DE CACHÉ ---

    def perform_create(self, serializer):
        user = self.request.user
        reservation_code = self._generate_reservation_code()
        serializer.save(
            user=user,
            reservation_code=reservation_code
        )
        self._clear_reservation_cache(user_id=user.id) # ¡CORRECCIÓN JWT!

    def perform_update(self, serializer):
        serializer.save()
        self._clear_reservation_cache(pk=serializer.instance.pk, user_id=self.request.user.id) # ¡CORRECCIÓN JWT!

    def perform_destroy(self, instance):
        pk = instance.pk
        user_id = instance.user.id
        instance.delete()
        self._clear_reservation_cache(pk=pk, user_id=user_id) # ¡CORRECCIÓN JWT!

    def _generate_reservation_code(self):
        """Generar código de reserva único"""
        while True:
            code = 'RES-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if not Reservation.objects.filter(reservation_code=code).exists():
                return code

    # --- ACCIONES PERSONALIZADAS (GET) CON CACHÉ 'cache_page' ---

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="reservations_my_reservations"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def my_reservations(self, request):
        """Obtener todas las reservas del usuario actual"""
        reservations = self.get_queryset().filter(user=request.user)
        
        page = self.paginate_queryset(reservations)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="reservations_pending"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Obtener reservas pendientes"""
        reservations = self.get_queryset().filter(status=ReservationStatus.PENDING)
        
        page = self.paginate_queryset(reservations)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="reservations_confirmed"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def confirmed(self, request):
        """Obtener reservas confirmadas"""
        reservations = self.get_queryset().filter(status=ReservationStatus.CONFIRMED)
        
        page = self.paginate_queryset(reservations)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="reservations_recent"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Obtener reservas recientes (últimos 30 días)"""
        thirty_days_ago = timezone.now() - timedelta(days=30)
        reservations = self.get_queryset().filter(created_at__gte=thirty_days_ago)
        
        page = self.paginate_queryset(reservations)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="reservations_by_flight"))
    @method_decorator(vary_on_headers("Authorization"))
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
        
        page = self.paginate_queryset(reservations)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="reservations_statistics"))
    @method_decorator(vary_on_headers("Authorization"))
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

    # --- ACCIONES PERSONALIZADAS (ESCRITURA) CON INVALIDACIÓN DE CACHÉ ---

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
        
        self._clear_reservation_cache(pk=reservation.pk, user_id=reservation.user.id) # ¡CORRECCIÓN JWT!
        
        serializer = self.get_serializer(reservation)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancelar una reserva"""
        reservation = self.get_object()
        
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
        
        self._clear_reservation_cache(pk=reservation.pk, user_id=reservation.user.id) # ¡CORRECCIÓN JWT!
        
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
        
        self._clear_reservation_cache(pk=reservation.pk, user_id=reservation.user.id) # ¡CORRECCIÓN JWT!
        
        serializer = self.get_serializer(reservation)
        return Response(serializer.data)

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
        
        self._clear_reservation_cache(pk=reservation.pk, user_id=reservation.user.id) # ¡CORRECCIÓN JWT!
        
        serializer = self.get_serializer(reservation)
        return Response(serializer.data)

