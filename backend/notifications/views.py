from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification, NotificationSettings
from .serializers import NotificationSerializer, NotificationSettingsSerializer
from .utils import send_notification_whatsapp


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = NotificationSerializer
    http_method_names = ['get', 'patch', 'put']

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationSettingsView(generics.GenericAPIView):
    """Current user's notification settings (email/WhatsApp by type)."""
    serializer_class = NotificationSettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj, _ = NotificationSettings.objects.get_or_create(user=self.request.user)
        return obj

    def get(self, request):
        obj = self.get_object()
        serializer = self.get_serializer(obj)
        return Response(serializer.data)

    def put(self, request):
        obj = self.get_object()
        serializer = self.get_serializer(obj, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class NotificationResendView(APIView):
    """Resend an existing notification to the current user via WhatsApp."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            n = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # Map notification types to WhatsApp channels used in settings
        type_to_channel = {
            Notification.NotificationType.BILL_DUE: "bills",
            Notification.NotificationType.BILL_OVERDUE: "bills",
            Notification.NotificationType.CONTRACT_PAYMENT: "contracts",
            Notification.NotificationType.PROJECT_MILESTONE: "milestones",
            Notification.NotificationType.FUND_TRANSFER: "transfers",
        }
        channel = type_to_channel.get(n.notification_type, None)

        sent = send_notification_whatsapp(request.user, n.title, n.message, n.link, channel=channel)
        return Response({"sent": sent})
