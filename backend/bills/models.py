from django.db import models
from django.conf import settings
from projects.models import Project


class Bill(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='bills')
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    billed_to_name = models.CharField(max_length=255, blank=True)
    billed_to_phone = models.CharField(max_length=50, blank=True, help_text='WhatsApp number for billed party')
    wht_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, default=0)
    wht_certificate_number = models.CharField(max_length=100, blank=True)
    wht_tax_period = models.CharField(max_length=20, blank=True, help_text='e.g. 2024-01 for Jan 2024')
    due_date = models.DateField()
    expected_payment_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('paid', 'Paid'),
            ('overdue', 'Overdue'),
        ],
        default='pending',
    )
    paid_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_bills'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-due_date', '-created_at']

    def __str__(self):
        return f"{self.description} - {self.amount} ({self.status})"
