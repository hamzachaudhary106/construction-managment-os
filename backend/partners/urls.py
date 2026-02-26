from django.urls import path
from .views import (
    PartnerListCreateView,
    PartnerDetailView,
    ProjectInvestmentListCreateView,
    ProjectInvestmentDetailView,
    PartnerWithdrawalListCreateView,
    PartnerWithdrawalDetailView,
    ProjectInvestmentReceiptPDFView,
    ProjectInvestmentSendReceiptWhatsAppView,
    PartnerWithdrawalReceiptPDFView,
    PartnerWithdrawalSendReceiptWhatsAppView,
)

urlpatterns = [
    path('', PartnerListCreateView.as_view(), name='partner-list'),
    path('<int:pk>/', PartnerDetailView.as_view(), name='partner-detail'),
    path('investments/', ProjectInvestmentListCreateView.as_view(), name='investment-list'),
    path('investments/<int:pk>/receipt-pdf/', ProjectInvestmentReceiptPDFView.as_view(), name='investment-receipt-pdf'),
    path('investments/<int:pk>/send-receipt-whatsapp/', ProjectInvestmentSendReceiptWhatsAppView.as_view(), name='investment-send-receipt-whatsapp'),
    path('investments/<int:pk>/', ProjectInvestmentDetailView.as_view(), name='investment-detail'),
    path('withdrawals/', PartnerWithdrawalListCreateView.as_view(), name='withdrawal-list'),
    path('withdrawals/<int:pk>/receipt-pdf/', PartnerWithdrawalReceiptPDFView.as_view(), name='withdrawal-receipt-pdf'),
    path('withdrawals/<int:pk>/send-receipt-whatsapp/', PartnerWithdrawalSendReceiptWhatsAppView.as_view(), name='withdrawal-send-receipt-whatsapp'),
    path('withdrawals/<int:pk>/', PartnerWithdrawalDetailView.as_view(), name='withdrawal-detail'),
]
