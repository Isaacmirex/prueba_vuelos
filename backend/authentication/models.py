from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=15, blank=True)
    is_operator = models.BooleanField(default=False)
    date_of_birth = models.DateField(null=True, blank=True, verbose_name='Date of Birth', db_column='date_of_birday')  # <-- Corregido
    country = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    profile_image_url = models.URLField(max_length=500, blank=True, null=True, verbose_name='Profile Image URL')
    created_at = models.DateTimeField(auto_now_add=True)  # Se llena automáticamente al crear
    updated_at = models.DateTimeField(auto_now=True)      # Se actualiza automáticamente

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        db_table = 'auth_user'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"
    
    @property
    def age(self):
        """Calcula la edad automáticamente desde date_of_birth"""
        if self.date_of_birth:
            from datetime import date
            today = date.today()
            return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
        return None
