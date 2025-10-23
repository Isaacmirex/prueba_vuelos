from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from flight_requests.views import FlightRequestViewSet  # Cambia este import
from destinations.views import DestinationViewSet  
from airlines.views import AirlineViewSet

router = DefaultRouter()
router.register(r'flight-requests', FlightRequestViewSet)  # Cambia la ruta
router.register(r'destinations', DestinationViewSet)
router.register(r'airlines', AirlineViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
]
