from django.urls import path
from .views import SubmittalListCreateView, SubmittalDetailView

urlpatterns = [
    path('', SubmittalListCreateView.as_view(), name='submittal-list'),
    path('<int:pk>/', SubmittalDetailView.as_view(), name='submittal-detail'),
]
