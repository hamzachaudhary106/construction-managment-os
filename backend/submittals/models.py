from django.db import models
from django.conf import settings
from projects.models import Project


class Submittal(models.Model):
    """Submittal (material sample, method statement, etc.) for approval."""
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SUBMITTED = 'submitted', 'Submitted'
        UNDER_REVIEW = 'under_review', 'Under Review'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        REVISION = 'revision', 'Revision Required'

    class SubmittalType(models.TextChoices):
        MATERIAL = 'material', 'Material Sample'
        METHOD = 'method', 'Method Statement'
        SHOP_DRAWING = 'shop_drawing', 'Shop Drawing'
        OTHER = 'other', 'Other'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='submittals')
    submittal_number = models.CharField(max_length=50, blank=True)
    title = models.CharField(max_length=255)
    submittal_type = models.CharField(max_length=20, choices=SubmittalType.choices, default=SubmittalType.OTHER)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    submitted_date = models.DateField(null=True, blank=True)
    approved_date = models.DateField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='submittals_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.submittal_number or self.id} - {self.title}"
