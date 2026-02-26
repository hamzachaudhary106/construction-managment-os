from django.db import models
from projects.models import Project


class FundTransfer(models.Model):
    from_project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='transfers_out',
    )
    to_project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='transfers_in',
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    transfer_date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-transfer_date', '-created_at']

    def __str__(self):
        return f"{self.from_project.name} → {self.to_project.name}: {self.amount}"
