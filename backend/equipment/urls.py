from django.urls import path
from .views import (
    EquipmentListCreateView, EquipmentDetailView,
    EquipmentAllocationListCreateView, EquipmentAllocationDetailView,
    EquipmentMaintenanceListCreateView, EquipmentMaintenanceDetailView,
)

urlpatterns = [
    path('', EquipmentListCreateView.as_view(), name='equipment-list'),
    path('<int:pk>/', EquipmentDetailView.as_view(), name='equipment-detail'),
    path('allocations/', EquipmentAllocationListCreateView.as_view(), name='allocation-list'),
    path('allocations/<int:pk>/', EquipmentAllocationDetailView.as_view(), name='allocation-detail'),
    path('maintenance/', EquipmentMaintenanceListCreateView.as_view(), name='maintenance-list'),
    path('maintenance/<int:pk>/', EquipmentMaintenanceDetailView.as_view(), name='maintenance-detail'),
]
