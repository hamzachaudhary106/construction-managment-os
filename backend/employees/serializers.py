from decimal import Decimal

from rest_framework import serializers

from core.tenant_utils import get_company_id
from .models import Employee, PayrollPeriod, PayrollEntry


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField(read_only=True)
    default_project_name = serializers.CharField(source='default_project.name', read_only=True)

    class Meta:
        model = Employee
        fields = [
            'id',
            'company',
            'code',
            'first_name',
            'last_name',
            'full_name',
            'designation',
            'department',
            'employment_type',
            'salary_type',
            'base_salary',
            'joining_date',
            'leaving_date',
            'is_active',
            'default_project',
            'default_project_name',
            'phone',
            'email',
            'cnic',
            'bank_name',
            'bank_account_number',
            'iban',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'company', 'created_at', 'updated_at')

    def get_full_name(self, obj: Employee) -> str:
        return str(obj)

    def create(self, validated_data):
        request = self.context.get('request')
        if request:
            cid = get_company_id(request)
            if cid is not None:
                validated_data['company_id'] = cid
        return super().create(validated_data)


class PayrollEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.__str__', read_only=True)

    class Meta:
        model = PayrollEntry
        fields = [
            'id',
            'period',
            'employee',
            'employee_name',
            'basic_salary',
            'allowances',
            'overtime_hours',
            'overtime_rate',
            'bonuses',
            'advance_recovery',
            'other_deductions',
            'tax',
            'net_salary',
            'is_paid',
            'paid_date',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate(self, attrs):
        # Recompute net_salary if any component changed
        instance: PayrollEntry | None = getattr(self, 'instance', None)
        data = {**(self.to_representation(instance) if instance else {}), **attrs}

        entry = PayrollEntry(
            basic_salary=Decimal(str(data.get('basic_salary') or 0)),
            allowances=Decimal(str(data.get('allowances') or 0)),
            overtime_hours=Decimal(str(data.get('overtime_hours') or 0)),
            overtime_rate=Decimal(str(data.get('overtime_rate') or 0)),
            bonuses=Decimal(str(data.get('bonuses') or 0)),
            advance_recovery=Decimal(str(data.get('advance_recovery') or 0)),
            other_deductions=Decimal(str(data.get('other_deductions') or 0)),
            tax=Decimal(str(data.get('tax') or 0)),
        )
        attrs['net_salary'] = entry.compute_net()
        return attrs


class PayrollPeriodSerializer(serializers.ModelSerializer):
    entries = PayrollEntrySerializer(many=True, read_only=True)

    class Meta:
        model = PayrollPeriod
        fields = [
            'id',
            'company',
            'year',
            'month',
            'status',
            'locked_at',
            'locked_by',
            'notes',
            'created_at',
            'updated_at',
            'entries',
        ]
        read_only_fields = (
            'id',
            'company',
            'locked_at',
            'locked_by',
            'created_at',
            'updated_at',
            'entries',
        )

    def create(self, validated_data):
        """
        When creating a payroll period, auto-generate payroll entries for all active employees in the company.
        """
        request = self.context.get('request')
        cid = get_company_id(request) if request else None
        if cid is not None:
            validated_data['company_id'] = cid
        period = super().create(validated_data)

        # Seed entries for each active employee in this company
        employees = Employee.objects.filter(company_id=period.company_id, is_active=True)
        entries = []
        for emp in employees:
            entry = PayrollEntry(
                period=period,
                employee=emp,
                basic_salary=emp.base_salary or Decimal('0'),
            )
            entry.net_salary = entry.compute_net()
            entries.append(entry)
        if entries:
            PayrollEntry.objects.bulk_create(entries)
        return period

