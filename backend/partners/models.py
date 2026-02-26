from django.db import models
from django.conf import settings
from projects.models import Project
from core.models import Company


class Partner(models.Model):
    """Partner/owner who can invest in projects and withdraw funds."""
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50, blank=True, help_text='WhatsApp number for this partner')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='partner_profile',
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='partners',
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class ProjectInvestment(models.Model):
    """Funds invested into a project (by partners or external investors)."""
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='investments',
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    investment_date = models.DateField()
    partner = models.ForeignKey(
        Partner,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='investments',
    )
    description = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_investments',
    )

    class Meta:
        ordering = ['-investment_date', '-created_at']

    def __str__(self):
        return f"{self.project.name} – Investment Rs {self.amount} ({self.investment_date})"


class PartnerWithdrawal(models.Model):
    """Record of a partner withdrawing funds from a project."""
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='partner_withdrawals',
    )
    partner = models.ForeignKey(
        Partner,
        on_delete=models.CASCADE,
        related_name='withdrawals',
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    withdrawal_date = models.DateField()
    description = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_withdrawals',
    )

    class Meta:
        ordering = ['-withdrawal_date', '-created_at']

    def __str__(self):
        return f"{self.partner.name} withdrew Rs {self.amount} from {self.project.name}"
