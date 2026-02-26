from django.urls import path
from .views import RFIListCreateView, RFIDetailView

urlpatterns = [
    path('', RFIListCreateView.as_view(), name='rfi-list'),
    path('<int:pk>/', RFIDetailView.as_view(), name='rfi-detail'),
]
