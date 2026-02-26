"""
Create notifications for bills due within the next 7 days and for overdue bills.
Run daily via cron: python manage.py notify_due_bills
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from bills.models import Bill
from notifications.models import Notification
from notifications.utils import send_notification_whatsapp, send_whatsapp_to_phone

User = get_user_model()


class Command(BaseCommand):
    help = 'Create notifications for bills due soon and overdue; set overdue status on past-due bills.'

    def handle(self, *args, **options):
        today = timezone.now().date()
        due_soon_end = today + timedelta(days=7)
        users = list(User.objects.filter(is_active=True))
        created = 0

        # Mark overdue and notify
        overdue_bills = Bill.objects.filter(status='pending', due_date__lt=today)
        for bill in overdue_bills:
            bill.status = 'overdue'
            bill.save(update_fields=['status'])
            for user in users:
                n = Notification.objects.create(
                    user=user,
                    notification_type=Notification.NotificationType.BILL_OVERDUE,
                    title='Bill overdue',
                    message=f'Bill "{bill.description}" (Rs {bill.amount}) for project {bill.project.name} was due on {bill.due_date}.',
                    link='/bills',
                )
                send_notification_whatsapp(user, n.title, n.message, n.link, channel='bills')
                created += 1

            # Optional WhatsApp notification directly to billed party
            if bill.billed_to_phone:
                msg = (
                    f'Bill \"{bill.description}\" (Rs {bill.amount}) for project {bill.project.name} '
                    f'was due on {bill.due_date} and is now overdue.'
                )
                send_whatsapp_to_phone(
                    bill.billed_to_phone,
                    'Bill overdue',
                    msg,
                    link='/bills',
                )

        # Notify due in next 7 days (pending only)
        due_soon = Bill.objects.filter(status='pending', due_date__gte=today, due_date__lte=due_soon_end)
        for bill in due_soon:
            for user in users:
                n = Notification.objects.create(
                    user=user,
                    notification_type=Notification.NotificationType.BILL_DUE,
                    title='Bill due soon',
                    message=f'Bill "{bill.description}" (Rs {bill.amount}) for project {bill.project.name} is due on {bill.due_date}.',
                    link='/bills',
                )
                send_notification_whatsapp(user, n.title, n.message, n.link, channel='bills')
                created += 1

            # Optional WhatsApp notification directly to billed party
            if bill.billed_to_phone:
                msg = (
                    f'Bill \"{bill.description}\" (Rs {bill.amount}) for project {bill.project.name} '
                    f'is due on {bill.due_date}.'
                )
                send_whatsapp_to_phone(
                    bill.billed_to_phone,
                    'Bill due soon',
                    msg,
                    link='/bills',
                )

        self.stdout.write(self.style.SUCCESS(f'Processed overdue and due-soon bills; created up to {created} notifications.'))