# tests.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.urls import reverse
from datetime import date, timedelta
from .models import FlightRequest
from destinations.models import Destination

User = get_user_model()


class FlightRequestModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.destination = Destination.objects.create(
            name='Test Destination',
            code='TST',
            province='Test Province'
        )
        
    def test_create_flight_request(self):
        """Test creating a flight request"""
        flight_request = FlightRequest.objects.create(
            user=self.user,
            destination=self.destination,
            travel_date=date.today() + timedelta(days=7),
            companions=2
        )
        self.assertEqual(flight_request.status, 'PENDING')
        self.assertEqual(flight_request.companions, 2)
        self.assertEqual(flight_request.user, self.user)
        
    def test_flight_request_str(self):
        """Test flight request string representation"""
        flight_request = FlightRequest.objects.create(
            user=self.user,
            destination=self.destination,
            travel_date=date.today()
        )
        expected = f"Flight Request {flight_request.id} - {self.destination.name} on {date.today()}"
        self.assertEqual(str(flight_request), expected)


class FlightRequestAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.user = User.objects.create_user(
            username='testuser',
            email='user@test.com',
            password='testpass123'
        )
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='adminpass123',
            is_staff=True
        )
        
        # Create destinations
        self.origin = Destination.objects.create(
            name='Origin City',
            code='ORI',
            province='Origin Province'
        )
        self.destination = Destination.objects.create(
            name='Destination City',
            code='DST',
            province='Destination Province'
        )
        
        # Create flight request
        self.flight_request = FlightRequest.objects.create(
            user=self.user,
            destination=self.destination,
            origin=self.origin,
            travel_date=date.today() + timedelta(days=10),
            companions=3
        )
        
    def test_list_flight_requests_authenticated(self):
        """Test listing flight requests as authenticated user"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/flight-requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_list_flight_requests_unauthenticated(self):
        """Test listing flight requests without authentication"""
        response = self.client.get('/api/flight-requests/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
    def test_create_flight_request(self):
        """Test creating a new flight request"""
        self.client.force_authenticate(user=self.user)
        data = {
            'destination': self.destination.id,
            'origin': self.origin.id,
            'travel_date': (date.today() + timedelta(days=15)).isoformat(),
            'companions': 2,
            'notes': 'Test flight request'
        }
        response = self.client.post('/api/flight-requests/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FlightRequest.objects.count(), 2)
        
    def test_retrieve_flight_request(self):
        """Test retrieving a single flight request"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/flight-requests/{self.flight_request.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.flight_request.id)
        
    def test_update_flight_request(self):
        """Test updating a flight request"""
        self.client.force_authenticate(user=self.user)
        data = {
            'destination': self.destination.id,
            'travel_date': (date.today() + timedelta(days=20)).isoformat(),
            'companions': 4
        }
        response = self.client.patch(f'/api/flight-requests/{self.flight_request.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.flight_request.refresh_from_db()
        self.assertEqual(self.flight_request.companions, 4)
        
    def test_my_requests_action(self):
        """Test my_requests custom action"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/flight-requests/my_requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
    def test_pending_requests_action(self):
        """Test pending custom action"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/flight-requests/pending/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_confirm_flight_request_as_admin(self):
        """Test confirming a flight request as admin"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/flight-requests/{self.flight_request.id}/confirm/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.flight_request.refresh_from_db()
        self.assertEqual(self.flight_request.status, 'CONFIRMED')
        self.assertEqual(self.flight_request.reserved_by, self.admin)
        
    def test_confirm_flight_request_as_user(self):
        """Test confirming a flight request as regular user (should fail)"""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/flight-requests/{self.flight_request.id}/confirm/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_cancel_own_flight_request(self):
        """Test canceling own flight request"""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/flight-requests/{self.flight_request.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.flight_request.refresh_from_db()
        self.assertEqual(self.flight_request.status, 'CANCELLED')
        
    def test_cancel_other_user_flight_request(self):
        """Test canceling another user's flight request (should fail)"""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@test.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=other_user)
        response = self.client.post(f'/api/flight-requests/{self.flight_request.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_filter_by_status(self):
        """Test filtering flight requests by status"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/flight-requests/?status=PENDING')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_search_flight_requests(self):
        """Test searching flight requests"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/flight-requests/?search={self.destination.name}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class FlightRequestValidationTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.destination = Destination.objects.create(
            name='Test City',
            code='TST',
            province='Test Province'
        )
        self.client.force_authenticate(user=self.user)
        
    def test_companions_minimum_validation(self):
        """Test companions must be at least 1"""
        data = {
            'destination': self.destination.id,
            'travel_date': (date.today() + timedelta(days=10)).isoformat(),
            'companions': 0
        }
        response = self.client.post('/api/flight-requests/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_companions_maximum_validation(self):
        """Test companions maximum is 10"""
        data = {
            'destination': self.destination.id,
            'travel_date': (date.today() + timedelta(days=10)).isoformat(),
            'companions': 11
        }
        response = self.client.post('/api/flight-requests/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
