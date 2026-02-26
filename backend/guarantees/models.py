from django.db import models
from projects.models import Project


class BankGuarantee(models.Model):
    class GuaranteeType(models.TextChoices):
        PERFORMANCE = 'performance', 'Performance'
        ADVANCE = 'advance', 'Advance'
        RETENTION = 'retention', 'Retention'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='bank_guarantees')
    guarantee_type = models.CharField(max_length=20, choices=GuaranteeType.choices)
    bank_name = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    validity_from = models.DateField()
    validity_to = models.DateField()
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-validity_to']

    def __str__(self):
        return f"{self.project.name} - {self.get_guarantee_type_display()} - {self.bank_name}"
