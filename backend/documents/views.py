from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from .models import ProjectDocument
from .serializers import ProjectDocumentSerializer


class ProjectDocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectDocumentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'doc_type')

    def get_queryset(self):
        qs = ProjectDocument.objects.select_related('project')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs


class ProjectDocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectDocumentSerializer

    def get_queryset(self):
        qs = ProjectDocument.objects.select_related('project')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs
