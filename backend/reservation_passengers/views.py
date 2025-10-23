from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Count, Q
from .models import ReservationPassenger, PassengerType, PassengerCategory
from .serializers import (
    ReservationPassengerSerializer,
    ReservationPassengerListSerializer,
    ReservationPassengerCreateSerializer
)

# --- ¡AÑADIDO PARA REDIS! ---
from django.core.cache import cache
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers # ¡CORRECCIÓN JWT!
# --- FIN DE ADICIONES ---


class ReservationPassengerViewSet(viewsets.ModelViewSet):
    queryset = ReservationPassenger.objects.select_related(
        'reservation',
        'reservation__user',
        'reservation__flight'
    ).all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['reservation', 'passenger_type', 'passenger_category', 'gender']
    search_fields = ['first_name', 'last_name', 'identity_document', 'seat_number']
    ordering_fields = ['created_at', 'passenger_type', 'date_of_birth']
    ordering = ['passenger_type', '-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return ReservationPassengerListSerializer
        elif self.action in ['create', 'update', 'partial_update', 'bulk_create']:
            # Aseguramos que bulk_create use el serializer de creación
            return ReservationPassengerCreateSerializer
        return ReservationPassengerSerializer

    def get_permissions(self):
        if self.action in ['destroy', 'bulk_delete', 'bulk_assign_seats', 'assign_seat']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return self.queryset.all()
        # Los usuarios solo ven pasajeros de sus propias reservas
        return self.queryset.filter(reservation__user=user)

    # --- FUNCIÓN HELPER PARA LIMPIAR CACHÉ ---
    def _clear_reservation_passengers_cache(self, pk=None, user_id=None):
        """Limpia el caché de detalle y todas las listas/acciones GET."""
        if pk:
            # Borra el detalle para todos los usuarios que lo hayan cacheado
            cache.delete_pattern(f"res_passenger_detail_{pk}_user_*")
        
        # ¡CORRECCIÓN JWT! Borra solo el caché del usuario afectado
        if user_id:
            cache.delete_pattern(f"res_passengers_list_user_{user_id}_*")
        else:
            # Si no hay user_id (borrado masivo), borra todo
            cache.delete_pattern("res_passengers_list_user_*")
        
        # Borra los cachés de las acciones (key_prefix)
        cache.delete_pattern("res_passengers_by_reservation*")
        cache.delete_pattern("res_passengers_main_passengers*")
        cache.delete_pattern("res_passengers_companions*")
        cache.delete_pattern("res_passengers_adults*")
        cache.delete_pattern("res_passengers_children*")
        cache.delete_pattern("res_passengers_statistics*")
        cache.delete_pattern("res_passengers_search_by_document*")
        cache.delete_pattern("res_passengers_by_reservation_code*")
        cache.delete_pattern("res_passengers_unassigned_seats*")

    # --- ACCIONES DE LECTURA (GET) CON CACHÉ ---

    def list(self, request, *args, **kwargs):
        """List all reservation passengers (con caché por usuario)"""
        # ¡CORRECCIÓN JWT! Clave de caché única por usuario
        cache_key = f"res_passengers_list_user_{request.user.id}_{request.query_params.urlencode()}"
        
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
        """Get a single reservation passenger (con caché por usuario)"""
        pk = kwargs.get('pk')
        # ¡CORRECCIÓN JWT! Clave de caché única por usuario
        cache_key = f"res_passenger_detail_{pk}_user_{request.user.id}"
        
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
        instance = serializer.save()
        user_id = instance.reservation.user.id # Obtenemos el user_id de la reserva
        self._clear_reservation_passengers_cache(user_id=user_id) # ¡CORRECCIÓN JWT!

    def perform_update(self, serializer):
        instance = serializer.save()
        user_id = instance.reservation.user.id
        self._clear_reservation_passengers_cache(pk=instance.pk, user_id=user_id) # ¡CORRECCIÓN JWT!

    def perform_destroy(self, instance):
        pk = instance.pk
        user_id = instance.reservation.user.id
        instance.delete()
        self._clear_reservation_passengers_cache(pk=pk, user_id=user_id) # ¡CORRECCIÓN JWT!

    # --- ACCIONES PERSONALIZADAS (GET) CON CACHÉ 'cache_page' ---
    
    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="res_passengers_by_reservation"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def by_reservation(self, request):
        """Obtener todos los pasajeros de una reserva específica"""
        reservation_id = request.query_params.get('reservation_id')
        if not reservation_id:
            return Response(
                {'error': 'reservation_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        passengers = self.get_queryset().filter(reservation_id=reservation_id)
        
        page = self.paginate_queryset(passengers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="res_passengers_main_passengers"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def main_passengers(self, request):
        """Obtener solo pasajeros principales"""
        passengers = self.get_queryset().filter(passenger_type=PassengerType.MAIN)
        page = self.paginate_queryset(passengers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="res_passengers_companions"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def companions(self, request):
        """Obtener solo acompañantes"""
        passengers = self.get_queryset().filter(passenger_type=PassengerType.COMPANION)
        page = self.paginate_queryset(passengers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="res_passengers_adults"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def adults(self, request):
        """Obtener solo pasajeros adultos"""
        passengers = self.get_queryset().filter(passenger_category=PassengerCategory.ADULT)
        page = self.paginate_queryset(passengers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="res_passengers_children"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def children(self, request):
        """Obtener solo pasajeros niños"""
        passengers = self.get_queryset().filter(passenger_category=PassengerCategory.CHILD)
        page = self.paginate_queryset(passengers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="res_passengers_statistics"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Obtener estadísticas de pasajeros"""
        queryset = self.get_queryset()
        
        stats = {
            'total': queryset.count(),
            'by_type': {
                'main': queryset.filter(passenger_type=PassengerType.MAIN).count(),
                'companion': queryset.filter(passenger_type=PassengerType.COMPANION).count(),
            },
            'by_category': {
                'adult': queryset.filter(passenger_category=PassengerCategory.ADULT).count(),
                'child': queryset.filter(passenger_category=PassengerCategory.CHILD).count(),
                'infant': queryset.filter(passenger_category=PassengerCategory.INFANT).count(),
            },
            'by_gender': {
                'male': queryset.filter(gender='M').count(),
                'female': queryset.filter(gender='F').count(),
                'other': queryset.filter(gender='O').count(),
            },
            'with_seat_assigned': queryset.filter(seat_number__isnull=False).filter(seat_number__exact='').count(),
            'without_seat_assigned': queryset.filter(Q(seat_number__isnull=True) | Q(seat_number='')).count(),
        }
        
        return Response(stats)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="res_passengers_search_by_document"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def search_by_document(self, request):
        """Buscar pasajero por documento de identidad"""
        document = request.query_params.get('document')
        
        if not document:
            return Response(
                {'error': 'document es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        passengers = self.get_queryset().filter(identity_document__icontains=document)
        page = self.paginate_queryset(passengers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="res_passengers_by_reservation_code"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def by_reservation_code(self, request):
        """Obtener pasajeros por código de reserva"""
        code = request.query_params.get('code')
        
        if not code:
            return Response(
                {'error': 'code es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        passengers = self.get_queryset().filter(reservation__reservation_code=code)
        page = self.paginate_queryset(passengers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

    # ¡CORRECCIÓN JWT!
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="res_passengers_unassigned_seats"))
    @method_decorator(vary_on_headers("Authorization"))
    @action(detail=False, methods=['get'])
    def unassigned_seats(self, request):
        """Obtener pasajeros sin asiento asignado"""
        passengers = self.get_queryset().filter(
            Q(seat_number__isnull=True) | Q(seat_number='')
        )
        page = self.paginate_queryset(passengers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

    # --- ACCIONES PERSONALIZADAS (ESCRITURA) CON INVALIDACIÓN DE CACHÉ ---
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def assign_seat(self, request, pk=None):
        """Asignar asiento a un pasajero"""
        passenger = self.get_object()
        seat_number = request.data.get('seat_number')
        
        if not seat_number:
            return Response(
                {'error': 'seat_number es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        seat_taken = ReservationPassenger.objects.filter(
            reservation=passenger.reservation,
            seat_number=seat_number
        ).exclude(id=passenger.id).exists()
        
        if seat_taken:
            return Response(
                {'error': f'El asiento {seat_number} ya está ocupado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        passenger.seat_number = seat_number
        passenger.save()
        
        self._clear_reservation_passengers_cache(pk=passenger.pk, user_id=passenger.reservation.user.id) # ¡CORRECCIÓN JWT!
        
        serializer = self.get_serializer(passenger)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def bulk_assign_seats(self, request):
        """Asignar asientos a múltiples pasajeros"""
        assignments = request.data.get('assignments', [])
        
        if not assignments:
            return Response(
                {'error': 'assignments es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_passengers = []
        errors = []
        user_ids_to_clear = set() # Para limpiar caché
        
        for assignment in assignments:
            passenger_id = assignment.get('passenger_id')
            seat_number = assignment.get('seat_number')
            
            try:
                # Usamos .all() para permitir al admin asignar a cualquier pasajero
                passenger = ReservationPassenger.objects.get(id=passenger_id)
                # Verificamos permiso si acaso el admin no es staff
                if not request.user.is_staff and passenger.reservation.user != request.user:
                     errors.append(f'Permiso denegado para pasajero {passenger_id}')
                     continue
                     
                passenger.seat_number = seat_number
                passenger.save()
                updated_passengers.append(passenger)
                user_ids_to_clear.add(passenger.reservation.user.id) # Añadir usuario para limpiar caché
            except ReservationPassenger.DoesNotExist:
                errors.append(f'Pasajero {passenger_id} no encontrado')
        
        # Limpiar caché para todos los usuarios afectados
        for user_id in user_ids_to_clear:
            self._clear_reservation_passengers_cache(user_id=user_id)
        
        serializer = self.get_serializer(updated_passengers, many=True)
        
        return Response({
            'updated': serializer.data,
            'errors': errors,
            'total_updated': len(updated_passengers)
        })

    @action(detail=False, methods=['post']) # Permitir a usuarios autenticados crear pasajeros
    def bulk_create(self, request):
        """Crear múltiples pasajeros a la vez para una reserva"""
        passengers_data = request.data.get('passengers', [])
        
        if not passengers_data:
            return Response(
                {'error': 'passengers es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_passengers = []
        errors = []
        user_ids_to_clear = set()
        
        for passenger_data in passengers_data:
            serializer = ReservationPassengerCreateSerializer(data=passenger_data)
            if serializer.is_valid():
                # Verificar permiso antes de guardar
                reservation_id = serializer.validated_data.get('reservation').id
                try:
                    reservation = Reservation.objects.get(id=reservation_id)
                    if reservation.user != request.user and not request.user.is_staff:
                        errors.append({
                            'data': passenger_data,
                            'errors': 'No tiene permiso sobre esta reserva'
                        })
                        continue
                        
                    instance = serializer.save()
                    created_passengers.append(serializer.data)
                    user_ids_to_clear.add(instance.reservation.user.id) # Añadir usuario para limpiar caché
                except Reservation.DoesNotExist:
                     errors.append({
                            'data': passenger_data,
                            'errors': f'Reserva {reservation_id} no encontrada'
                        })
            else:
                errors.append({
                    'data': passenger_data,
                    'errors': serializer.errors
                })
        
        # Limpiar caché para todos los usuarios afectados
        for user_id in user_ids_to_clear:
            self._clear_reservation_passengers_cache(user_id=user_id)
        
        return Response({
            'created': created_passengers,
            'errors': errors,
            'total_created': len(created_passengers),
            'total_errors': len(errors)
        }, status=status.HTTP_201_CREATED if created_passengers else status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def update_category(self, request, pk=None):
        """Actualizar categoría de pasajero"""
        passenger = self.get_object() # get_object() ya asegura permisos
        
        category = request.data.get('passenger_category')
        valid_categories = [c[0] for c in PassengerCategory.choices]
        
        if category not in valid_categories:
            return Response(
                {'error': f'Categoría debe ser una de: {", ".join(valid_categories)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        passenger.passenger_category = category
        passenger.save()
        
        self._clear_reservation_passengers_cache(pk=passenger.pk, user_id=passenger.reservation.user.id) # ¡CORRECCIÓN JWT!
        
        serializer = self.get_serializer(passenger)
        return Response(serializer.data)

