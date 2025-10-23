from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
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


class FlightViewSet(viewsets.ModelViewSet):
    queryset = Flight.objects.select_related('airline').all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'airline', 'number_of_stops']  # Removí origin y destination
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
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get all available flights"""
        flights = self.queryset.filter(status='scheduled', available_seats__gt=0)
        serializer = self.get_serializer(flights, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming flights (next 7 days)"""
        now = timezone.now()
        end_date = now + timedelta(days=7)
        flights = self.queryset.filter(
            departure_datetime__gte=now,
            departure_datetime__lte=end_date,
            status='scheduled'
        )
        serializer = self.get_serializer(flights, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
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
        
        flights = self.queryset.filter(
            origin__icontains=origin,
            destination__icontains=destination,
            status='scheduled'
        )
        
        if departure_date:
            flights = flights.filter(departure_datetime__date=departure_date)
        
        serializer = self.get_serializer(flights, many=True)
        return Response(serializer.data)

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
        serializer = self.get_serializer(flight)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_airline(self, request):
        """Get flights by airline"""
        airline_id = request.query_params.get('airline_id')
        if not airline_id:
            return Response(
                {'error': 'airline_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        flights = self.queryset.filter(airline_id=airline_id, status='scheduled')
        serializer = self.get_serializer(flights, many=True)
        return Response(serializer.data)