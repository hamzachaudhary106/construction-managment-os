from django.db import models
from projects.models import Project
from parties.models import Party


class Contract(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='contracts')
    title = models.CharField(max_length=200)
    contractor_name = models.CharField(max_length=200)
    total_value = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default='PKR')
    amount_in_pkr = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, help_text='Converted value in PKR if currency is not PKR')
    party = models.ForeignKey(Party, on_delete=models.SET_NULL, null=True, blank=True, related_name='contracts')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'),
            ('active', 'Active'),
            ('completed', 'Completed'),
            ('terminated', 'Terminated'),
        ],
        default='draft',
    )
    notes = models.TextField(blank=True)
    retention_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text='e.g. 5 for 5%')
    retention_release_days = models.PositiveIntegerField(null=True, blank=True, help_text='Days after completion to release retention')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.project.name}"


class ContractPaymentSchedule(models.Model):
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='payment_schedules')
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    due_date = models.DateField()
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
    retention_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    retention_release_date = models.DateField(null=True, blank=True)
    wht_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    wht_certificate_number = models.CharField(max_length=100, blank=True)
    wht_tax_period = models.CharField(max_length=20, blank=True, help_text='e.g. 2024-01 for Jan 2024')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['due_date']

    def __str__(self):
        return f"{self.contract.title} - {self.description}: {self.amount}"
