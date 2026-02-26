from django.urls import path
from .views import (
    ContractListCreateView,
    ContractDetailView,
    ContractPaymentScheduleListCreateView,
    ContractPaymentScheduleDetailView,
)

urlpatterns = [
    path('', ContractListCreateView.as_view(), name='contract-list'),
    path('<int:pk>/', ContractDetailView.as_view(), name='contract-detail'),
    path('payment-schedules/', ContractPaymentScheduleListCreateView.as_view(), name='payment-schedule-list'),
    path('payment-schedules/<int:pk>/', ContractPaymentScheduleDetailView.as_view(), name='payment-schedule-detail'),
]
