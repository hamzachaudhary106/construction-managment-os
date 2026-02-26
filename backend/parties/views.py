from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from .models import Party
from .serializers import PartySerializer


class PartyListCreateView(generics.ListCreateAPIView):
    serializer_class = PartySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('party_type', 'company')

    def get_queryset(self):
        qs = Party.objects.all()
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(company_id=self.request.user.company_id)
        return qs

    def perform_create(self, serializer):
        cid = getattr(self.request.user, 'company_id', None)
        if cid is not None and not serializer.validated_data.get('company_id'):
            serializer.save(company_id=cid)
        else:
            serializer.save()


class PartyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PartySerializer

    def get_queryset(self):
        qs = Party.objects.all()
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(company_id=self.request.user.company_id)
        return qs
