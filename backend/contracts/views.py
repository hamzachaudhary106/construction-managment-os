from rest_framework import generics
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from audit.log import log
from .models import Contract, ContractPaymentSchedule
from .serializers import (
    ContractSerializer,
    ContractPaymentScheduleDetailSerializer,
)


class ContractListCreateView(generics.ListCreateAPIView):
    serializer_class = ContractSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ('project', 'status')
    search_fields = ('title', 'contractor_name')

    def get_queryset(self):
        qs = Contract.objects.select_related('project').prefetch_related('payment_schedules')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        log(self.request.user, 'create_contract', 'Contract', obj.id, {'project_id': obj.project_id}, self.request)


class ContractDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ContractSerializer

    def get_queryset(self):
        qs = Contract.objects.prefetch_related('payment_schedules').select_related('project')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs

    def perform_update(self, serializer):
        obj = serializer.save()
        log(self.request.user, 'update_contract', 'Contract', obj.id, {}, self.request)

    def perform_destroy(self, instance):
        cid = instance.id
        instance.delete()
        log(self.request.user, 'delete_contract', 'Contract', cid, {}, self.request)


class ContractPaymentScheduleListCreateView(generics.ListCreateAPIView):
    serializer_class = ContractPaymentScheduleDetailSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('contract', 'status')

    def get_queryset(self):
        qs = ContractPaymentSchedule.objects.select_related('contract', 'contract__project')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(contract__project__company_id=self.request.user.company_id)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        log(self.request.user, 'create_payment_schedule', 'ContractPaymentSchedule', obj.id, {'contract_id': obj.contract_id}, self.request)


class ContractPaymentScheduleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ContractPaymentScheduleDetailSerializer

    def get_queryset(self):
        qs = ContractPaymentSchedule.objects.select_related('contract', 'contract__project')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(contract__project__company_id=self.request.user.company_id)
        return qs

    def perform_update(self, serializer):
        obj = serializer.save()
        log(self.request.user, 'update_payment_schedule', 'ContractPaymentSchedule', obj.id, {'status': obj.status}, self.request)

    def perform_destroy(self, instance):
        sid = instance.id
        instance.delete()
        log(self.request.user, 'delete_payment_schedule', 'ContractPaymentSchedule', sid, {}, self.request)
