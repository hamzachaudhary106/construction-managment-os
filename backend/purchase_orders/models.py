from django.db import models
from projects.models import Project
from parties.models import Party


class PurchaseOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        APPROVED = 'approved', 'Approved'
        ORDERED = 'ordered', 'Ordered'
        RECEIVED = 'received', 'Received'
        CANCELLED = 'cancelled', 'Cancelled'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='purchase_orders')
    supplier = models.ForeignKey(Party, on_delete=models.SET_NULL, null=True, related_name='purchase_orders')
    po_number = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    order_date = models.DateField(null=True, blank=True)
    expected_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"PO {self.po_number or self.id} - {self.project.name}"


class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=20, default='Nos')
    rate = models.DecimalField(max_digits=14, decimal_places=2)
    amount = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.purchase_order} - {self.description}"
