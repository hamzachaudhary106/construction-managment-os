from django.urls import path
from .views import (
    EstimateListCreateView,
    EstimateDetailView,
    EstimateItemListCreateView,
    EstimateItemDetailView,
    PakistanEstimateConstantsView,
    QuickCalcRatesView,
    QuickCalcCalculateView,
)

urlpatterns = [
    path('', EstimateListCreateView.as_view(), name='estimate-list'),
    path('constants/', PakistanEstimateConstantsView.as_view(), name='estimate-constants'),
    path('quick-calc-rates/', QuickCalcRatesView.as_view(), name='quick-calc-rates'),
    path('quick-calc/', QuickCalcCalculateView.as_view(), name='quick-calc-calculate'),
    path('<int:pk>/', EstimateDetailView.as_view(), name='estimate-detail'),
    path('<int:estimate_id>/items/', EstimateItemListCreateView.as_view(), name='estimate-item-list'),
    path('<int:estimate_id>/items/<int:pk>/', EstimateItemDetailView.as_view(), name='estimate-item-detail'),
]
