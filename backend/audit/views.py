from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from core.models import User
from .models import AuditLog
from .serializers import AuditLogSerializer


def is_audit_admin(user):
    return user.is_authenticated and (user.is_superuser or getattr(user, 'role', None) == User.Role.ADMIN)


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('action', 'model_name', 'user')

    def get_queryset(self):
        if not is_audit_admin(self.request.user):
            return AuditLog.objects.none()
        qs = AuditLog.objects.select_related('user')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(user__company_id=self.request.user.company_id)
        return qs
