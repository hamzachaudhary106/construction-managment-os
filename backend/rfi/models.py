from django.db import models
from django.conf import settings
from projects.models import Project


class RFI(models.Model):
    """Request for Information."""
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SUBMITTED = 'submitted', 'Submitted'
        ANSWERED = 'answered', 'Answered'
        CLOSED = 'closed', 'Closed'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='rfis')
    rfi_number = models.CharField(max_length=50, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    submitted_date = models.DateField(null=True, blank=True)
    response_date = models.DateField(null=True, blank=True)
    response_text = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='rfis_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'RFI'
        verbose_name_plural = 'RFIs'

    def __str__(self):
        return f"{self.rfi_number or self.id} - {self.title}"
