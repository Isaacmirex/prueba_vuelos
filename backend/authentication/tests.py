import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import User


@pytest.mark.django_db
class TestUserMigrations:
    
    def test_auth_user_table_exists(self):
        """Verificar que la tabla 'auth_user' existe en la base de datos"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'auth_user'
                );
            """)
            table_exists = cursor.fetchone()[0]
        assert table_exists, "La tabla 'auth_user' no existe"
    
    def test_auth_user_table_columns(self):
        """Verificar que todas las columnas esperadas existen en la tabla"""
        expected_columns = {
            'id',
            'username',
            'email',
            'password',
            'first_name',
            'last_name',
            'phone',
            'is_operator',
            'is_staff',
            'is_active',
            'is_superuser',
            'date_joined',
            'last_login',
            'date_of_birday',
            'country',
            'city',
            'profile_image_url',
            'created_at',
            'updated_at'
        }
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'auth_user';
            """)
            actual_columns = {row[0] for row in cursor.fetchall()}
        
        assert expected_columns.issubset(actual_columns), \
            f"Columnas faltantes: {expected_columns - actual_columns}"
    
    def test_email_unique_constraint(self):
        """Verificar que email tiene constraint UNIQUE"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) 
                FROM information_schema.table_constraints 
                WHERE table_name = 'auth_user' 
                AND constraint_type = 'UNIQUE'
                AND constraint_name LIKE '%email%';
            """)
            constraint_exists = cursor.fetchone()[0] > 0
        
        assert constraint_exists, "El constraint UNIQUE en email no existe"
    
    def test_primary_key_exists(self):
        """Verificar que existe la primary key en id"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) 
                FROM information_schema.table_constraints 
                WHERE table_name = 'auth_user' 
                AND constraint_type = 'PRIMARY KEY';
            """)
            pk_exists = cursor.fetchone()[0] > 0
        
        assert pk_exists, "La primary key en id no existe"
    
    def test_migrations_applied(self):
        """Verificar que todas las migraciones están aplicadas"""
        executor = MigrationExecutor(connection)
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        
        assert len(plan) == 0, \
            f"Hay {len(plan)} migraciones pendientes por aplicar"


@pytest.mark.django_db
class TestUserModel:
    
    def test_create_user(self):
        """Verificar que se puede crear un usuario"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.check_password('testpass123')
    
    def test_user_str_method(self):
        """Verificar el método __str__ del usuario"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        expected = "Test User (test@example.com)"
        assert str(user) == expected
    
    def test_user_age_property(self):
        """Verificar que el property age funciona correctamente"""
        from datetime import date
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            date_of_birth=date(1990, 1, 1)
        )
        assert user.age is not None
        assert user.age >= 30
    
    def test_is_operator_default(self):
        """Verificar que is_operator es False por defecto"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        assert user.is_operator is False


@pytest.mark.django_db
class TestUserAPI:
    
    def setup_method(self):
        """Configurar cliente API y crear usuario de prueba"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.admin = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User'
        )
    
    def test_list_users_unauthenticated(self):
        """Verificar que usuarios no autenticados no pueden listar usuarios"""
        url = reverse('user-list')
        response = self.client.get(url)
        # Dependiendo de tu configuración, puede ser 401 o 403
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    
    def test_list_users_authenticated(self):
        """Verificar que usuarios autenticados pueden listar usuarios"""
        self.client.force_authenticate(user=self.user)
        url = reverse('user-list')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 2  # Al menos testuser y admin
    
    def test_get_user_detail(self):
        """Verificar que se puede obtener detalle de un usuario"""
        self.client.force_authenticate(user=self.user)
        url = reverse('user-detail', kwargs={'pk': self.user.pk})
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == 'test@example.com'
    
    def test_get_current_user(self):
        """Verificar endpoint /me/"""
        self.client.force_authenticate(user=self.user)
        url = reverse('user-me')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == 'test@example.com'

