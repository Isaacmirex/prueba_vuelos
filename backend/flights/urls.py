from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from flights.views import FlightRequestViewSet

router = DefaultRouter()
router.register(r'flights', FlightRequestViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/destinations/', include('destinations.urls')),  # Ya tenías este
]
