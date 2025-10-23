from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from flights.views import FlightViewSet
from destinations.views import DestinationViewSet  
from airlines.views import AirlineViewSet
from flight_requests.views import FlightRequestViewSet
from reservations.views import ReservationViewSet
from reservation_passengers.views import ReservationPassengerViewSet







router = DefaultRouter()
router.register(r'flights', FlightViewSet)
router.register(r'destinations', DestinationViewSet)
router.register(r'airlines', AirlineViewSet)
router.register(r'flight-requests', FlightRequestViewSet)
router.register(r'reservations', ReservationViewSet) 
router.register(r'reservation-passengers', ReservationPassengerViewSet)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/', include('authentication.urls')),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    path('api/airlines/', include('airlines.urls')),
    path('api/destinations/', include('destinations.urls')),
    path('api/flight-requests/', include('flight_requests.urls')),
    path('api/flights/', include('flights.urls')),
    path('api/reservations/', include('reservations.urls')),
    path('api/reservation-passengers/', include('reservation_passengers.urls')),
    path('api/authentication/', include('authentication.urls')),
    
    
]
