"""
Create a weekly digest notification for each active user with company-wide stats.
Run weekly via cron: python manage.py send_weekly_digest
"""
from django.core.management.base import BaseCommand
from django.db.models import Sum
from django.contrib.auth import get_user_model
from core.models import Company
from projects.models import Project
from finances.models import Income, Expense
from bills.models import Bill
from transfers.models import FundTransfer
from partners.models import ProjectInvestment, PartnerWithdrawal
from notifications.models import Notification

User = get_user_model()


class Command(BaseCommand):
    help = 'Send weekly digest (in-app notification) with company stats: project count, balance, overdue bills, open punch items.'

    def handle(self, *args, **options):
        from sitelog.models import PunchItem
        from datetime import date

        created = 0
        companies = Company.objects.filter(is_active=True)
        for company in companies:
            pf = {'company_id': company.id}
            projects = Project.objects.filter(is_deleted=False, **pf)
            project_count = projects.count()
            total_balance = 0
            for project in projects:
                ti = Income.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                te = Expense.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                inv = ProjectInvestment.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                wd = PartnerWithdrawal.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                tin = FundTransfer.objects.filter(to_project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                tout = FundTransfer.objects.filter(from_project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                total_balance += float(ti) + float(inv) + float(tin) - float(te) - float(wd) - float(tout)
            overdue_bills = Bill.objects.filter(
                is_deleted=False, status__in=['pending', 'overdue'], due_date__lt=date.today()
            ).filter(project__company_id=company.id).aggregate(Sum('amount'))['amount__sum'] or 0
            open_punch = PunchItem.objects.filter(
                status__in=['open', 'in_progress'], project__company_id=company.id
            ).count()

            message = (
                f"Weekly digest: {project_count} project(s), total balance Rs {round(total_balance, 2)}, "
                f"overdue bills Rs {float(overdue_bills):.2f}, {open_punch} open punch item(s)."
            )
            for user in User.objects.filter(is_active=True, company_id=company.id):
                Notification.objects.create(
                    user=user,
                    notification_type=Notification.NotificationType.OTHER,
                    title='Weekly digest',
                    message=message,
                    link='/dashboard',
                )
                created += 1

        # Users with no company (e.g. superuser) get a digest across all companies
        users_no_company = User.objects.filter(is_active=True, company__isnull=True)
        if users_no_company.exists():
            pf = {}
            projects = Project.objects.filter(is_deleted=False)
            project_count = projects.count()
            total_balance = 0
            for project in projects:
                ti = Income.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                te = Expense.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                inv = ProjectInvestment.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                wd = PartnerWithdrawal.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                tin = FundTransfer.objects.filter(to_project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                tout = FundTransfer.objects.filter(from_project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                total_balance += float(ti) + float(inv) + float(tin) - float(te) - float(wd) - float(tout)
            overdue_bills = Bill.objects.filter(
                is_deleted=False, status__in=['pending', 'overdue'], due_date__lt=date.today()
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            open_punch = PunchItem.objects.filter(status__in=['open', 'in_progress']).count()
            message = (
                f"Weekly digest (all): {project_count} project(s), total balance Rs {round(total_balance, 2)}, "
                f"overdue bills Rs {float(overdue_bills):.2f}, {open_punch} open punch item(s)."
            )
            for user in users_no_company:
                Notification.objects.create(
                    user=user,
                    notification_type=Notification.NotificationType.OTHER,
                    title='Weekly digest',
                    message=message,
                    link='/dashboard',
                )
                created += 1

        self.stdout.write(self.style.SUCCESS(f'Sent {created} weekly digest notification(s).'))
