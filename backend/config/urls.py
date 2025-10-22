from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from flights.views import FlightRequestViewSet
from destinations.views import DestinationViewSet  # <-- AGREGA ESTA LÍNEA

router = DefaultRouter()
router.register(r'flights', FlightRequestViewSet)
router.register(r'destinations', DestinationViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
]
