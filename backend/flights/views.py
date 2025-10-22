from rest_framework import viewsets
from .models import FlightRequest
from .serializers import FlightRequestSerializer

class FlightRequestViewSet(viewsets.ModelViewSet):
    queryset = FlightRequest.objects.all()
    serializer_class = FlightRequestSerializer
