from django.db import models
from django.conf import settings
from core.models import Company


class Project(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('on_hold', 'On Hold'),
            ('completed', 'Completed'),
        ],
        default='active',
    )
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True, related_name='projects')
    client = models.ForeignKey(
        'core.Client', on_delete=models.SET_NULL, null=True, blank=True, related_name='projects',
        help_text='Client/owner for this project (for client portal)'
    )
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_projects',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_projects',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class ProjectPhase(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='phases')
    name = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['project', 'order', 'name']

    def __str__(self):
        return f"{self.project.name} - {self.name}"


class ProjectMilestone(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='milestones')
    title = models.CharField(max_length=200)
    due_date = models.DateField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    completed_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['due_date', 'created_at']

    def __str__(self):
        return f"{self.project.name} - {self.title}"


class ProjectPhoto(models.Model):
    """Progress photos for visual project history."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='progress_photos')
    phase = models.ForeignKey(
        'ProjectPhase', on_delete=models.SET_NULL, null=True, blank=True, related_name='progress_photos'
    )
    image = models.ImageField(upload_to='progress_photos/%Y/%m/')
    caption = models.CharField(max_length=255, blank=True)
    photo_date = models.DateField()
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='progress_photos_uploaded'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-photo_date', '-created_at']

    def __str__(self):
        return f"{self.project.name} - {self.photo_date}"
