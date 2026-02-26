from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from .models import Variation
from .serializers import VariationSerializer


class VariationListCreateView(generics.ListCreateAPIView):
    serializer_class = VariationSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'contract', 'status')

    def get_queryset(self):
        qs = Variation.objects.select_related('project', 'contract')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs


class VariationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VariationSerializer

    def get_queryset(self):
        qs = Variation.objects.select_related('project', 'contract')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs
