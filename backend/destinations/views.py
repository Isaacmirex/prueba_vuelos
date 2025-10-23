# Views for destinations app
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from .models import Destination
from .serializers import (
    DestinationSerializer,
    DestinationListSerializer,
    DestinationCreateUpdateSerializer
)

# --- ¡AÑADIDO PARA REDIS! ---
from django.core.cache import cache
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
# --- FIN DE ADICIONES ---


class DestinationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing destinations
    """
    queryset = Destination.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'province']
    ordering_fields = ['name', 'code', 'province', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return DestinationListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return DestinationCreateUpdateSerializer
        return DestinationSerializer

    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'toggle_active']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """Filter queryset by query parameters"""
        queryset = super().get_queryset()
        
        # Filter by province
        province = self.request.query_params.get('province', None)
        if province:
            queryset = queryset.filter(province__icontains=province)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            if is_active.lower() == 'true':
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() == 'false':
                queryset = queryset.filter(is_active=False)
        
        # Filter by active_only parameter
        active_only = self.request.query_params.get('active_only', None)
        if active_only and active_only.lower() == 'true':
            queryset = queryset.filter(is_active=True)
        
        return queryset

    # --- FUNCIÓN HELPER PARA LIMPIAR CACHÉ ---
    def _clear_destination_cache(self, pk=None):
        """Limpia el caché de detalle y todas las listas."""
        if pk:
            # Borra el caché del detalle específico
            cache.delete(f"destination_detail_{pk}")
        
        # Borra todos los cachés de listas (usa delete_pattern de django-redis)
        cache.delete_pattern("destinations_list_*")
        # Borra los cachés de las acciones personalizadas (key_prefix)
        cache.delete_pattern("destinations_active*")
        cache.delete_pattern("destinations_by_province*")
        cache.delete_pattern("destinations_nearby*")


    # --- ACCIÓN 'list' MODIFICADA CON CACHÉ MANUAL ---
    def list(self, request, *args, **kwargs):
        """
        List all destinations
        (Modificado para usar el Low-Level Cache API de Redis)
        """
        # 1. Crear clave de caché única basada en los parámetros de consulta
        #    (para que ?province=X y ?is_active=true tengan cachés diferentes)
        cache_key = f"destinations_list_{request.query_params.urlencode()}"
        
        # 2. Intentar obtener de la caché
        cached_data = cache.get(cache_key)
        if cached_data:
            # ¡Encontrado en caché! Retornar directamente.
            return Response(cached_data)

        # 3. Si no, consultar la BD (el trabajo normal)
        queryset = self.filter_queryset(self.get_queryset())
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # .data es importante para cachear el JSON, no el objeto Response
            response_data = self.get_paginated_response(serializer.data).data
        else:
            serializer = self.get_serializer(queryset, many=True)
            response_data = serializer.data
        
        # 4. Guardar en caché antes de retornar
        cache.set(cache_key, response_data, settings.API_CACHE_TIMEOUT)
        
        # 5. Retornar respuesta
        return Response(response_data)

    # --- ACCIÓN 'retrieve' (IMPLÍCITA) MODIFICADA CON CACHÉ MANUAL ---
    def retrieve(self, request, *args, **kwargs):
        """
        Get a single destination by ID
        (Modificado para usar el Low-Level Cache API de Redis)
        """
        pk = kwargs.get('pk')
        cache_key = f"destination_detail_{pk}"

        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        instance = self.get_object()
        serializer = self.get_serializer(instance)
        response_data = serializer.data
        
        # Guardar en caché
        cache.set(cache_key, response_data, settings.API_CACHE_TIMEOUT)
        
        return Response(response_data)

    # --- ACCIONES DE ESCRITURA CON INVALIDACIÓN DE CACHÉ ---

    def create(self, request, *args, **kwargs):
        """Create a new destination"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # ¡LIMPIAR CACHÉ!
        self._clear_destination_cache()
        
        destination = Destination.objects.get(pk=serializer.instance.pk)
        output_serializer = DestinationSerializer(destination)
        
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        """Update a destination"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # ¡LIMPIAR CACHÉ!
        self._clear_destination_cache(pk=instance.pk)
        
        destination = Destination.objects.get(pk=instance.pk)
        output_serializer = DestinationSerializer(destination)
        
        return Response(output_serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Delete a destination"""
        instance = self.get_object()
        pk = instance.pk # Guardar pk antes de borrar
        self.perform_destroy(instance)
        
        # ¡LIMPIAR CACHÉ!
        self._clear_destination_cache(pk=pk)
        
        return Response(status=status.HTTP_204_NO_CONTENT)

    # --- ACCIONES PERSONALIZADAS (LECTURA) CON CACHÉ 'cache_page' ---
    # Este es el método más simple (automático)
    
    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="destinations_active"))
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def active(self, request):
        """Get only active destinations"""
        queryset = self.get_queryset().filter(is_active=True)
        serializer = DestinationListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def toggle_active(self, request, pk=None):
        """Toggle destination active status"""
        destination = self.get_object()
        destination.is_active = not destination.is_active
        destination.save()
        
        # ¡LIMPIAR CACHÉ!
        self._clear_destination_cache(pk=destination.pk)
        
        serializer = DestinationSerializer(destination)
        return Response(serializer.data)

    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="destinations_by_province"))
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def by_province(self, request):
        """Group destinations by province"""
        provinces = self.get_queryset().values_list('province', flat=True).distinct()
        result = {}
        
        for province in provinces:
            destinations = self.get_queryset().filter(province=province)
            result[province] = DestinationListSerializer(destinations, many=True).data
        
        return Response(result)

    @method_decorator(cache_page(settings.API_CACHE_TIMEOUT, key_prefix="destinations_nearby"))
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def nearby(self, request, pk=None):
        """Get nearby destinations (placeholder - would need geospatial queries)"""
        destination = self.get_object()
        
        if not destination.latitude or not destination.longitude:
            return Response(
                {"error": "This destination doesn't have coordinates"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Simple implementation - would be better with PostGIS
        return Response({
            "message": "Nearby destinations feature",
            "destination": destination.name,
            "coordinates": destination.get_coordinates()
        })
