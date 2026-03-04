from django.urls import path
from .views import (
    FundTransferListCreateView,
    FundTransferDetailView,
    FundTransferReceiptPDFView,
    FundTransferSendReceiptWhatsAppView,
)

urlpatterns = [
    path('', FundTransferListCreateView.as_view(), name='transfer-list'),
    path('<int:pk>/', FundTransferDetailView.as_view(), name='transfer-detail'),
    path('<int:pk>/receipt-pdf/', FundTransferReceiptPDFView.as_view(), name='transfer-receipt-pdf'),
    path('<int:pk>/send-receipt-whatsapp/', FundTransferSendReceiptWhatsAppView.as_view(), name='transfer-send-receipt-whatsapp'),
]
