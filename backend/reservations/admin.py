from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from django.utils import timezone

from .models import Reservation, ReservationStatus

User = get_user_model()


class ReservationModelTest(TestCase):
    def setUp(self):
        self.user = User
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
def test_create_reservation(self):
        reservation = Reservation.objects.create(
            reservation_code='RES-TEST01',
            user=self.user,
            flight_id=1,
            reservation_date=timezone.now(),
            total_passengers=2,
            total_amount=Decimal('250.00'),
            status=ReservationStatus.PENDING
        )
        self.assertEqual(reservation.user, self.user)
        self.assertEqual(reservation.total_passengers, 2)
        self.assertEqual(reservation.status, ReservationStatus.PENDING)
def test_reservation_str(self):
        reservation = Reservation.objects.create(
            reservation_code='RES-TEST02',
            user=self.user,
            flight_id=1,
            reservation_date=timezone.now(),
            total_passengers=1,
            total_amount=Decimal('150.00')
        )
        self.assertIn('RES-TEST02', str(reservation))
        self.assertIn(self.user.username, str(reservation))


class ReservationAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

    def test_create_reservation(self):
        data = {
            'flight': 1,
            'reservation_date': timezone.now().isoformat(),
            'total_passengers': 2,
            'total_amount': '300.00'
        }
        response = self.client.post('/api/reservations/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('reservation_code', response.data)

    def test_list_reservations(self):
        Reservation.objects.create(
            reservation_code='RES-001',
            user=self.user,
            flight_id=1,
            reservation_date=timezone.now(),
            total_passengers=2,
            total_amount=Decimal('250.00')
        )
        response = self.client.get('/api/reservations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cancel_reservation(self):
        reservation = Reservation.objects.create(
            reservation_code='RES-002',
            user=self.user,
            flight_id=1,
            reservation_date=timezone.now(),
            total_passengers=2,
            total_amount=Decimal('250.00'),
            status=ReservationStatus.PENDING
        )
        response = self.client.post(f'/api/reservations/{reservation.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, ReservationStatus.CANCELLED)

    def test_confirm_reservation(self):
        reservation = Reservation.objects.create(
            reservation_code='RES-003',
            user=self.user,
            flight_id=1,
            reservation_date=timezone.now(),
            total_passengers=2,
            total_amount=Decimal('250.00'),
            status=ReservationStatus.PENDING
        )
        response = self.client.post(f'/api/reservations/{reservation.id}/confirm/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, ReservationStatus.CONFIRMED)

    def test_my_reservations(self):
        Reservation.objects.create(
            reservation_code='RES-004',
            user=self.user,
            flight_id=1,
            reservation_date=timezone.now(),
            total_passengers=1,
            total_amount=Decimal('150.00')
        )
        response = self.client.get('/api/reservations/my-reservations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)