from django.db import models
from projects.models import Project, ProjectPhase
from purchase_orders.models import PurchaseOrder

EXPENSE_CATEGORIES = [
    ('materials', 'Materials'),
    ('labor', 'Labor'),
    ('equipment', 'Equipment'),
    ('subcontractors', 'Subcontractors'),
    ('permits', 'Permits'),
    ('other', 'Other'),
]


class Budget(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='budgets')
    phase = models.ForeignKey(ProjectPhase, on_delete=models.SET_NULL, null=True, blank=True, related_name='budgets')
    category = models.CharField(max_length=30, choices=EXPENSE_CATEGORIES)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('project', 'category')
        ordering = ['project', 'category']

    def __str__(self):
        return f"{self.project.name} - {self.get_category_display()}: {self.amount}"


class Expense(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='expenses')
    phase = models.ForeignKey(ProjectPhase, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    category = models.CharField(max_length=30, choices=EXPENSE_CATEGORIES)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    description = models.CharField(max_length=255)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.project.name} - {self.description}: {self.amount}"


class Income(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='incomes')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    description = models.CharField(max_length=255)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.project.name} - {self.description}: {self.amount}"
