from rest_framework import viewsets
from .models import Destination
from .serializers import DestinationSerializer


class DestinationViewSet(viewsets.ModelViewSet):
    queryset = Destination.objects.filter(is_active=True)
    serializer_class = DestinationSerializer
