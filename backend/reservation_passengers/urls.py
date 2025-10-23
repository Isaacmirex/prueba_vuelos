from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReservationPassengerViewSet

app_name = 'reservation_passengers'

router = DefaultRouter()
router.register(r'', ReservationPassengerViewSet, basename='reservationpassenger')

urlpatterns = [
    path('', include(router.urls)),
]
