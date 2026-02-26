from django.urls import path
from .views import (
    BillListCreateView,
    BillDetailView,
    BillsBulkMarkPaidView,
    BillPDFView,
    BillSendPDFWhatsAppView,
    BillSendWhatsAppView,
)

urlpatterns = [
    path('', BillListCreateView.as_view(), name='bill-list'),
    path('bulk-mark-paid/', BillsBulkMarkPaidView.as_view(), name='bills-bulk-mark-paid'),
    path('<int:pk>/pdf/', BillPDFView.as_view(), name='bill-pdf'),
    path('<int:pk>/send-pdf-whatsapp/', BillSendPDFWhatsAppView.as_view(), name='bill-send-pdf-whatsapp'),
    path('<int:pk>/send-whatsapp/', BillSendWhatsAppView.as_view(), name='bill-send-whatsapp'),
    path('<int:pk>/', BillDetailView.as_view(), name='bill-detail'),
]
