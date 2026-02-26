from django.urls import path
from .views import (
    ProjectListCreateView,
    ProjectDetailView,
    ProjectPhaseListCreateView,
    ProjectPhaseDetailView,
    ProjectMilestoneListCreateView,
    ProjectMilestoneDetailView,
    ProjectPhotoListCreateView,
    ProjectPhotoDetailView,
)

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project-list'),
    path('<int:pk>/', ProjectDetailView.as_view(), name='project-detail'),
    path('phases/', ProjectPhaseListCreateView.as_view(), name='phase-list'),
    path('phases/<int:pk>/', ProjectPhaseDetailView.as_view(), name='phase-detail'),
    path('milestones/', ProjectMilestoneListCreateView.as_view(), name='milestone-list'),
    path('milestones/<int:pk>/', ProjectMilestoneDetailView.as_view(), name='milestone-detail'),
    path('progress-photos/', ProjectPhotoListCreateView.as_view(), name='progress-photo-list'),
    path('progress-photos/<int:pk>/', ProjectPhotoDetailView.as_view(), name='progress-photo-detail'),
]
