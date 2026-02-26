from rest_framework import generics
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from projects.models import Project
from .models import Budget, Expense, Income
from .serializers import BudgetSerializer, ExpenseSerializer, IncomeSerializer


def _finances_company_filter(request, qs):
    if getattr(request.user, 'company_id', None):
        return qs.filter(project__company_id=request.user.company_id)
    return qs


def _assert_project_belongs_to_user_company(request, project):
    """
    Ensure the given project belongs to the current user's company (when set).
    Prevents cross-company finance records from being created or updated.
    """
    company_id = getattr(request.user, 'company_id', None)
    if not company_id or getattr(request.user, 'is_superuser', False):
        return
    if project is None or project.company_id != company_id:
        raise ValidationError({'project': 'Project does not belong to your company.'})


class BudgetListCreateView(generics.ListCreateAPIView):
    serializer_class = BudgetSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'category', 'phase')

    def get_queryset(self):
        return _finances_company_filter(
            self.request, Budget.objects.select_related('project', 'phase')
        )

    def perform_create(self, serializer):
        project = serializer.validated_data.get('project')
        _assert_project_belongs_to_user_company(self.request, project)
        serializer.save()


class BudgetDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BudgetSerializer

    def get_queryset(self):
        return _finances_company_filter(
            self.request, Budget.objects.select_related('project', 'phase')
        )

    def perform_update(self, serializer):
        project = serializer.validated_data.get('project', serializer.instance.project)
        _assert_project_belongs_to_user_company(self.request, project)
        serializer.save()


class ExpenseListCreateView(generics.ListCreateAPIView):
    serializer_class = ExpenseSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'category', 'phase', 'purchase_order', 'date')

    def get_queryset(self):
        return _finances_company_filter(
            self.request,
            Expense.objects.select_related('project', 'phase', 'purchase_order'),
        )

    def perform_create(self, serializer):
        project = serializer.validated_data.get('project')
        _assert_project_belongs_to_user_company(self.request, project)
        serializer.save()


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        return _finances_company_filter(self.request, Expense.objects.all())

    def perform_update(self, serializer):
        project = serializer.validated_data.get('project', serializer.instance.project)
        _assert_project_belongs_to_user_company(self.request, project)
        serializer.save()


class IncomeListCreateView(generics.ListCreateAPIView):
    serializer_class = IncomeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'date')

    def get_queryset(self):
        return _finances_company_filter(
            self.request, Income.objects.select_related('project')
        )

    def perform_create(self, serializer):
        project = serializer.validated_data.get('project')
        _assert_project_belongs_to_user_company(self.request, project)
        serializer.save()


class IncomeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = IncomeSerializer

    def get_queryset(self):
        return _finances_company_filter(self.request, Income.objects.all())

    def perform_update(self, serializer):
        project = serializer.validated_data.get('project', serializer.instance.project)
        _assert_project_belongs_to_user_company(self.request, project)
        serializer.save()
