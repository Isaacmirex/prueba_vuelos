from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from datetime import timedelta
from .models import Flight
from .serializers import (
    FlightListSerializer,
    FlightDetailSerializer,
    FlightCreateUpdateSerializer
)

# --- ¡AÑADIDO PARA REDIS! ---
from django.core.cache import cache
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers # ¡CORRECCIÓN JWT!
# --- FIN DE ADICIONES ---


class FlightViewSet(viewsets.ModelViewSet):
    queryset = Flight.objects.select_related('airline').all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'airline', 'number_of_stops']
    search_fields = ['flight_code', 'notes', 'airline__name', 'origin', 'destination']
    ordering_fields = ['departure_datetime', 'adult_price', 'available_seats']
    ordering = ['departure_datetime']

    def get_serializer_class(self):
        if self.action == 'list':
            return FlightListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return FlightCreateUpdateSerializer
        return FlightDetailSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'update_seats', 'change_status']:
            # Solo Admin puede escribir
            return [IsAdminUser()]
        # Permitir que cualquiera lea (list, retrieve, actions GET)
        return [AllowAny()]

    # --- FUNCIÓN HELPER PARA LIMPIAR CACHÉ ---
    def _clear_flight_cache(self, pk=None):
        """Limpia el caché de detalle y todas las listas/acciones GET."""
        if pk:
            # Borra el detalle (independiente del token, ya que es público)
            cache.delete_pattern(f"flight_detail_{pk}*")
        
        # Borra todos los cachés de listas (independiente del token)
        cache.delete_pattern("flights_list_*")
        # Borra los cachés de las acciones personalizadas (key_prefix)
        cache.delete_pattern("flights_available*")
        cache.delete_pattern("flights_upcoming*")
        cache.delete_pattern("flights_search_route*")
        cache.delete_pattern("flights_by_airline*")

    # --- ACCIONES DE LECTURA (GET) CON CACHÉ ---

    # ¡CORRECCIÓN JWT!
    @method_decorator(vary_on_headers("Authorization"))
    def list(self, request, *args, **kwargs):
        """List all flights (con caché manual)"""
        # Clave de caché única basada en los parámetros de consulta
        cache_key = f"flights_list_{request.query_params.urlencode()}"
        
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

    # ¡CORRECCIÓN JWT!
    @method_decorator(vary_on_headers("Authorization"))
    def retrieve(self, request, *args, **kwargs):
        """Get a single flight by ID (con caché manual)"""
        pk = kwargs.get('pk')
        cache_key = f"flight_detail_{pk}" # Clave simple, vary_on_headers hace la magia

        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        instance = self.get_object()
        serializer = self.get_serializer(instance)
        response_data = serializer.data
        
        cache.set(cache_key, response_data, settings.API_CACHE_TIMEOUT)
        
        return Response(response_data)

    # --- ACCIONES DE ESCRITURA (POST/PUT/DELETE) CON INVALIDACIÓN DE CACHÉ ---

    def perform_create(self, serializer):
        serializer.save()
        self._clear_flight_cache() # ¡LIMPIAR CACHÉ!

    def perform_update(self, serializer):
        serializer.save()
        self._clear_flight_cache(pk=serializer.instance.pk) # ¡LIMPIAR CACHÉ!

    def perform_destroy(self, instance):
        pk = instance.pk
        instance.delete()
        self._clear_flight_cache(pk=pk) # ¡LIMPIAR CACHÉ!

    # --- ACCIONES PERSONALIZADAS (GET) CON CACHÉ 'cache_page' ---
    
    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="flights_available"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def available(self, request):
        """Get all available flights"""
        flights = self.get_queryset().filter(status='scheduled', available_seats__gt=0)
        
        page = self.paginate_queryset(flights)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(flights, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="flights_upcoming"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def upcoming(self, request):
        """Get upcoming flights (next 7 days)"""
        now = timezone.now()
        end_date = now + timedelta(days=7)
        flights = self.get_queryset().filter(
            departure_datetime__gte=now,
            departure_datetime__lte=end_date,
            status='scheduled'
        )
        
        page = self.paginate_queryset(flights)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(flights, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="flights_search_route"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def search_route(self, request):
        """Search flights by origin and destination"""
        origin = request.query_params.get('origin')
        destination = request.query_params.get('destination')
        departure_date = request.query_params.get('date')
        
        if not origin or not destination:
            return Response(
                {'error': 'Origin and destination are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        flights = self.get_queryset().filter(
            origin__icontains=origin,
            destination__icontains=destination,
            status='scheduled'
        )
        
        if departure_date:
            flights = flights.filter(departure_datetime__date=departure_date)
        
        page = self.paginate_queryset(flights)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(flights, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="flights_by_airline"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def by_airline(self, request):
        """Get flights by airline"""
        airline_id = request.query_params.get('airline_id')
        if not airline_id:
            return Response(
                {'error': 'airline_id is required'},
                status=status.HTTP_4DENIED
            )
        
        flights = self.get_queryset().filter(airline_id=airline_id, status='scheduled')
        
        page = self.paginate_queryset(flights)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(flights, many=True)
        return Response(serializer.data)

    # --- ACCIONES PERSONALIZADAS (ESCRITURA) CON INVALIDACIÓN DE CACHÉ ---

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def update_seats(self, request, pk=None):
        """Update available seats"""
        flight = self.get_object()
        seats = request.data.get('available_seats')
        
        if seats is None:
            return Response(
                {'error': 'available_seats is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            seats = int(seats)
            if seats < 0:
                raise ValueError()
        except (ValueError, TypeError):
            return Response(
                {'error': 'available_seats must be a positive integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        flight.available_seats = seats
        flight.save()
        
        self._clear_flight_cache(pk=flight.pk) # ¡LIMPIAR CACHÉ!
        
        serializer = self.get_serializer(flight)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def change_status(self, request, pk=None):
        """Change flight status"""
        flight = self.get_object()
        new_status = request.data.get('status')
        
        valid_statuses = ['scheduled', 'delayed', 'cancelled', 'completed']
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Status must be one of: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        flight.status = new_status
        flight.save()
        
        self._clear_flight_cache(pk=flight.pk) # ¡LIMPIAR CACHÉ!
        
        serializer = self.get_serializer(flight)
        return Response(serializer.data)

