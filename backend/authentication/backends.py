from django.contrib.auth.backends import ModelBackend
from .models import User

class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, email=None, **kwargs):
        try:
            # Intenta obtener el usuario por email o username
            user = User.objects.get(email=email or username)
        except User.DoesNotExist:
            return None
        
        # Verifica la contraseña y que el usuario pueda autenticarse
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
