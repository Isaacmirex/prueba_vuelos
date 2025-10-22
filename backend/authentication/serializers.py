from rest_framework import serializers
from dj_rest_auth.serializers import LoginSerializer
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()  # Campo calculado automáticamente
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 
            'phone', 'date_of_birth', 'age', 
            'country', 'city', 'profile_image_url',
            'is_operator', 'is_staff', 'is_active', 
            'date_joined', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'age', 'date_joined', 'created_at', 'updated_at']


# Serializador personalizado para login con email
class CustomLoginSerializer(LoginSerializer):
    username = None  # Elimina el campo username
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(request=self.context.get('request'), email=email, password=password)
            if not user:
                raise serializers.ValidationError('Credenciales inválidas.')
        else:
            raise serializers.ValidationError('Debe incluir "email" y "password".')

        attrs['user'] = user
        return attrs
