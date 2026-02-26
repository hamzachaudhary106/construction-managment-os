from django.db import models
from projects.models import Project


class ProjectDocument(models.Model):
    class DocType(models.TextChoices):
        DRAWING = 'drawing', 'Drawing'
        BOQ = 'boq', 'BOQ'
        VARIATION = 'variation', 'Variation'
        NOC = 'noc', 'NOC'
        CONTRACT = 'contract', 'Contract'
        OTHER = 'other', 'Other'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=255)
    doc_type = models.CharField(max_length=20, choices=DocType.choices, default=DocType.OTHER)
    revision = models.CharField(max_length=50, blank=True, help_text='e.g. Rev A, 1.0')
    file = models.FileField(upload_to='project_docs/%Y/%m/', blank=True, null=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.project.name} - {self.title}"
