# Tests for destinations app
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from .models import Destination

User = get_user_model()


class DestinationModelTest(TestCase):
    """Test Destination model"""
    
    def setUp(self):
        self.destination = Destination.objects.create(
            name="Quito",
            code="UIO",
            province="Pichincha",
            latitude=Decimal("-0.180653"),
            longitude=Decimal("-78.467838"),
            is_active=True
        )
    
    def test_destination_creation(self):
        """Test destination is created correctly"""
        self.assertEqual(self.destination.name, "Quito")
        self.assertEqual(self.destination.code, "UIO")
        self.assertTrue(self.destination.is_active)
    
    def test_destination_str(self):
        """Test destination string representation"""
        self.assertEqual(str(self.destination), "Quito (UIO)")
    
    def test_get_coordinates(self):
        """Test get_coordinates method"""
        coords = self.destination.get_coordinates()
        self.assertIsNotNone(coords)
        self.assertEqual(len(coords), 2)
    
    def test_get_coordinates_none(self):
        """Test get_coordinates returns None when no coordinates"""
        dest = Destination.objects.create(
            name="No Coords",
            code="NC",
            province="Test"
        )
        self.assertIsNone(dest.get_coordinates())


class DestinationAPITest(TestCase):
    """Test Destination API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='adminpass123'
        )
        self.normal_user = User.objects.create_user(
            username='user',
            email='user@test.com',
            password='userpass123'
        )
        
        self.destination_data = {
            'name': 'Guayaquil',
            'code': 'GYE',
            'province': 'Guayas',
            'latitude': '-2.170998',
            'longitude': '-79.922356',
            'is_active': True
        }
        
        self.test_destination = Destination.objects.create(
            name='Test City',
            code='TST',
            province='Test Province',
            is_active=True
        )
    
    def test_list_destinations_requires_authentication(self):
        """Test listing destinations requires authentication"""
        response = self.client.get('/api/destinations/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_destinations_authenticated(self):
        """Test authenticated user can list destinations"""
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.get('/api/destinations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_create_destination_admin_only(self):
        """Test only admin can create destinations"""
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.post('/api/destinations/', self.destination_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/destinations/', self.destination_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Guayaquil')
    
    def test_create_destination_code_uppercase(self):
        """Test destination code is converted to uppercase"""
        self.client.force_authenticate(user=self.admin_user)
        data = self.destination_data.copy()
        data['code'] = 'gye'
        response = self.client.post('/api/destinations/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'GYE')
    
    def test_retrieve_destination(self):
        """Test retrieving a specific destination"""
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.get(f'/api/destinations/{self.test_destination.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.test_destination.name)
    
    def test_update_destination_admin_only(self):
        """Test only admin can update destinations"""
        update_data = {'name': 'Updated City'}
        
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.patch(f'/api/destinations/{self.test_destination.id}/', update_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(f'/api/destinations/{self.test_destination.id}/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated City')
    
    def test_delete_destination_admin_only(self):
        """Test only admin can delete destinations"""
        destination = Destination.objects.create(
            name='Delete Test',
            code='DEL',
            province='Test'
        )
        
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.delete(f'/api/destinations/{destination.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/destinations/{destination.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    
    def test_filter_by_province(self):
        """Test filtering destinations by province"""
        Destination.objects.create(name="City 1", code="C1", province="Province A")
        Destination.objects.create(name="City 2", code="C2", province="Province B")
        
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.get('/api/destinations/?province=Province A')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_filter_active_destinations(self):
        """Test filtering active destinations"""
        Destination.objects.create(name="Active", code="ACT", province="Test", is_active=True)
        Destination.objects.create(name="Inactive", code="INA", province="Test", is_active=False)
        
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.get('/api/destinations/?is_active=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_search_destinations(self):
        """Test searching destinations"""
        Destination.objects.create(name="Search Test", code="SRC", province="Test")
        
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.get('/api/destinations/?search=Search')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_toggle_active_status(self):
        """Test toggling destination active status"""
        initial_status = self.test_destination.is_active
        
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(f'/api/destinations/{self.test_destination.id}/toggle_active/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotEqual(response.data['is_active'], initial_status)
    
    def test_get_active_destinations_endpoint(self):
        """Test dedicated active destinations endpoint"""
        Destination.objects.create(name="Active 1", code="A1", province="Test", is_active=True)
        Destination.objects.create(name="Active 2", code="A2", province="Test", is_active=True)
        Destination.objects.create(name="Inactive", code="IN", province="Test", is_active=False)
        
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.get('/api/destinations/active/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_by_province_endpoint(self):
        """Test grouping destinations by province"""
        Destination.objects.create(name="City A1", code="CA1", province="Province A")
        Destination.objects.create(name="City A2", code="CA2", province="Province A")
        Destination.objects.create(name="City B1", code="CB1", province="Province B")
        
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.get('/api/destinations/by_province/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)


class DestinationValidationTest(TestCase):
    """Test Destination validation"""
    
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='adminpass123'
        )
        self.client.force_authenticate(user=self.admin_user)
    
    def test_name_too_short(self):
        """Test destination name must be at least 3 characters"""
        data = {
            'name': 'AB',
            'code': 'AB',
            'province': 'Test'
        }
        response = self.client.post('/api/destinations/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_duplicate_code(self):
        """Test cannot create destination with duplicate code"""
        Destination.objects.create(name="First", code="TST", province="Test")
        data = {
            'name': 'Second',
            'code': 'TST',
            'province': 'Test'
        }
        response = self.client.post('/api/destinations/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_latitude_without_longitude(self):
        """Test latitude requires longitude"""
        data = {
            'name': 'Test City',
            'code': 'TC',
            'province': 'Test',
            'latitude': '-0.180653'
        }
        response = self.client.post('/api/destinations/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_longitude_without_latitude(self):
        """Test longitude requires latitude"""
        data = {
            'name': 'Test City',
            'code': 'TC',
            'province': 'Test',
            'longitude': '-78.467838'
        }
        response = self.client.post('/api/destinations/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_invalid_latitude(self):
        """Test latitude must be between -90 and 90"""
        data = {
            'name': 'Test City',
            'code': 'TC',
            'province': 'Test',
            'latitude': '100',
            'longitude': '-78.467838'
        }
        response = self.client.post('/api/destinations/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_invalid_longitude(self):
        """Test longitude must be between -180 and 180"""
        data = {
            'name': 'Test City',
            'code': 'TC',
            'province': 'Test',
            'latitude': '-0.180653',
            'longitude': '200'
        }
        response = self.client.post('/api/destinations/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_valid_coordinates(self):
        """Test valid coordinates are accepted"""
        data = {
            'name': 'Valid City',
            'code': 'VAL',
            'province': 'Test',
            'latitude': '-0.180653',
            'longitude': '-78.467838'
        }
        response = self.client.post('/api/destinations/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(response.data.get('coordinates'))
