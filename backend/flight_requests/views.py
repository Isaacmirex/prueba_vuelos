from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import FlightRequest
from .serializers import (
    FlightRequestListSerializer,
    FlightRequestDetailSerializer,
    FlightRequestCreateUpdateSerializer
)

# --- ¡AÑADIDO PARA REDIS! ---
from django.core.cache import cache
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers # ¡CORRECCIÓN JWT!
# --- FIN DE ADICIONES ---


class FlightRequestViewSet(viewsets.ModelViewSet):
    queryset = FlightRequest.objects.select_related('user', 'destination', 'origin', 'reserved_by').all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'destination', 'origin', 'user']
    search_fields = ['reservation_code', 'notes', 'destination__name', 'origin__name']
    ordering_fields = ['created_at', 'travel_date', 'status']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return FlightRequestListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return FlightRequestCreateUpdateSerializer
        return FlightRequestDetailSerializer

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        # Aseguramos que los usuarios no-admin solo vean sus propias solicitudes
        user = self.request.user
        if user.is_staff or user.is_superuser:
            # Los admins ven todo
            return self.queryset.all()
        # Los usuarios normales solo ven lo suyo
        return self.queryset.filter(user=user)

    # --- FUNCIÓN HELPER PARA LIMPIAR CACHÉ ---
    def _clear_flight_request_cache(self, pk=None, user_id=None):
        """Limpia el caché de detalle y todas las listas."""
        if pk:
            # Borra el detalle para todos los usuarios que lo hayan cacheado
            cache.delete_pattern(f"flight_request_detail_{pk}_user_*")
        
        # ¡CORRECCIÓN JWT! Borra solo el caché del usuario afectado si es posible
        if user_id:
             cache.delete_pattern(f"flight_requests_list_user_{user_id}_*")
        else:
             cache.delete_pattern("flight_requests_list_user_*")
        
        cache.delete_pattern("flight_requests_my_requests*")
        cache.delete_pattern("flight_requests_pending*")

    # --- ACCIONES DE LECTURA (GET) CON CACHÉ ---

    def list(self, request, *args, **kwargs):
        """List all flight requests (con caché por usuario)"""
        # ¡CORRECCIÓN JWT! Clave de caché única por usuario
        cache_key = f"flight_requests_list_user_{request.user.id}_{request.query_params.urlencode()}"
        
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
        """Get a single flight request by ID (con caché por usuario)"""
        pk = kwargs.get('pk')
        # ¡CORRECCIÓN JWT! Clave de caché única por usuario
        cache_key = f"flight_request_detail_{pk}_user_{request.user.id}"

        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        instance = self.get_object() # get_queryset() ya filtra por usuario
        serializer = self.get_serializer(instance)
        response_data = serializer.data
        
        cache.set(cache_key, response_data, settings.API_CACHE_TIMEOUT)
        
        return Response(response_data)

    # ¡CORRECCIÓN JWT! cache_page necesita saber que el token cambia la respuesta
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="flight_requests_my_requests"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """Get current user's flight requests"""
        # get_queryset() ya filtra por usuario, pero re-filtramos para seguridad
        requests = self.get_queryset().filter(user=request.user)
        
        page = self.paginate_queryset(requests)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT! cache_page necesita saber que el token cambia la respuesta
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="flight_requests_pending"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending flight requests (del usuario o admin)"""
        requests = self.get_queryset().filter(status='PENDING')
        
        page = self.paginate_queryset(requests)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)

    # --- ACCIONES DE ESCRITURA (POST/PUT/DELETE) CON INVALIDACIÓN DE CACHÉ ---

    def perform_create(self, serializer):
        # Asignar usuario y limpiar caché
        user = self.request.user
        serializer.save(user=user)
        self._clear_flight_request_cache(user_id=user.id) # ¡CORRECCIÓN JWT!

    def perform_update(self, serializer):
        # Guardar y limpiar caché
        serializer.save()
        self._clear_flight_request_cache(pk=serializer.instance.pk, user_id=self.request.user.id) # ¡CORRECCIÓN JWT!

    def perform_destroy(self, instance):
        # Guardar pk y limpiar caché antes de borrar
        pk = instance.pk
        user_id = instance.user.id
        instance.delete()
        self._clear_flight_request_cache(pk=pk, user_id=user_id) # ¡CORRECCIÓN JWT!

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def confirm(self, request, pk=None):
        """Confirm a flight request"""
        flight_request = self.get_object()
        flight_request.status = 'CONFIRMED'
        flight_request.reserved_by = request.user
        from django.utils import timezone
        flight_request.reserved_at = timezone.now()
        flight_request.save()
        
        self._clear_flight_request_cache(pk=flight_request.pk, user_id=flight_request.user.id) # ¡CORRECCIÓN JWT!
        
        serializer = self.get_serializer(flight_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a flight request"""
        flight_request = self.get_object()
        if flight_request.user != request.user and not request.user.is_staff:
            return Response(
                {'detail': 'You do not have permission to cancel this request'},
                status=status.HTTP_403_FORBIDDEN
            )
        flight_request.status = 'CANCELLED'
        flight_request.save()
        
        self._clear_flight_request_cache(pk=flight_request.pk, user_id=flight_request.user.id) # ¡CORRECCIÓN JWT!
        
        serializer = self.get_serializer(flight_request)
        return Response(serializer.data)

