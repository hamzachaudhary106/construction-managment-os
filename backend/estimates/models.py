"""
Cost estimation models aligned with Pakistan construction standards.
Currency: PKR. Units and categories follow common practice (PWD/SOR style).
"""
from decimal import Decimal
from django.db import models
from core.models import Company
from projects.models import Project, ProjectPhase


# Pakistan Standard units (PWD/SOR style)
ESTIMATE_UNITS = [
    ('sft', 'Square Feet (sft)'),
    ('sqm', 'Square Metre (sqm)'),
    ('cft', 'Cubic Feet (cft)'),
    ('cum', 'Cubic Metre (cum)'),
    ('rft', 'Running Feet (rft)'),
    ('rm', 'Running Metre (rm)'),
    ('no', 'Number (no.)'),
    ('kg', 'Kilogram (kg)'),
    ('ton', 'Ton'),
    ('marla', 'Marla'),
    ('lump_sum', 'Lump Sum'),
]

# Quick calculator: category (from Pakistan construction rate guide) and mode
CONSTRUCTION_CATEGORIES = [
    ('grey_structure_only', 'Grey Structure Only'),
    ('complete_standard', 'Complete House – Standard Finish'),
    ('complete_mid_range', 'Complete House – Mid-Range Finish'),
    ('complete_premium', 'Complete House – Premium Finish'),
]
CONSTRUCTION_MODES = [
    ('with_material', 'With Materials (Contractor + Materials)'),
    ('without_material', 'Without Materials (Labour Only)'),
]
# For ConstructionRate.construction_type field (same as categories)
CONSTRUCTION_TYPES = CONSTRUCTION_CATEGORIES

# Construction categories commonly used in Pakistan (PWD/SOR style)
ESTIMATE_CATEGORIES = [
    ('earthwork', 'Earthwork'),
    ('concrete', 'Concrete'),
    ('brickwork', 'Brickwork / Blockwork'),
    ('steel', 'Steel / Reinforcement'),
    ('plaster', 'Plaster & Pointing'),
    ('flooring', 'Flooring & Tiling'),
    ('roofing', 'Roofing'),
    ('finishes', 'Finishes & Painting'),
    ('sanitary', 'Sanitary & Plumbing'),
    ('electrical', 'Electrical'),
    ('mep', 'MEP / HVAC'),
    ('other', 'Other'),
]


class ConstructionRate(models.Model):
    """
    Configurable rate (PKR per sft) for the quick calculator. Merchant-specific or system default.
    Enables 100% trustworthy estimates: rates are set by admin/merchant and have an effective date.
    """
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, null=True, blank=True, related_name='construction_rates',
        help_text='Null = system default; set = merchant-specific rate'
    )
    city = models.CharField(max_length=50, help_text='e.g. lahore, karachi')
    construction_type = models.CharField(max_length=30, choices=CONSTRUCTION_CATEGORIES)
    construction_mode = models.CharField(max_length=30, choices=CONSTRUCTION_MODES)
    rate_per_sft = models.DecimalField(max_digits=12, decimal_places=2, help_text='PKR per sq.ft (used for calculation; midpoint if range)')
    rate_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text='Min of range Rs/sft for display')
    rate_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text='Max of range Rs/sft for display')
    effective_date = models.DateField(help_text='Date from which this rate applies')
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['city', 'construction_type', 'construction_mode']
        unique_together = [('company', 'city', 'construction_type', 'construction_mode')]

    def __str__(self):
        return f"{self.city} / {self.get_construction_type_display()} / {self.get_construction_mode_display()}: {self.rate_per_sft} PKR/sft"


class Estimate(models.Model):
    """Standalone cost estimate / scenario (Pakistan standard: PKR). Not linked to projects."""
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SUBMITTED = 'submitted', 'Submitted'
        APPROVED = 'approved', 'Approved'

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, null=True, blank=True, related_name='estimates',
        help_text='Owner company (set for standalone scenarios; legacy estimates may have only project)'
    )
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, null=True, blank=True, related_name='estimates'
    )
    phase = models.ForeignKey(
        ProjectPhase, on_delete=models.SET_NULL, null=True, blank=True, related_name='estimates'
    )
    name = models.CharField(max_length=200, help_text='Scenario name e.g. Main Building BOQ, Option A')
    version = models.CharField(max_length=50, blank=True, help_text='e.g. v1, Rev 2')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    estimate_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    # Pakistan standard: amounts in PKR
    overhead_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        help_text='Overhead % (e.g. 10 for 10%)'
    )
    contingency_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        help_text='Contingency % (e.g. 5 for 5%)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-estimate_date', '-created_at']

    def __str__(self):
        base = self.project.name + " – " if self.project_id else ""
        return f"{base}{self.name}" + (f" ({self.version})" if self.version else "")

    @property
    def subtotal(self):
        return sum((item.amount for item in self.items.all()), Decimal('0'))

    @property
    def overhead_amount(self):
        return (self.subtotal * self.overhead_percent / Decimal('100')).quantize(Decimal('0.01'))

    @property
    def contingency_amount(self):
        base = self.subtotal + self.overhead_amount
        return (base * self.contingency_percent / Decimal('100')).quantize(Decimal('0.01'))

    @property
    def total(self):
        return (
            self.subtotal + self.overhead_amount + self.contingency_amount
        ).quantize(Decimal('0.01'))


class EstimateItem(models.Model):
    """Line item: description, quantity × unit rate = amount (PKR)."""
    estimate = models.ForeignKey(Estimate, on_delete=models.CASCADE, related_name='items')
    category = models.CharField(max_length=30, choices=ESTIMATE_CATEGORIES)
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=14, decimal_places=4, default=Decimal('1'))
    unit = models.CharField(max_length=20, choices=ESTIMATE_UNITS, default='no')
    unit_rate = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0'))
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0'))

    class Meta:
        ordering = ['category', 'id']

    def __str__(self):
        return f"{self.description}: {self.quantity} {self.unit} @ {self.unit_rate}"

    def save(self, *args, **kwargs):
        self.amount = (self.quantity * self.unit_rate).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)
