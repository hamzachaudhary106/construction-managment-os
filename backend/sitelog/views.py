from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from .models import DailyLog, Issue, PunchItem
from .serializers import DailyLogSerializer, IssueSerializer, PunchItemSerializer


def _sitelog_company_qs(request, model, select_related=None):
    qs = model.objects.all()
    if select_related:
        qs = qs.select_related(*select_related)
    if getattr(request.user, 'client_id', None):
        qs = qs.filter(project__client_id=request.user.client_id)
    elif getattr(request.user, 'company_id', None):
        qs = qs.filter(project__company_id=request.user.company_id)
    return qs


class DailyLogListCreateView(generics.ListCreateAPIView):
    serializer_class = DailyLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'log_date')

    def get_queryset(self):
        return _sitelog_company_qs(
            self.request, DailyLog, select_related=('project', 'created_by')
        )


class DailyLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DailyLogSerializer

    def get_queryset(self):
        return _sitelog_company_qs(self.request, DailyLog)


class IssueListCreateView(generics.ListCreateAPIView):
    serializer_class = IssueSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'status', 'severity', 'is_ncr')

    def get_queryset(self):
        return _sitelog_company_qs(
            self.request, Issue, select_related=('project', 'created_by')
        )


class IssueDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = IssueSerializer

    def get_queryset(self):
        return _sitelog_company_qs(self.request, Issue)


class PunchItemListCreateView(generics.ListCreateAPIView):
    serializer_class = PunchItemSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'status')

    def get_queryset(self):
        return _sitelog_company_qs(
            self.request, PunchItem, select_related=('project', 'assigned_to', 'created_by')
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PunchItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PunchItemSerializer

    def get_queryset(self):
        return _sitelog_company_qs(
            self.request, PunchItem, select_related=('project', 'assigned_to', 'created_by')
        )
