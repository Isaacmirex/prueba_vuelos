from django.db import models

class Destination(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)
    province = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)  # Se llena automáticamente al crear
    updated_at = models.DateTimeField(auto_now=True)      # Se actualiza automáticamente

    class Meta:
        db_table = 'destinations'  # Usa la tabla existente

    def __str__(self):
        return f"{self.name} ({self.code})"
