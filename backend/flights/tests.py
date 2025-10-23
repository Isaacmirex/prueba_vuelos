from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.urls import reverse
from decimal import Decimal
from datetime import datetime, timedelta
from .models import Flight
from airlines.models import Airline

User = get_user_model()

class FlightModelTest(TestCase):
    def setUp(self):
        self.airline = Airline.objects.create(
            name='LATAM Airlines',
            code='LA',
            logo_url='https://example.com/latam.png'
        )
        
        self.flight = Flight.objects.create(
            flight_code='LA2501',
            airline=self.airline,
            origin='Quito',
            destination='Guayaquil',
            departure_datetime=datetime.now() + timedelta(days=1),
            arrival_datetime=datetime.now() + timedelta(days=1, hours=1),
            number_of_stops=0,
            adult_price=Decimal('150.00'),
            child_price=Decimal('100.00'),
            special_price=Decimal('120.00'),
            available_seats=180,
            status='scheduled'
        )
    
    def test_flight_creation(self):
        self.assertEqual(self.flight.flight_code, 'LA2501')
        self.assertEqual(self.flight.origin, 'Quito')
        self.assertEqual(self.flight.destination, 'Guayaquil')
        self.assertEqual(self.flight.airline, self.airline)
    
    def test_flight_str(self):
        expected = f"{self.flight.flight_code} - {self.flight.origin} to {self.flight.destination}"
        self.assertEqual(str(self.flight), expected)

class FlightAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        self.admin = User.objects.create_superuser(
            username='admin',
            password='admin123',
            email='admin@example.com'
        )
        
        self.airline = Airline.objects.create(
            name='LATAM Airlines',
            code='LA',
            logo_url='https://example.com/latam.png'
        )
        
        self.flight1 = Flight.objects.create(
            flight_code='LA2501',
            airline=self.airline,
            origin='Quito',
            destination='Guayaquil',
            departure_datetime=datetime.now() + timedelta(days=1),
            arrival_datetime=datetime.now() + timedelta(days=1, hours=1),
            number_of_stops=0,
            adult_price=Decimal('150.00'),
            child_price=Decimal('100.00'),
            special_price=Decimal('120.00'),
            available_seats=180,
            status='scheduled'
        )
        
        self.flight2 = Flight.objects.create(
            flight_code='LA2502',
            airline=self.airline,
            origin='Guayaquil',
            destination='Cuenca',
            departure_datetime=datetime.now() + timedelta(days=2),
            arrival_datetime=datetime.now() + timedelta(days=2, hours=1),
            number_of_stops=0,
            adult_price=Decimal('120.00'),
            child_price=Decimal('80.00'),
            special_price=Decimal('100.00'),
            available_seats=150,
            status='scheduled'
        )
    
    def get_jwt_token(self, username, password):
        response = self.client.post('/api/auth/login/', {
            'username': username,
            'password': password
        })
        return response.data['access']
    
    def test_list_flights_unauthenticated(self):
        response = self.client.get('/api/flights/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_flights_authenticated(self):
        token = self.get_jwt_token('testuser', 'testpass123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.get('/api/flights/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_retrieve_flight(self):
        token = self.get_jwt_token('testuser', 'testpass123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.get(f'/api/flights/{self.flight1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['flight_code'], 'LA2501')
        self.assertEqual(response.data['origin'], 'Quito')
        self.assertEqual(response.data['destination'], 'Guayaquil')
    
    def test_create_flight_as_admin(self):
        token = self.get_jwt_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        data = {
            'flight_code': 'LA2503',
            'airline': self.airline.id,
            'origin': 'Manta',
            'destination': 'Quito',
            'departure_datetime': (datetime.now() + timedelta(days=3)).isoformat(),
            'arrival_datetime': (datetime.now() + timedelta(days=3, hours=1)).isoformat(),
            'number_of_stops': 0,
            'adult_price': '180.00',
            'child_price': '120.00',
            'special_price': '150.00',
            'available_seats': 200,
            'status': 'scheduled'
        }
        
        response = self.client.post('/api/flights/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['origin'], 'Manta')
        self.assertEqual(response.data['destination'], 'Quito')
    
    def test_create_flight_as_user_forbidden(self):
        token = self.get_jwt_token('testuser', 'testpass123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        data = {
            'flight_code': 'LA2503',
            'airline': self.airline.id,
            'origin': 'Manta',
            'destination': 'Quito',
            'departure_datetime': (datetime.now() + timedelta(days=3)).isoformat(),
            'arrival_datetime': (datetime.now() + timedelta(days=3, hours=1)).isoformat(),
            'number_of_stops': 0,
            'adult_price': '180.00',
            'available_seats': 200
        }
        
        response = self.client.post('/api/flights/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_search_flights_by_origin(self):
        token = self.get_jwt_token('testuser', 'testpass123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.get('/api/flights/?search=Quito')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['origin'], 'Quito')
    
    def test_search_route_action(self):
        token = self.get_jwt_token('testuser', 'testpass123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.get('/api/flights/search_route/?origin=Quito&destination=Guayaquil')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['flight_code'], 'LA2501')
    
    def test_available_flights_action(self):
        token = self.get_jwt_token('testuser', 'testpass123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.get('/api/flights/available/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Both flights should be scheduled
        self.assertEqual(len(response.data), 2)
    
    def test_by_airline_action(self):
        token = self.get_jwt_token('testuser', 'testpass123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.get(f'/api/flights/by_airline/?airline_id={self.airline.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
