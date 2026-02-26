from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from .models import Submittal
from .serializers import SubmittalSerializer


def _submittal_queryset(request):
    qs = Submittal.objects.select_related('project', 'created_by')
    if getattr(request.user, 'client_id', None):
        qs = qs.filter(project__client_id=request.user.client_id)
    elif getattr(request.user, 'company_id', None):
        qs = qs.filter(project__company_id=request.user.company_id)
    return qs


class SubmittalListCreateView(generics.ListCreateAPIView):
    serializer_class = SubmittalSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'status', 'submittal_type')

    def get_queryset(self):
        return _submittal_queryset(self.request)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SubmittalDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SubmittalSerializer

    def get_queryset(self):
        return _submittal_queryset(self.request)
