from django.urls import path
from .views import (
    DailyLogListCreateView, DailyLogDetailView,
    IssueListCreateView, IssueDetailView,
    PunchItemListCreateView, PunchItemDetailView,
)

urlpatterns = [
    path('daily-logs/', DailyLogListCreateView.as_view(), name='dailylog-list'),
    path('daily-logs/<int:pk>/', DailyLogDetailView.as_view(), name='dailylog-detail'),
    path('issues/', IssueListCreateView.as_view(), name='issue-list'),
    path('issues/<int:pk>/', IssueDetailView.as_view(), name='issue-detail'),
    path('punch-items/', PunchItemListCreateView.as_view(), name='punchitem-list'),
    path('punch-items/<int:pk>/', PunchItemDetailView.as_view(), name='punchitem-detail'),
]
