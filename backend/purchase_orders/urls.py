from django.urls import path
from .views import PurchaseOrderListCreateView, PurchaseOrderDetailView

urlpatterns = [
    path('', PurchaseOrderListCreateView.as_view(), name='po-list'),
    path('<int:pk>/', PurchaseOrderDetailView.as_view(), name='po-detail'),
]
