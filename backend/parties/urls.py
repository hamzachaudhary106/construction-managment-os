from django.urls import path
from .views import PartyListCreateView, PartyDetailView

urlpatterns = [
    path('', PartyListCreateView.as_view(), name='party-list'),
    path('<int:pk>/', PartyDetailView.as_view(), name='party-detail'),
]
