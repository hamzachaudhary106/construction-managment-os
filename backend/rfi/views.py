from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from .models import RFI
from .serializers import RFISerializer


def _rfi_queryset(request):
    qs = RFI.objects.select_related('project', 'created_by')
    if getattr(request.user, 'client_id', None):
        qs = qs.filter(project__client_id=request.user.client_id)
    elif getattr(request.user, 'company_id', None):
        qs = qs.filter(project__company_id=request.user.company_id)
    return qs


class RFIListCreateView(generics.ListCreateAPIView):
    serializer_class = RFISerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'status')

    def get_queryset(self):
        return _rfi_queryset(self.request)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class RFIDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RFISerializer

    def get_queryset(self):
        return _rfi_queryset(self.request)
