from decimal import Decimal

from django.conf import settings
from django.db import models
from projects.models import Project


class Employee(models.Model):
    """
    Company employee for payroll and HR purposes.

    This is deliberately separate from auth.User to support site workers
    who don't have logins.
    """

    class EmploymentType(models.TextChoices):
        FULL_TIME = 'full_time', 'Full-time'
        PART_TIME = 'part_time', 'Part-time'
        CONTRACT = 'contract', 'Contract'
        DAILY_WAGE = 'daily_wage', 'Daily wage'

    class SalaryType(models.TextChoices):
        MONTHLY = 'monthly', 'Monthly'
        HOURLY = 'hourly', 'Hourly'
        DAILY = 'daily', 'Daily'

    company = models.ForeignKey(
        'core.Company',
        on_delete=models.CASCADE,
        related_name='employees',
    )
    code = models.CharField(
        max_length=30,
        blank=True,
        help_text='Optional employee code or file number.',
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=150, blank=True, help_text='e.g. Site Engineer, Supervisor')
    department = models.CharField(max_length=150, blank=True, help_text='e.g. Site, Accounts, HR')
    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME,
    )
    salary_type = models.CharField(
        max_length=20,
        choices=SalaryType.choices,
        default=SalaryType.MONTHLY,
        help_text='How base pay is defined (monthly, hourly, or daily).',
    )
    base_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        help_text='Base salary amount (per month / hour / day, depending on salary type).',
    )
    joining_date = models.DateField(null=True, blank=True)
    leaving_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    default_project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_employees',
        help_text='If set, salaries will be booked to this project as "Labor" expense when payroll is paid.',
    )

    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    cnic = models.CharField(max_length=30, blank=True, help_text='CNIC or national ID')

    bank_name = models.CharField(max_length=150, blank=True)
    bank_account_number = models.CharField(max_length=64, blank=True)
    iban = models.CharField(max_length=64, blank=True)

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['first_name', 'last_name']
        unique_together = ('company', 'code')

    def __str__(self) -> str:
        full_name = f'{self.first_name} {self.last_name}'.strip()
        return full_name or self.code or f'Employee {self.pk}'


class PayrollPeriod(models.Model):
    """
    A monthly payroll run per company (e.g. Feb 2026 for Company A).
    """

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        APPROVED = 'approved', 'Approved'
        PAID = 'paid', 'Paid'

    company = models.ForeignKey(
        'core.Company',
        on_delete=models.CASCADE,
        related_name='payroll_periods',
    )
    year = models.PositiveIntegerField()
    month = models.PositiveIntegerField(help_text='1-12 (Jan–Dec)')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    locked_at = models.DateTimeField(null=True, blank=True)
    locked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='locked_payroll_periods',
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('company', 'year', 'month')
        ordering = ['-year', '-month', '-created_at']

    def __str__(self) -> str:
        return f'{self.company.name} - {self.year}-{self.month:02d}'


class PayrollEntry(models.Model):
    """
    Detailed salary line for one employee in one payroll period.
    All amounts are explicit so historical changes to Employee do not change past payrolls.
    """

    period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.CASCADE,
        related_name='entries',
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='payroll_entries',
    )

    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    allowances = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        help_text='Total of house, fuel, phone, etc.',
    )
    overtime_hours = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0'))
    overtime_rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        help_text='Rate per overtime hour.',
    )
    bonuses = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    advance_recovery = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        help_text='Monthly recovery of salary advance (deduction).',
    )
    other_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))

    net_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        help_text='Final payable amount after all adjustments.',
    )
    is_paid = models.BooleanField(default=False)
    paid_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('period', 'employee')
        ordering = ['employee__first_name', 'employee__last_name']

    def __str__(self) -> str:
        return f'{self.period} - {self.employee}'

    def compute_net(self) -> Decimal:
        overtime_total = (self.overtime_hours or 0) * (self.overtime_rate or 0)
        gross = (self.basic_salary or 0) + (self.allowances or 0) + (self.bonuses or 0) + overtime_total
        deductions = (self.advance_recovery or 0) + (self.other_deductions or 0) + (self.tax or 0)
        return gross - deductions

