from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from .models import PurchaseOrder
from .serializers import PurchaseOrderSerializer


class PurchaseOrderListCreateView(generics.ListCreateAPIView):
    serializer_class = PurchaseOrderSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'supplier', 'status')

    def get_queryset(self):
        qs = PurchaseOrder.objects.select_related('project', 'supplier').prefetch_related('items')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs


class PurchaseOrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PurchaseOrderSerializer

    def get_queryset(self):
        qs = PurchaseOrder.objects.select_related('project', 'supplier').prefetch_related('items')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs
