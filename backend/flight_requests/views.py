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
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """Get current user's flight requests"""
        requests = self.queryset.filter(user=request.user)
        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending flight requests"""
        requests = self.queryset.filter(status='PENDING')
        serializer = self.get_serializer(requests, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def confirm(self, request, pk=None):
        """Confirm a flight request"""
        flight_request = self.get_object()
        flight_request.status = 'CONFIRMED'
        flight_request.reserved_by = request.user
        from django.utils import timezone
        flight_request.reserved_at = timezone.now()
        flight_request.save()
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
        serializer = self.get_serializer(flight_request)
        return Response(serializer.data)
