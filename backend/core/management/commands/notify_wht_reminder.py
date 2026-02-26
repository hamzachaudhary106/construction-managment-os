"""
Create in-app notifications reminding users about WHT (withholding tax) filing.
Run monthly (e.g. 1st of month via cron): python manage.py notify_wht_reminder
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Sum, Q
from bills.models import Bill
from contracts.models import ContractPaymentSchedule
from notifications.models import Notification
from notifications.utils import send_notification_whatsapp

User = get_user_model()


class Command(BaseCommand):
    help = 'Create WHT filing reminder notifications for active users.'

    def handle(self, *args, **options):
        last_month = timezone.now().date().replace(day=1)
        period_label = last_month.strftime('%Y-%m')
        bill_wht = Bill.objects.filter(
            is_deleted=False
        ).exclude(Q(wht_amount__isnull=True) | Q(wht_amount=0)).filter(
            wht_tax_period=period_label
        ).aggregate(Sum('wht_amount'))['wht_amount__sum'] or 0
        sched_wht = ContractPaymentSchedule.objects.exclude(
            Q(wht_amount__isnull=True) | Q(wht_amount=0)
        ).filter(wht_tax_period=period_label).aggregate(Sum('wht_amount'))['wht_amount__sum'] or 0
        total = float(bill_wht) + float(sched_wht)
        users = list(User.objects.filter(is_active=True))
        created = 0
        for user in users:
            n = Notification.objects.create(
                user=user,
                notification_type='other',
                title='WHT filing reminder',
                message=f'Reminder: Submit WHT for tax period {period_label}. Total WHT recorded for this period: Rs {total:,.0f}.',
                link='/reports',
            )
            created += 1
            send_notification_whatsapp(user, n.title, n.message, n.link, channel='wht')
        self.stdout.write(self.style.SUCCESS(f'Created {created} WHT reminder notifications for period {period_label}.'))
