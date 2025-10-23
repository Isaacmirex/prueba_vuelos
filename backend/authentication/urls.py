from django.urls import path
from .views import UserListView, UserDetailView, CurrentUserView


urlpatterns = [
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('users/me/', CurrentUserView.as_view(), name='user-me'),
]
