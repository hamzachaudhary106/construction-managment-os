from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from .models import Equipment, EquipmentAllocation, EquipmentMaintenance
from .serializers import EquipmentSerializer, EquipmentAllocationSerializer, EquipmentMaintenanceSerializer


class EquipmentListCreateView(generics.ListCreateAPIView):
    serializer_class = EquipmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('owner_type',)

    def get_queryset(self):
        qs = Equipment.objects.all()
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(company_id=self.request.user.company_id)
        return qs

    def perform_create(self, serializer):
        cid = getattr(self.request.user, 'company_id', None)
        if cid is not None and not serializer.validated_data.get('company_id'):
            serializer.save(company_id=cid)
        else:
            serializer.save()


class EquipmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EquipmentSerializer

    def get_queryset(self):
        qs = Equipment.objects.all()
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(company_id=self.request.user.company_id)
        return qs


class EquipmentAllocationListCreateView(generics.ListCreateAPIView):
    serializer_class = EquipmentAllocationSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('equipment', 'project')

    def get_queryset(self):
        qs = EquipmentAllocation.objects.select_related('equipment', 'project')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs


class EquipmentAllocationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EquipmentAllocationSerializer

    def get_queryset(self):
        qs = EquipmentAllocation.objects.select_related('equipment', 'project')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs


class EquipmentMaintenanceListCreateView(generics.ListCreateAPIView):
    serializer_class = EquipmentMaintenanceSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('equipment', 'maintenance_type')

    def get_queryset(self):
        qs = EquipmentMaintenance.objects.select_related('equipment')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(equipment__company_id=self.request.user.company_id)
        return qs


class EquipmentMaintenanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EquipmentMaintenanceSerializer

    def get_queryset(self):
        qs = EquipmentMaintenance.objects.select_related('equipment')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(equipment__company_id=self.request.user.company_id)
        return qs
