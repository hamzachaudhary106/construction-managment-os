from django.db import models
from django.conf import settings


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        BILL_DUE = 'bill_due', 'Bill Due'
        BILL_OVERDUE = 'bill_overdue', 'Bill Overdue'
        FUND_TRANSFER = 'fund_transfer', 'Fund Transfer'
        PROJECT_MILESTONE = 'project_milestone', 'Project Milestone'
        CONTRACT_PAYMENT = 'contract_payment', 'Contract Payment'
        OTHER = 'other', 'Other'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.OTHER,
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True)  # e.g. /projects/1 or /bills/5
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.user.username})"


class NotificationSettings(models.Model):
    """Per-user preferences for which notifications go to which channels."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_settings',
    )

    # WhatsApp channels
    whatsapp_bills = models.BooleanField(default=False)
    whatsapp_contracts = models.BooleanField(default=False)
    whatsapp_milestones = models.BooleanField(default=False)
    whatsapp_transfers = models.BooleanField(default=False)
    whatsapp_wht = models.BooleanField(default=False)

    def __str__(self):
        return f"Notification settings for {self.user.username}"
