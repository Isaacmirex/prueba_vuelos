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
        elif self.action in ['create', 'update', 'partial_update']:
            return ReservationPassengerCreateSerializer
        return ReservationPassengerSerializer

    def get_permissions(self):
        if self.action in ['destroy', 'bulk_delete']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return self.queryset
        # Los usuarios solo ven pasajeros de sus propias reservas
        return self.queryset.filter(reservation__user=user)

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
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def main_passengers(self, request):
        """Obtener solo pasajeros principales"""
        passengers = self.get_queryset().filter(passenger_type=PassengerType.MAIN)
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def companions(self, request):
        """Obtener solo acompañantes"""
        passengers = self.get_queryset().filter(passenger_type=PassengerType.COMPANION)
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def adults(self, request):
        """Obtener solo pasajeros adultos"""
        passengers = self.get_queryset().filter(passenger_category=PassengerCategory.ADULT)
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def children(self, request):
        """Obtener solo pasajeros niños"""
        passengers = self.get_queryset().filter(passenger_category=PassengerCategory.CHILD)
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

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
            'with_seat_assigned': queryset.filter(seat_number__isnull=False).count(),
            'without_seat_assigned': queryset.filter(seat_number__isnull=True).count(),
        }
        
        return Response(stats)

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
        
        # Verificar que el asiento no esté ocupado en la misma reserva
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
        
        for assignment in assignments:
            passenger_id = assignment.get('passenger_id')
            seat_number = assignment.get('seat_number')
            
            try:
                passenger = self.get_queryset().get(id=passenger_id)
                passenger.seat_number = seat_number
                passenger.save()
                updated_passengers.append(passenger)
            except ReservationPassenger.DoesNotExist:
                errors.append(f'Pasajero {passenger_id} no encontrado')
        
        serializer = self.get_serializer(updated_passengers, many=True)
        
        return Response({
            'updated': serializer.data,
            'errors': errors,
            'total_updated': len(updated_passengers)
        })

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
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

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
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def bulk_create(self, request):
        """Crear múltiples pasajeros a la vez"""
        passengers_data = request.data.get('passengers', [])
        
        if not passengers_data:
            return Response(
                {'error': 'passengers es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_passengers = []
        errors = []
        
        for passenger_data in passengers_data:
            serializer = ReservationPassengerCreateSerializer(data=passenger_data)
            if serializer.is_valid():
                serializer.save()
                created_passengers.append(serializer.data)
            else:
                errors.append({
                    'data': passenger_data,
                    'errors': serializer.errors
                })
        
        return Response({
            'created': created_passengers,
            'errors': errors,
            'total_created': len(created_passengers),
            'total_errors': len(errors)
        }, status=status.HTTP_201_CREATED if created_passengers else status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def unassigned_seats(self, request):
        """Obtener pasajeros sin asiento asignado"""
        passengers = self.get_queryset().filter(
            Q(seat_number__isnull=True) | Q(seat_number='')
        )
        serializer = self.get_serializer(passengers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def update_category(self, request, pk=None):
        """Actualizar categoría de pasajero"""
        passenger = self.get_object()
        
        # Solo el dueño de la reserva o admin pueden actualizar
        if passenger.reservation.user != request.user and not request.user.is_staff:
            return Response(
                {'error': 'No tienes permiso para actualizar este pasajero'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        category = request.data.get('passenger_category')
        valid_categories = [c[0] for c in PassengerCategory.choices]
        
        if category not in valid_categories:
            return Response(
                {'error': f'Categoría debe ser una de: {", ".join(valid_categories)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        passenger.passenger_category = category
        passenger.save()
        serializer = self.get_serializer(passenger)
        return Response(serializer.data)
