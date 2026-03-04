from django.urls import path
from .views import (
    NotificationListView,
    NotificationDetailView,
    NotificationSettingsView,
    NotificationResendView,
    WhatsAppLogListView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('<int:pk>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('<int:pk>/resend/', NotificationResendView.as_view(), name='notification-resend'),
    path('settings/', NotificationSettingsView.as_view(), name='notification-settings'),
    path('whatsapp-log/', WhatsAppLogListView.as_view(), name='whatsapp-log'),
]
