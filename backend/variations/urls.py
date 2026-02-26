from django.urls import path
from .views import VariationListCreateView, VariationDetailView

urlpatterns = [
    path('', VariationListCreateView.as_view(), name='variation-list'),
    path('<int:pk>/', VariationDetailView.as_view(), name='variation-detail'),
]
