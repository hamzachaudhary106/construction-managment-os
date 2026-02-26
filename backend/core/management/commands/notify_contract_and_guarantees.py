"""
Create notifications for: contract payment due in 7 days, retention release in 7 days,
bank guarantees expiring in 30 days.
Run daily via cron: python manage.py notify_contract_and_guarantees
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from contracts.models import ContractPaymentSchedule
from guarantees.models import BankGuarantee
from notifications.models import Notification
from notifications.utils import send_notification_whatsapp

User = get_user_model()


class Command(BaseCommand):
    help = 'Notify users about contract payments due, retention release, and guarantee expiry.'

    def handle(self, *args, **options):
        today = timezone.now().date()
        due_soon_end = today + timedelta(days=7)
        expiry_end = today + timedelta(days=30)
        users = list(User.objects.filter(is_active=True))
        created = 0

        # Contract payment schedules due in next 7 days (pending)
        for s in ContractPaymentSchedule.objects.filter(
            status='pending',
            due_date__gte=today,
            due_date__lte=due_soon_end,
        ).select_related('contract', 'contract__project')[:50]:
            for user in users:
                n = Notification.objects.create(
                    user=user,
                    notification_type=Notification.NotificationType.CONTRACT_PAYMENT,
                    title='Contract payment due soon',
                    message=f'Payment "{s.description}" (Rs {s.amount}) for {s.contract.project.name} is due on {s.due_date}.',
                    link=f'/contracts/{s.contract_id}',
                )
                send_notification_whatsapp(user, n.title, n.message, n.link, channel='contracts')
                created += 1

        # Retention release date in next 7 days (where retention > 0)
        for s in ContractPaymentSchedule.objects.filter(
            retention_amount__gt=0,
            retention_release_date__isnull=False,
            retention_release_date__gte=today,
            retention_release_date__lte=due_soon_end,
        ).select_related('contract', 'contract__project')[:50]:
            for user in users:
                n = Notification.objects.create(
                    user=user,
                    notification_type=Notification.NotificationType.OTHER,
                    title='Retention release due',
                    message=f'Retention Rs {s.retention_amount} for {s.contract.project.name} ({s.contract.title}) releases on {s.retention_release_date}.',
                    link=f'/contracts/{s.contract_id}',
                )
                send_notification_whatsapp(user, n.title, n.message, n.link, channel='contracts')
                created += 1

        # Bank guarantees expiring in next 30 days
        for bg in BankGuarantee.objects.filter(
            validity_to__gte=today,
            validity_to__lte=expiry_end,
        ).select_related('project')[:30]:
            for user in users:
                n = Notification.objects.create(
                    user=user,
                    notification_type=Notification.NotificationType.OTHER,
                    title='Bank guarantee expiring',
                    message=f'{bg.get_guarantee_type_display()} guarantee (Rs {bg.amount}, {bg.bank_name}) for {bg.project.name} expires on {bg.validity_to}.',
                    link='/guarantees',
                )
                send_notification_whatsapp(user, n.title, n.message, n.link, channel='contracts')
                created += 1

        self.stdout.write(self.style.SUCCESS(f'Created {created} contract/guarantee notifications.'))
