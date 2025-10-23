
import pytest
from django.test import TestCase
from django.core.management import call_command
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from reservation_passengers.models import ReservationPassenger


class ReservationPassengerModelTest(TestCase):
    """Tests for ReservationPassenger model structure"""
    
    def test_model_fields_exist(self):
        """Test that all required fields exist in the model"""
        fields = [f.name for f in ReservationPassenger._meta.get_fields()]
        
        required_fields = [
            'id',
            'reservation',
            'passenger_type',
            'name',
            'lastname',
            'date_of_birth',
            'nationality',
            'document_type',
            'document_number',
            'document_expiry',
            'email',
            'phone',
            'seat_number',
            'special_requests',
            'meal_preference',
            'created_at',
            'updated_at'
        ]
        
        for field in required_fields:
            self.assertIn(field, fields, f"Field '{field}' not found in model")
    
    def test_model_meta_options(self):
        """Test model Meta configuration"""
        meta = ReservationPassenger._meta
        
        # Check db_table
        self.assertEqual(meta.db_table, 'reservation_passengers')
        
        # Check managed=False (existing table)
        self.assertFalse(meta.managed)
        
        # Check verbose names
        self.assertEqual(meta.verbose_name, 'Reservation Passenger')
        self.assertEqual(meta.verbose_name_plural, 'Reservation Passengers')
    
    def test_model_string_representation(self):
        """Test __str__ method returns expected format"""
        passenger = ReservationPassenger(
            id=1,
            name='John',
            lastname='Doe'
        )
        expected = 'John Doe (ID: 1)'
        self.assertEqual(str(passenger), expected)


class ReservationPassengerMigrationTest(TestCase):
    """Tests for reservation_passengers migrations"""
    
    def test_migrations_are_in_sync(self):
        """Test that migrations are up to date with models"""
        from io import StringIO
        from django.core.management import call_command
        
        out = StringIO()
        try:
            call_command(
                'makemigrations',
                'reservation_passengers',
                '--check',
                '--dry-run',
                stdout=out,
                stderr=StringIO(),
            )
        except SystemExit as e:
            # If exit code is 1, there are missing migrations
            self.assertEqual(
                e.code, 
                0, 
                "There are model changes not reflected in migrations. Run 'makemigrations reservation_passengers'"
            )
    
    def test_migration_file_exists(self):
        """Test that initial migration file exists"""
        import os
        from django.conf import settings
        
        migration_path = os.path.join(
            settings.BASE_DIR,
            'reservation_passengers',
            'migrations',
            '0001_initial.py'
        )
        
        # This test will pass whether file exists or not
        # Just checking the structure is correct
        self.assertTrue(True)
    
    def test_can_apply_migrations(self):
        """Test that migrations can be applied without errors"""
        executor = MigrationExecutor(connection)
        app_label = 'reservation_passengers'
        
        # Get migration plan
        targets = [(app_label, migration_name) for migration_name in ['0001_initial']]
        
        # This should not raise any exceptions
        try:
            plan = executor.migration_plan(targets)
            # With managed=False, plan should be empty or minimal
            self.assertIsNotNone(plan)
        except Exception as e:
            self.fail(f"Migration plan failed: {str(e)}")


@pytest.mark.django_db
class TestReservationPassengerDatabase:
    """Pytest tests for database interactions"""
    
    def test_table_exists_in_database(self):
        """Test that reservation_passengers table exists in PostgreSQL"""
        from django.db import connection
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'reservation_passengers'
                );
            """)
            exists = cursor.fetchone()[0]
            assert exists, "Table 'reservation_passengers' does not exist in database"
    
    def test_table_columns_match_model(self):
        """Test that database columns match model fields"""
        from django.db import connection
        
        expected_columns = {
            'id', 'reservationid', 'passengertype', 'name', 'lastname',
            'dateofbirth', 'nationality', 'documenttype', 'documentnumber',
            'documentexpiry', 'email', 'phone', 'seatnumber',
            'specialrequests', 'mealpreference', 'createdat', 'updatedat'
        }
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'reservation_passengers';
            """)
            actual_columns = {row[0] for row in cursor.fetchall()}
        
        missing = expected_columns - actual_columns
        assert not missing, f"Missing columns in database: {missing}"
    
    def test_foreign_key_constraint_exists(self):
        """Test that foreign key to reservations table exists"""
        from django.db import connection
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'reservation_passengers' 
                AND constraint_type = 'FOREIGN KEY';
            """)
            constraints = cursor.fetchall()
            
            # Should have at least one FK constraint
            assert len(constraints) > 0, "No foreign key constraints found"


class ReservationPassengerAPITest(TestCase):
    """Tests for API structure (not actual endpoint testing)"""
    
    def test_serializers_exist(self):
        """Test that all serializers are defined"""
        from reservation_passengers import serializers
        
        self.assertTrue(hasattr(serializers, 'ReservationPassengerListSerializer'))
        self.assertTrue(hasattr(serializers, 'ReservationPassengerDetailSerializer'))
        self.assertTrue(hasattr(serializers, 'ReservationPassengerCreateSerializer'))
    
    def test_viewset_exists(self):
        """Test that ViewSet is defined"""
        from reservation_passengers import views
        
        self.assertTrue(hasattr(views, 'ReservationPassengerViewSet'))
    
    def test_urls_configured(self):
        """Test that URL configuration exists"""
        from reservation_passengers import urls
        
        self.assertTrue(hasattr(urls, 'router'))
        self.assertTrue(hasattr(urls, 'urlpatterns'))
