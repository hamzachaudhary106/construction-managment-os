from django.db import models
from core.models import Company
from projects.models import Project


class Material(models.Model):
    """Material catalog (company-wide)."""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='materials')
    name = models.CharField(max_length=200)
    unit = models.CharField(max_length=20, default='Nos')
    category = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.unit})"


class ProjectMaterial(models.Model):
    """Material usage and tracking per project."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='project_materials')
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='project_usages')
    quantity_required = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    quantity_used = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    reorder_level = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['material__name']
        unique_together = ['project', 'material']

    def __str__(self):
        return f"{self.project.name} - {self.material.name}"
