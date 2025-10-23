# Tests for airlines app
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Airline

User = get_user_model()


class AirlineModelTest(TestCase):
    """Test Airline model"""
    
    def setUp(self):
        self.airline = Airline.objects.create(
            name="Test Airlines",
            code="TST",
            logo_url="https://example.com/logo.png"
        )
    
    def test_airline_creation(self):
        """Test airline is created correctly"""
        self.assertEqual(self.airline.name, "Test Airlines")
        self.assertEqual(self.airline.code, "TST")
        self.assertIsNotNone(self.airline.created_at)
    
    def test_airline_str(self):
        """Test airline string representation"""
        self.assertEqual(str(self.airline), "Test Airlines (TST)")
    
    def test_airline_unique_code(self):
        """Test airline code uniqueness"""
        with self.assertRaises(Exception):
            Airline.objects.create(
                name="Another Airline",
                code="TST"
            )
    
    def test_airline_unique_name(self):
        """Test airline name uniqueness"""
        with self.assertRaises(Exception):
            Airline.objects.create(
                name="Test Airlines",
                code="TS2"
            )


class AirlineAPITest(TestCase):
    """Test Airline API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Crear usuarios
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
        
        # Datos de prueba
        self.airline_data = {
            'name': 'LATAM Airlines',
            'code': 'LA',
            'logo_url': 'https://latam.com/logo.png'
        }
        
        # Crear aerolínea de prueba
        self.test_airline = Airline.objects.create(
            name='Test Airline',
            code='TEST',
            logo_url='https://test.com/logo.png'
        )
    
    def test_list_airlines_requires_authentication(self):
        """Test listing airlines requires authentication"""
        response = self.client.get('/api/airlines/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_airlines_authenticated(self):
        """Test authenticated user can list airlines"""
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.get('/api/airlines/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_create_airline_admin_only(self):
        """Test only admin can create airlines"""
        # Usuario normal no puede crear
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.post('/api/airlines/', self.airline_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin sí puede crear
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/airlines/', self.airline_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'LATAM Airlines')
    
    def test_create_airline_code_uppercase(self):
        """Test airline code is converted to uppercase"""
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'name': 'Lowercase Test',
            'code': 'low',
            'logo_url': 'https://test.com/logo.png'
        }
        response = self.client.post('/api/airlines/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'LOW')
    
    def test_retrieve_airline(self):
        """Test retrieving a specific airline"""
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.get(f'/api/airlines/{self.test_airline.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.test_airline.name)
        self.assertEqual(response.data['code'], self.test_airline.code)
    
    def test_update_airline_admin_only(self):
        """Test only admin can update airlines"""
        update_data = {'name': 'Updated Airlines'}
        
        # Usuario normal no puede actualizar
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.patch(f'/api/airlines/{self.test_airline.id}/', update_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin sí puede actualizar
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(f'/api/airlines/{self.test_airline.id}/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Airlines')
    
    def test_delete_airline_admin_only(self):
        """Test only admin can delete airlines"""
        airline = Airline.objects.create(
            name='Delete Test',
            code='DEL',
            logo_url='https://test.com/logo.png'
        )
        
        # Usuario normal no puede eliminar
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.delete(f'/api/airlines/{airline.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin sí puede eliminar
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/airlines/{airline.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    
    def test_search_airlines(self):
        """Test searching airlines by name or code"""
        Airline.objects.create(name="Search Test", code="SRC", logo_url="https://test.com/logo.png")
        
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.get('/api/airlines/?search=Search')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data['results']) > 0)
    
    def test_ordering_airlines(self):
        """Test ordering airlines"""
        Airline.objects.create(name="Zebra Airlines", code="ZEB", logo_url="https://test.com/logo.png")
        Airline.objects.create(name="Alpha Airlines", code="ALP", logo_url="https://test.com/logo.png")
        
        self.client.force_authenticate(user=self.normal_user)
        response = self.client.get('/api/airlines/?ordering=name')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AirlineValidationTest(TestCase):
    """Test Airline validation"""
    
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='adminpass123'
        )
        self.client.force_authenticate(user=self.admin_user)
    
    def test_name_too_short(self):
        """Test airline name must be at least 3 characters"""
        data = {
            'name': 'AB',
            'code': 'AB',
        }
        response = self.client.post('/api/airlines/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_duplicate_code(self):
        """Test cannot create airline with duplicate code"""
        Airline.objects.create(name="First Airline", code="TST")
        data = {
            'name': 'Second Airline',
            'code': 'TST',
        }
        response = self.client.post('/api/airlines/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_duplicate_name(self):
        """Test cannot create airline with duplicate name"""
        Airline.objects.create(name="Test Airlines", code="TS1")
        data = {
            'name': 'Test Airlines',
            'code': 'TS2',
        }
        response = self.client.post('/api/airlines/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
