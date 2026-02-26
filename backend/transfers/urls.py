from django.urls import path
from .views import FundTransferListCreateView, FundTransferDetailView

urlpatterns = [
    path('', FundTransferListCreateView.as_view(), name='transfer-list'),
    path('<int:pk>/', FundTransferDetailView.as_view(), name='transfer-detail'),
]
