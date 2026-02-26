from django.db import models
from core.models import Company


class Party(models.Model):
    class PartyType(models.TextChoices):
        SUBCONTRACTOR = 'subcontractor', 'Subcontractor'
        SUPPLIER = 'supplier', 'Supplier'

    company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True, related_name='parties')
    party_type = models.CharField(max_length=20, choices=PartyType.choices)
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    tax_id = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    performance_rating = models.PositiveSmallIntegerField(null=True, blank=True, help_text='1-5 rating')
    performance_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Parties'

    def __str__(self):
        return f"{self.name} ({self.get_party_type_display()})"
