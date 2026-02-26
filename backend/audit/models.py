from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=50)  # e.g. create_bill, transfer_funds
    model_name = models.CharField(max_length=100, blank=True)  # e.g. Bill, FundTransfer
    object_id = models.CharField(max_length=100, blank=True)
    details = models.JSONField(default=dict, blank=True)  # extra context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action} by {self.user_id} at {self.timestamp}"
