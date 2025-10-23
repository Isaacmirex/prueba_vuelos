from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from flights.views import FlightViewSet
from flight_requests.views import FlightRequestViewSet
from destinations.views import DestinationViewSet  
from airlines.views import AirlineViewSet


router = DefaultRouter()
router.register(r'flights', FlightViewSet)  # Vuelos reales
router.register(r'flight-requests', FlightRequestViewSet)  # Solicitudes de vuelo
router.register(r'destinations', DestinationViewSet)
router.register(r'airlines', AirlineViewSet)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
]
