from django.urls import path
from .views import (
    MaterialListCreateView, MaterialDetailView,
    ProjectMaterialListCreateView, ProjectMaterialDetailView,
)

urlpatterns = [
    path('', MaterialListCreateView.as_view(), name='material-list'),
    path('<int:pk>/', MaterialDetailView.as_view(), name='material-detail'),
    path('project-materials/', ProjectMaterialListCreateView.as_view(), name='projectmaterial-list'),
    path('project-materials/<int:pk>/', ProjectMaterialDetailView.as_view(), name='projectmaterial-detail'),
]
