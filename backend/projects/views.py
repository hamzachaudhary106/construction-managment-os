from rest_framework import generics
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from audit.log import log
from notifications.models import Notification
from notifications.utils import send_notification_whatsapp
from .models import Project, ProjectPhase, ProjectMilestone, ProjectPhoto
from .serializers import (
    ProjectSerializer,
    ProjectPhaseSerializer,
    ProjectMilestoneSerializer,
    ProjectPhotoSerializer,
)


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ('status',)
    search_fields = ('name', 'description')

    def get_queryset(self):
        qs = Project.objects.filter(is_deleted=False).select_related('company', 'client')
        cid = getattr(self.request.user, 'company_id', None)
        client_id = getattr(self.request.user, 'client_id', None)
        if client_id:
            qs = qs.filter(client_id=client_id)
        elif cid is not None:
            qs = qs.filter(company_id=cid)
        return qs

    def perform_create(self, serializer):
        cid = getattr(self.request.user, 'company_id', None)
        if cid is not None:
            serializer.save(created_by=self.request.user, company_id=cid)
        else:
            serializer.save(created_by=self.request.user)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        qs = Project.objects.filter(is_deleted=False).select_related('company', 'client')
        client_id = getattr(self.request.user, 'client_id', None)
        if client_id:
            qs = qs.filter(client_id=client_id)
        elif getattr(self.request.user, 'company_id', None):
            qs = qs.filter(company_id=self.request.user.company_id)
        return qs

    def perform_update(self, serializer):
        obj = serializer.save()
        log(self.request.user, 'update_project', 'Project', obj.id, {}, self.request)

    def perform_destroy(self, instance):
        from django.utils import timezone
        pid = instance.id
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save()
        log(self.request.user, 'delete_project', 'Project', pid, {}, self.request)


class ProjectPhaseListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectPhaseSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project',)

    def get_queryset(self):
        qs = ProjectPhase.objects.select_related('project')
        if getattr(self.request.user, 'client_id', None):
            qs = qs.filter(project__client_id=self.request.user.client_id)
        elif getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs


class ProjectPhaseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectPhaseSerializer

    def get_queryset(self):
        qs = ProjectPhase.objects.select_related('project')
        if getattr(self.request.user, 'client_id', None):
            qs = qs.filter(project__client_id=self.request.user.client_id)
        elif getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs


class ProjectMilestoneListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectMilestoneSerializer
    filterset_fields = ('project', 'completed')

    def get_queryset(self):
        qs = ProjectMilestone.objects.select_related('project')
        if getattr(self.request.user, 'client_id', None):
            qs = qs.filter(project__client_id=self.request.user.client_id)
        elif getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        log(self.request.user, 'create_milestone', 'ProjectMilestone', obj.id, {'project_id': obj.project_id}, self.request)
        n = Notification.objects.create(
            user=self.request.user,
            notification_type=Notification.NotificationType.PROJECT_MILESTONE,
            title='Milestone added',
            message=f'Milestone "{obj.title}" added to project {obj.project.name}.',
            link=f'/projects/{obj.project_id}/dashboard',
        )
        send_notification_whatsapp(self.request.user, n.title, n.message, n.link, channel='milestones')


class ProjectMilestoneDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectMilestoneSerializer

    def get_queryset(self):
        qs = ProjectMilestone.objects.select_related('project')
        if getattr(self.request.user, 'client_id', None):
            qs = qs.filter(project__client_id=self.request.user.client_id)
        elif getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs

    def perform_update(self, serializer):
        obj = serializer.save()
        if obj.completed:
            log(self.request.user, 'complete_milestone', 'ProjectMilestone', obj.id, {}, self.request)
            n = Notification.objects.create(
                user=self.request.user,
                notification_type=Notification.NotificationType.PROJECT_MILESTONE,
                title='Milestone completed',
                message=f'Milestone "{obj.title}" completed for project {obj.project.name}.',
                link=f'/projects/{obj.project_id}/dashboard',
            )
            send_notification_whatsapp(self.request.user, n.title, n.message, n.link, channel='milestones')

    def perform_destroy(self, instance):
        mid = instance.id
        instance.delete()
        log(self.request.user, 'delete_milestone', 'ProjectMilestone', mid, {}, self.request)


class ProjectPhotoListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectPhotoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'phase')

    def get_queryset(self):
        qs = ProjectPhoto.objects.select_related('project', 'phase', 'uploaded_by')
        if getattr(self.request.user, 'client_id', None):
            qs = qs.filter(project__client_id=self.request.user.client_id)
        elif getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class ProjectPhotoDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectPhotoSerializer

    def get_queryset(self):
        qs = ProjectPhoto.objects.select_related('project', 'phase', 'uploaded_by')
        if getattr(self.request.user, 'client_id', None):
            qs = qs.filter(project__client_id=self.request.user.client_id)
        elif getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs
