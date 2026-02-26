from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from .models import SafetyIncident, ToolboxTalk
from .serializers import SafetyIncidentSerializer, ToolboxTalkSerializer


def _safety_qs(request, model, select_related=None):
    qs = model.objects.all()
    if select_related:
        qs = qs.select_related(*select_related)
    if getattr(request.user, 'client_id', None):
        qs = qs.filter(project__client_id=request.user.client_id)
    elif getattr(request.user, 'company_id', None):
        qs = qs.filter(project__company_id=request.user.company_id)
    return qs


class SafetyIncidentListCreateView(generics.ListCreateAPIView):
    serializer_class = SafetyIncidentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'severity')

    def get_queryset(self):
        return _safety_qs(self.request, SafetyIncident, ('project', 'reported_by'))

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)


class SafetyIncidentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SafetyIncidentSerializer

    def get_queryset(self):
        return _safety_qs(self.request, SafetyIncident, ('project', 'reported_by'))


class ToolboxTalkListCreateView(generics.ListCreateAPIView):
    serializer_class = ToolboxTalkSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project',)

    def get_queryset(self):
        return _safety_qs(self.request, ToolboxTalk, ('project', 'conducted_by'))

    def perform_create(self, serializer):
        serializer.save(conducted_by=self.request.user)


class ToolboxTalkDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ToolboxTalkSerializer

    def get_queryset(self):
        return _safety_qs(self.request, ToolboxTalk, ('project', 'conducted_by'))
