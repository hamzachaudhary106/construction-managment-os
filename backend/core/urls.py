from django.urls import path
from .views import (
    JWTLoginView,
    CookieTokenRefreshView,
    LogoutView,
    MeView,
    UserListCreateView,
    UserDetailView,
    GlobalSearchView,
    CompanyListView,
    CompanyDetailView,
    ClientListCreateView,
    ClientDetailView,
)

urlpatterns = [
    path('token/', JWTLoginView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('search/', GlobalSearchView.as_view(), name='global-search'),
    path('companies/', CompanyListView.as_view(), name='company-list'),
    path('companies/<int:pk>/', CompanyDetailView.as_view(), name='company-detail'),
    path('clients/', ClientListCreateView.as_view(), name='client-list'),
    path('clients/<int:pk>/', ClientDetailView.as_view(), name='client-detail'),
    path('users/', UserListCreateView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
]
