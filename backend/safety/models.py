from django.db import models
from django.conf import settings
from projects.models import Project


class SafetyIncident(models.Model):
    class Severity(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='safety_incidents')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    incident_date = models.DateField()
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MEDIUM)
    location = models.CharField(max_length=200, blank=True)
    corrective_action = models.TextField(blank=True)
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='safety_incidents_reported'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-incident_date']

    def __str__(self):
        return f"{self.project.name} - {self.title}"


class ToolboxTalk(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='toolbox_talks')
    topic = models.CharField(max_length=255)
    talk_date = models.DateField()
    attendees_count = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    conducted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='toolbox_talks_conducted'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-talk_date']

    def __str__(self):
        return f"{self.project.name} - {self.topic}"
