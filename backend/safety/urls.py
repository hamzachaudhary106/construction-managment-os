from django.urls import path
from .views import (
    SafetyIncidentListCreateView, SafetyIncidentDetailView,
    ToolboxTalkListCreateView, ToolboxTalkDetailView,
)

urlpatterns = [
    path('incidents/', SafetyIncidentListCreateView.as_view(), name='safety-incident-list'),
    path('incidents/<int:pk>/', SafetyIncidentDetailView.as_view(), name='safety-incident-detail'),
    path('toolbox-talks/', ToolboxTalkListCreateView.as_view(), name='toolbox-talk-list'),
    path('toolbox-talks/<int:pk>/', ToolboxTalkDetailView.as_view(), name='toolbox-talk-detail'),
]
