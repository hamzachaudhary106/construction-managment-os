from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from audit.log import log
from notifications.models import Notification
from notifications.utils import send_notification_whatsapp
from .models import FundTransfer
from .serializers import FundTransferSerializer


class FundTransferListCreateView(generics.ListCreateAPIView):
    serializer_class = FundTransferSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('from_project', 'to_project')

    def get_queryset(self):
        qs = FundTransfer.objects.select_related('from_project', 'to_project')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(from_project__company_id=self.request.user.company_id)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        log(
            self.request.user,
            'fund_transfer',
            'FundTransfer',
            obj.id,
            {'amount': str(obj.amount), 'from_project': obj.from_project_id, 'to_project': obj.to_project_id, 'date': str(obj.transfer_date)},
            self.request,
        )
        n = Notification.objects.create(
            user=self.request.user,
            notification_type=Notification.NotificationType.FUND_TRANSFER,
            title='Fund transfer completed',
            message=f'Transferred Rs {obj.amount} from {obj.from_project.name} to {obj.to_project.name}.',
            link='/transfers',
        )
        send_notification_whatsapp(self.request.user, n.title, n.message, n.link, channel='transfers')


class FundTransferDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FundTransferSerializer

    def get_queryset(self):
        qs = FundTransfer.objects.select_related('from_project', 'to_project')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(from_project__company_id=self.request.user.company_id)
        return qs

    def perform_update(self, serializer):
        obj = serializer.save()
        log(self.request.user, 'update_transfer', 'FundTransfer', obj.id, {}, self.request)

    def perform_destroy(self, instance):
        tid = instance.id
        instance.delete()
        log(self.request.user, 'delete_transfer', 'FundTransfer', tid, {}, self.request)
