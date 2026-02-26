from django.urls import path
from .views import ProjectDocumentListCreateView, ProjectDocumentDetailView

urlpatterns = [
    path('', ProjectDocumentListCreateView.as_view(), name='document-list'),
    path('<int:pk>/', ProjectDocumentDetailView.as_view(), name='document-detail'),
]
