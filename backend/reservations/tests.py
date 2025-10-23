import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


@pytest.mark.django_db
class TestReservationMigrations:
    
    def test_reservations_table_exists(self):
        """Verificar que la tabla 'reservations' existe en la base de datos"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'reservations'
                );
            """)
            table_exists = cursor.fetchone()[0]
        assert table_exists, "La tabla 'reservations' no existe"
    
    def test_reservations_table_columns(self):
        """Verificar que todas las columnas esperadas existen en la tabla"""
        expected_columns = {
            'id',
            'reservation_code',
            'user_id',
            'flight_id',
            'reservation_date',
            'total_passengers',
            'total_amount',
            'status',
            'created_at',
            'updated_at'
        }
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'reservations';
            """)
            actual_columns = {row[0] for row in cursor.fetchall()}
        
        assert expected_columns.issubset(actual_columns), \
            f"Columnas faltantes: {expected_columns - actual_columns}"
    
    def test_reservation_code_unique_constraint(self):
        """Verificar que reservation_code tiene constraint UNIQUE"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) 
                FROM information_schema.table_constraints 
                WHERE table_name = 'reservations' 
                AND constraint_type = 'UNIQUE'
                AND constraint_name LIKE '%reservation_code%';
            """)
            constraint_exists = cursor.fetchone()[0] > 0
        
        assert constraint_exists, "El constraint UNIQUE en reservation_code no existe"
    
    def test_user_foreign_key_exists(self):
        """Verificar que existe la foreign key a la tabla de usuarios"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) 
                FROM information_schema.table_constraints 
                WHERE table_name = 'reservations' 
                AND constraint_type = 'FOREIGN KEY'
                AND constraint_name LIKE '%user_id%';
            """)
            fk_exists = cursor.fetchone()[0] > 0
        
        assert fk_exists, "La foreign key user_id no existe"
    
    def test_flight_foreign_key_exists(self):
        """Verificar que existe la foreign key a la tabla de vuelos"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) 
                FROM information_schema.table_constraints 
                WHERE table_name = 'reservations' 
                AND constraint_type = 'FOREIGN KEY'
                AND constraint_name LIKE '%flight_id%';
            """)
            fk_exists = cursor.fetchone()[0] > 0
        
        assert fk_exists, "La foreign key flight_id no existe"
    
    def test_migrations_applied(self):
        """Verificar que todas las migraciones están aplicadas"""
        executor = MigrationExecutor(connection)
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        
        assert len(plan) == 0, \
            f"Hay {len(plan)} migraciones pendientes por aplicar"
