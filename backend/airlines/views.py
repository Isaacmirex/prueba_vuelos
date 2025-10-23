# Views for airlines app
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from .models import Airline
from .serializers import (
    AirlineSerializer,
    AirlineListSerializer,
    AirlineCreateUpdateSerializer
)


class AirlineViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing airlines
    """
    queryset = Airline.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return AirlineListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return AirlineCreateUpdateSerializer
        return AirlineSerializer

    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        """List all airlines"""
        queryset = self.filter_queryset(self.get_queryset())
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Create a new airline"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        airline = Airline.objects.get(pk=serializer.instance.pk)
        output_serializer = AirlineSerializer(airline)
        
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        """Update an airline"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        airline = Airline.objects.get(pk=instance.pk)
        output_serializer = AirlineSerializer(airline)
        
        return Response(output_serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Delete an airline"""
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def duplicate(self, request, pk=None):
        """Duplicate an airline"""
        airline = self.get_object()
        new_code = request.data.get('new_code')
        new_name = request.data.get('new_name')
        
        if not new_code or not new_name:
            return Response(
                {"error": "new_code and new_name are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        new_airline = Airline.objects.create(
            name=new_name,
            code=new_code.upper(),
            logo_url=airline.logo_url
        )
        
        serializer = AirlineSerializer(new_airline)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
