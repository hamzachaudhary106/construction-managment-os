from django.db import models
from core.models import Company
from projects.models import Project


class Equipment(models.Model):
    class OwnerType(models.TextChoices):
        OWNED = 'owned', 'Owned'
        HIRED = 'hired', 'Hired'

    name = models.CharField(max_length=200)
    equipment_type = models.CharField(max_length=100, blank=True)
    owner_type = models.CharField(max_length=20, choices=OwnerType.choices, default=OwnerType.OWNED)
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, null=True, blank=True, related_name='equipment'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_owner_type_display()})"


class EquipmentAllocation(models.Model):
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='allocations')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='equipment_allocations')
    from_date = models.DateField()
    to_date = models.DateField(null=True, blank=True)
    rate_per_day = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-from_date']

    def __str__(self):
        return f"{self.equipment.name} - {self.project.name}"


class EquipmentMaintenance(models.Model):
    """Maintenance records for equipment."""
    class MaintenanceType(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        REPAIR = 'repair', 'Repair'
        INSPECTION = 'inspection', 'Inspection'
        OTHER = 'other', 'Other'

    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='maintenance_records')
    maintenance_date = models.DateField()
    maintenance_type = models.CharField(max_length=20, choices=MaintenanceType.choices, default=MaintenanceType.SCHEDULED)
    description = models.TextField(blank=True)
    cost = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    next_due_date = models.DateField(null=True, blank=True)
    performed_by = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-maintenance_date']

    def __str__(self):
        return f"{self.equipment.name} - {self.maintenance_date}"
