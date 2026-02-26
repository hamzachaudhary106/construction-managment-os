from django.db import models
from django.conf import settings
from projects.models import Project


class DailyLog(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='daily_logs')
    log_date = models.DateField()
    weather = models.CharField(max_length=100, blank=True)
    manpower_count = models.PositiveIntegerField(null=True, blank=True)
    work_done = models.TextField(blank=True)
    issues_notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='daily_logs_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-log_date', '-created_at']
        unique_together = [['project', 'log_date']]

    def __str__(self):
        return f"{self.project.name} - {self.log_date}"


class Issue(models.Model):
    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        CLOSED = 'closed', 'Closed'

    class Severity(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='issues')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MEDIUM)
    is_ncr = models.BooleanField(default=False, help_text='Non-Conformance Report')
    raised_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='issues_raised'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-raised_at']

    def __str__(self):
        return f"{self.project.name} - {self.title}"


class PunchItem(models.Model):
    """Snag/punch list items for handover."""
    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        RESOLVED = 'resolved', 'Resolved'
        CLOSED = 'closed', 'Closed'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='punch_items')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_punch_items'
    )
    due_date = models.DateField(null=True, blank=True)
    completed_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='punch_items_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.project.name} - {self.title}"
