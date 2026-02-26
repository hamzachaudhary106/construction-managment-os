from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from .models import Material, ProjectMaterial
from .serializers import MaterialSerializer, ProjectMaterialSerializer


def _material_queryset(request):
    qs = Material.objects.all()
    if getattr(request.user, 'company_id', None):
        qs = qs.filter(company_id=request.user.company_id)
    return qs


def _project_material_queryset(request):
    qs = ProjectMaterial.objects.select_related('project', 'material')
    if getattr(request.user, 'client_id', None):
        qs = qs.filter(project__client_id=request.user.client_id)
    elif getattr(request.user, 'company_id', None):
        qs = qs.filter(project__company_id=request.user.company_id)
    return qs


class MaterialListCreateView(generics.ListCreateAPIView):
    serializer_class = MaterialSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('category',)

    def get_queryset(self):
        return _material_queryset(self.request)

    def perform_create(self, serializer):
        cid = getattr(self.request.user, 'company_id', None)
        if cid:
            serializer.save(company_id=cid)
        else:
            serializer.save()


class MaterialDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MaterialSerializer

    def get_queryset(self):
        return _material_queryset(self.request)


class ProjectMaterialListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectMaterialSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'material')

    def get_queryset(self):
        return _project_material_queryset(self.request)


class ProjectMaterialDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectMaterialSerializer

    def get_queryset(self):
        return _project_material_queryset(self.request)
