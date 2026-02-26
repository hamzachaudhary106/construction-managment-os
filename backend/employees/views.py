from io import BytesIO

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from core.tenant_utils import filter_queryset_by_company, get_company_id
from core.views import IsAdminOrReadOnly
from finances.models import Expense
from notifications.utils import send_whatsapp_document_bytes
from .models import Employee, PayrollPeriod, PayrollEntry
from .serializers import EmployeeSerializer, PayrollPeriodSerializer, PayrollEntrySerializer


class EmployeeListCreateView(generics.ListCreateAPIView):
    """
    List or create employees for the current company.
    """
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        qs = Employee.objects.select_related('company')
        qs = filter_queryset_by_company(qs, self.request)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            if is_active.lower() in ('true', '1', 'yes'):
                qs = qs.filter(is_active=True)
            elif is_active.lower() in ('false', '0', 'no'):
                qs = qs.filter(is_active=False)
        return qs


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        qs = Employee.objects.select_related('company')
        return filter_queryset_by_company(qs, self.request)


class PayrollPeriodListCreateView(generics.ListCreateAPIView):
    """
    List payroll periods for the current company or create a new one.
    """
    serializer_class = PayrollPeriodSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        qs = PayrollPeriod.objects.select_related('company').prefetch_related('entries__employee')
        qs = filter_queryset_by_company(qs, self.request)
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        if year:
            qs = qs.filter(year=year)
        if month:
            qs = qs.filter(month=month)
        return qs

    def perform_create(self, serializer):
        cid = get_company_id(self.request)
        period = serializer.save(
            company_id=cid if cid is not None else serializer.validated_data.get('company_id'),
        )
        return period


class PayrollPeriodDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update a payroll period (e.g. status, notes).
    """
    serializer_class = PayrollPeriodSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        qs = PayrollPeriod.objects.select_related('company').prefetch_related('entries__employee')
        return filter_queryset_by_company(qs, self.request)

    def perform_update(self, serializer):
        instance = serializer.instance
        prev_status = instance.status
        period = serializer.save()
        # If transitioning to PAID, lock period
        if prev_status != PayrollPeriod.Status.PAID and period.status == PayrollPeriod.Status.PAID:
            period.locked_at = timezone.now()
            period.locked_by = self.request.user
            period.save(update_fields=['locked_at', 'locked_by'])


class PayrollEntryListUpdateView(generics.ListAPIView):
    """
    List payroll entries for a given period, optionally filtered by employee.
    """
    serializer_class = PayrollEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        qs = PayrollEntry.objects.select_related('period', 'employee', 'period__company')
        qs = filter_queryset_by_company(qs, self.request, company_id_field='period__company_id')
        period_id = self.request.query_params.get('period')
        employee_id = self.request.query_params.get('employee')
        if period_id:
            qs = qs.filter(period_id=period_id)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs.order_by('employee__first_name', 'employee__last_name', 'employee_id')


class PayrollEntryBulkUpdateView(APIView):
    """
    Bulk update payroll entries for a given period.

    Expected payload:
    {
      "entries": [
        { "id": 1, "basic_salary": "...", "allowances": "...", ... },
        ...
      ]
    }
    """

    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def patch(self, request, *args, **kwargs):
        data = request.data or {}
        entries_data = data.get('entries') or []
        updated = 0
        errors = []

        for item in entries_data:
            entry_id = item.get('id')
            if not entry_id:
                continue
            try:
                entry = PayrollEntry.objects.select_related('period', 'period__company').get(pk=entry_id)
            except PayrollEntry.DoesNotExist:
                errors.append({'id': entry_id, 'error': 'Not found'})
                continue

            # Company scoping
            cid = get_company_id(request)
            if cid is not None and entry.period.company_id != cid:
                errors.append({'id': entry_id, 'error': 'Not allowed'})
                continue

            serializer = PayrollEntrySerializer(entry, data=item, partial=True, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                updated += 1
            else:
                errors.append({'id': entry_id, 'error': serializer.errors})

        return Response({'updated': updated, 'errors': errors})


class PayrollPeriodMarkPaidView(APIView):
    """
    Mark an entire payroll period as paid and mark all entries paid with a given paid_date (or today).
    """

    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def post(self, request, pk, *args, **kwargs):
        try:
            period = PayrollPeriod.objects.select_related('company').get(pk=pk)
        except PayrollPeriod.DoesNotExist:
            return Response({'detail': 'Payroll period not found.'}, status=404)

        cid = get_company_id(request)
        if cid is not None and period.company_id != cid:
            return Response({'detail': 'Not allowed.'}, status=403)

        paid_date_str = (request.data or {}).get('paid_date')
        if paid_date_str:
            try:
                paid_date = timezone.datetime.fromisoformat(paid_date_str).date()
            except Exception:
                return Response({'detail': 'Invalid paid_date format.'}, status=400)
        else:
            paid_date = timezone.now().date()

        entries = PayrollEntry.objects.select_related('employee', 'employee__default_project').filter(period=period)
        entries.update(is_paid=True, paid_date=paid_date)

        # Book labor expenses per employee to their default project (if set)
        expenses_to_create = []
        for entry in entries:
            project = entry.employee.default_project
            if not project or entry.net_salary <= 0:
                continue
            expenses_to_create.append(Expense(
                project=project,
                phase=None,
                purchase_order=None,
                category='labor',
                amount=entry.net_salary,
                description=f'Salary {period.year}-{period.month:02d} - {entry.employee}',
                date=paid_date,
            ))
        if expenses_to_create:
            Expense.objects.bulk_create(expenses_to_create)

        period.status = PayrollPeriod.Status.PAID
        period.locked_at = timezone.now()
        period.locked_by = request.user
        period.save(update_fields=['status', 'locked_at', 'locked_by'])

        return Response({'detail': 'Payroll marked as paid.', 'paid_date': str(paid_date)})


def _build_payslip_pdf_bytes(entry: PayrollEntry) -> bytes:
    """
    Build a simple payslip PDF for one payroll entry.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    company_name = entry.period.company.name
    period_label = f'{entry.period.year}-{entry.period.month:02d}'
    employee_name = str(entry.employee)

    elements.append(Paragraph(f'<b>{company_name}</b>', styles['Title']))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(f'Payslip for {employee_name}', styles['Heading3']))
    elements.append(Paragraph(f'Payroll period: {period_label}', styles['Normal']))
    elements.append(Spacer(1, 12))

    data = [
        ['Component', 'Amount'],
        ['Basic salary', f'{entry.basic_salary:,.2f}'],
        ['Allowances', f'{entry.allowances:,.2f}'],
        ['Overtime (hours x rate)', f'{entry.overtime_hours} x {entry.overtime_rate}'],
        ['Bonuses', f'{entry.bonuses:,.2f}'],
        ['Advance recovery', f'-{entry.advance_recovery:,.2f}'],
        ['Other deductions', f'-{entry.other_deductions:,.2f}'],
        ['Tax', f'-{entry.tax:,.2f}'],
        ['Net salary', f'{entry.net_salary:,.2f}'],
    ]
    table = Table(data, hAlign='LEFT', colWidths=[200, 150])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 12))

    if entry.paid_date:
        elements.append(Paragraph(f'Paid date: {entry.paid_date}', styles['Normal']))
    elements.append(Spacer(1, 24))
    elements.append(Paragraph('This is a system-generated payslip.', styles['Italic']))

    doc.build(elements)
    return buffer.getvalue()


class PayslipPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            entry = PayrollEntry.objects.select_related('period', 'period__company', 'employee').get(pk=pk)
        except PayrollEntry.DoesNotExist:
            return Response({'detail': 'Payslip not found.'}, status=404)

        cid = get_company_id(request)
        if cid is not None and entry.period.company_id != cid:
            return Response({'detail': 'Not allowed.'}, status=403)

        pdf_bytes = _build_payslip_pdf_bytes(entry)
        resp = HttpResponse(pdf_bytes, content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename=payslip-{entry.id}.pdf'
        return resp


class PayslipSendWhatsAppView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            entry = PayrollEntry.objects.select_related('period', 'period__company', 'employee').get(pk=pk)
        except PayrollEntry.DoesNotExist:
            return Response({'detail': 'Payslip not found.'}, status=404)

        cid = get_company_id(request)
        if cid is not None and entry.period.company_id != cid:
            return Response({'detail': 'Not allowed.'}, status=403)

        phone = (entry.employee.phone or '').strip()
        if not phone:
            return Response({'detail': 'Employee has no WhatsApp phone set.'}, status=400)

        pdf_bytes = _build_payslip_pdf_bytes(entry)
        caption = f'Payslip for {entry.employee} - {entry.period.year}-{entry.period.month:02d}'
        ok = send_whatsapp_document_bytes(phone, pdf_bytes, f'payslip-{entry.id}.pdf', caption=caption)
        if not ok:
            return Response({'detail': 'Failed to send payslip via WhatsApp. Check WhatsApp configuration.'}, status=502)
        return Response({'detail': 'Payslip sent via WhatsApp.'})

