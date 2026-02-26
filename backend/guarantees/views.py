from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from .models import BankGuarantee
from .serializers import BankGuaranteeSerializer


class BankGuaranteeListCreateView(generics.ListCreateAPIView):
    serializer_class = BankGuaranteeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'guarantee_type')

    def get_queryset(self):
        qs = BankGuarantee.objects.select_related('project')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs


class BankGuaranteeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BankGuaranteeSerializer

    def get_queryset(self):
        qs = BankGuarantee.objects.select_related('project')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs
