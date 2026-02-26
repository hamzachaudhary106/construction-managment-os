from django.urls import path
from .views import BankGuaranteeListCreateView, BankGuaranteeDetailView

urlpatterns = [
    path('', BankGuaranteeListCreateView.as_view(), name='guarantee-list'),
    path('<int:pk>/', BankGuaranteeDetailView.as_view(), name='guarantee-detail'),
]
