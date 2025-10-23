from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import User
from .serializers import UserSerializer
from notifications.tasks import send_welcome_email # ¡Importamos la tarea de Celery!


class UserListView(generics.ListCreateAPIView):
    """
    GET: Lista todos los usuarios
    POST: Crea un nuevo usuario (solo admin), y dispara el correo de bienvenida.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_operator', 'is_staff', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'created_at', 'email']
    ordering = ['-created_at']


    def get_permissions(self):
        """Solo admin puede crear usuarios"""
        if self.request.method == 'POST':
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        """
        Guarda el objeto User y, inmediatamente después, encola la tarea
        para enviar el correo de bienvenida.
        """
        # 1. Guarda el usuario en la base de datos (retorna el objeto User)
        user = serializer.save() 
        
        # 2. DISPARAR LA TAREA DE CELERY
        # Esto encola el envío del correo de bienvenida de forma asíncrona.
        send_welcome_email.delay(user.id) 
        
        # El código 201 Created se retorna automáticamente.


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Ver detalle de usuario
    PUT/PATCH: Actualizar usuario (solo admin)
    DELETE: Eliminar usuario (solo admin)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


    def get_permissions(self):
        """Solo admin puede actualizar o eliminar"""
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]


class CurrentUserView(APIView):
    """
    GET: Ver perfil del usuario actual
    """
    permission_classes = [permissions.IsAuthenticated]


    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)