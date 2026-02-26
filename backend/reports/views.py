from datetime import date, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.utils import timezone
from projects.models import Project, ProjectMilestone
from finances.models import Income, Expense
from bills.models import Bill
from contracts.models import Contract, ContractPaymentSchedule
from sitelog.models import DailyLog, Issue
from guarantees.models import BankGuarantee
from variations.models import Variation
from transfers.models import FundTransfer
from partners.models import ProjectInvestment, PartnerWithdrawal
from documents.models import ProjectDocument
from purchase_orders.models import PurchaseOrder
from django.db.models import Q


class ReportsOverviewView(APIView):
    """List all projects with financial summary for dashboard overview."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        projects = Project.objects.filter(is_deleted=False)
        if getattr(request.user, 'client_id', None):
            projects = projects.filter(client_id=request.user.client_id)
        elif getattr(request.user, 'company_id', None):
            projects = projects.filter(company_id=request.user.company_id)
        result = []
        for project in projects:
            total_income = Income.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
            total_expenses = Expense.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
            total_investments = ProjectInvestment.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
            total_withdrawals = PartnerWithdrawal.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
            transfers_in = FundTransfer.objects.filter(to_project=project).aggregate(Sum('amount'))['amount__sum'] or 0
            transfers_out = FundTransfer.objects.filter(from_project=project).aggregate(Sum('amount'))['amount__sum'] or 0
            balance = float(total_income) + float(total_investments) + float(transfers_in) - float(total_expenses) - float(total_withdrawals) - float(transfers_out)
            result.append({
                'id': project.id,
                'name': project.name,
                'status': project.status,
                'total_income': float(total_income),
                'total_expenses': float(total_expenses),
                'total_investments': float(total_investments),
                'total_withdrawals': float(total_withdrawals),
                'transfers_in': float(transfers_in),
                'transfers_out': float(transfers_out),
                'balance': balance,
            })
        return Response(result)


class ProjectDashboardView(APIView):
    """Central dashboard for a single project: income, expenses, balance, categorized data."""
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        qs = Project.objects.filter(is_deleted=False)
        if getattr(request.user, 'client_id', None):
            qs = qs.filter(client_id=request.user.client_id)
        elif getattr(request.user, 'company_id', None):
            qs = qs.filter(company_id=request.user.company_id)
        try:
            project = qs.get(pk=project_id)
        except Project.DoesNotExist:
            return Response({'detail': 'Project not found.'}, status=404)

        total_income = Income.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
        total_expenses = Expense.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
        total_investments = ProjectInvestment.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
        total_withdrawals = PartnerWithdrawal.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
        transfers_in = FundTransfer.objects.filter(to_project=project).aggregate(Sum('amount'))['amount__sum'] or 0
        transfers_out = FundTransfer.objects.filter(from_project=project).aggregate(Sum('amount'))['amount__sum'] or 0
        balance = float(total_income) + float(total_investments) + float(transfers_in) - float(total_expenses) - float(total_withdrawals) - float(transfers_out)

        expenses_by_category = list(
            Expense.objects.filter(project=project)
            .values('category')
            .annotate(total=Sum('amount'))
            .order_by('-total')
        )

        bill_qs = Bill.objects.filter(project=project, is_deleted=False)
        pending_bills = bill_qs.filter(status='pending').aggregate(Sum('amount'))['amount__sum'] or 0
        overdue_bills = bill_qs.filter(status='overdue').aggregate(Sum('amount'))['amount__sum'] or 0
        paid_bills = bill_qs.filter(status='paid').aggregate(Sum('amount'))['amount__sum'] or 0

        contracts = Contract.objects.filter(project=project)
        expected_payments = ContractPaymentSchedule.objects.filter(
            contract__project=project, status='pending'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        completed_payments = ContractPaymentSchedule.objects.filter(
            contract__project=project, status='paid'
        ).aggregate(Sum('amount'))['amount__sum'] or 0

        return Response({
            'project': {
                'id': project.id,
                'name': project.name,
                'status': project.status,
            },
            'financial': {
                'total_income': float(total_income),
                'total_expenses': float(total_expenses),
                'total_investments': float(total_investments),
                'total_withdrawals': float(total_withdrawals),
                'transfers_in': float(transfers_in),
                'transfers_out': float(transfers_out),
                'balance': float(balance),
            },
            'expenses_by_category': expenses_by_category,
            'bills': {
                'pending_amount': float(pending_bills),
                'overdue_amount': float(overdue_bills),
                'paid_amount': float(paid_bills),
            },
            'contracts': {
                'expected_payments': float(expected_payments),
                'completed_payments': float(completed_payments),
            },
        })


def _history_project_filter(request, project):
    """Ensure user can only see history for projects in their company."""
    if getattr(request.user, 'company_id', None) and project.company_id != request.user.company_id:
        return False
    return True


class ProjectHistoryView(APIView):
    """Chronological history of all project activity (income, expenses, bills, contracts, investments, withdrawals, transfers, milestones, logs, issues, documents, variations, guarantees, POs)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        qs = Project.objects.filter(is_deleted=False)
        if getattr(request.user, 'client_id', None):
            qs = qs.filter(client_id=request.user.client_id)
        elif getattr(request.user, 'company_id', None):
            qs = qs.filter(company_id=request.user.company_id)
        try:
            project = qs.get(pk=project_id)
        except Project.DoesNotExist:
            return Response({'detail': 'Project not found.'}, status=404)
        if not _history_project_filter(request, project):
            return Response({'detail': 'Not found.'}, status=404)

        events = []

        def add(date_val, event_type, title, amount=None, extra=None, id_val=None):
            if date_val is None:
                return
            d = date_val.date() if hasattr(date_val, 'date') else date_val
            sort_key = d.isoformat() if d else ''
            events.append({
                'sort_key': sort_key,
                'date': d.isoformat() if d else None,
                'type': event_type,
                'title': title,
                'amount': float(amount) if amount is not None else None,
                'extra': extra,
                'id': id_val,
            })

        # Project start
        if project.start_date:
            add(project.start_date, 'project', 'Project started', extra=project.status)

        # Income
        for o in Income.objects.filter(project=project).order_by('date'):
            add(o.date, 'income', o.description or 'Income', amount=o.amount, id_val=o.id)

        # Expense
        for o in Expense.objects.filter(project=project).order_by('date'):
            add(o.date, 'expense', o.description or 'Expense', amount=o.amount, extra=o.get_category_display() if hasattr(o, 'get_category_display') else o.category, id_val=o.id)

        # Bills
        for b in Bill.objects.filter(project=project, is_deleted=False).order_by('due_date'):
            add(b.due_date, 'bill', b.description or 'Bill', amount=b.amount, extra=b.status, id_val=b.id)

        # Contracts
        for c in Contract.objects.filter(project=project).order_by('start_date'):
            if c.start_date:
                add(c.start_date, 'contract', c.title or 'Contract', amount=c.total_value, extra=c.status, id_val=c.id)

        # Contract payment schedules
        for s in ContractPaymentSchedule.objects.filter(contract__project=project).order_by('due_date'):
            add(s.due_date, 'contract_payment', s.description or 'Payment', amount=s.amount, extra=s.status, id_val=s.id)

        # Investments
        for i in ProjectInvestment.objects.filter(project=project).select_related('partner').order_by('investment_date'):
            add(i.investment_date, 'investment', i.description or 'Investment', amount=i.amount, extra=i.partner.name if i.partner else None, id_val=i.id)

        # Withdrawals
        for w in PartnerWithdrawal.objects.filter(project=project).select_related('partner').order_by('withdrawal_date'):
            add(w.withdrawal_date, 'withdrawal', w.description or 'Partner withdrawal', amount=w.amount, extra=w.partner.name if w.partner else None, id_val=w.id)

        # Transfers in
        for t in FundTransfer.objects.filter(to_project=project).select_related('from_project').order_by('transfer_date'):
            add(t.transfer_date, 'transfer_in', f"Transfer in from {t.from_project.name}", amount=t.amount, id_val=t.id)

        # Transfers out
        for t in FundTransfer.objects.filter(from_project=project).select_related('to_project').order_by('transfer_date'):
            add(t.transfer_date, 'transfer_out', f"Transfer out to {t.to_project.name}", amount=t.amount, id_val=t.id)

        # Milestones (use completed_date if set, else due_date)
        for m in ProjectMilestone.objects.filter(project=project).order_by('due_date'):
            if m.completed and m.completed_date:
                add(m.completed_date, 'milestone', m.title or 'Milestone', extra='Completed', id_val=m.id)
            elif m.due_date:
                add(m.due_date, 'milestone', m.title or 'Milestone', extra='Due', id_val=m.id)

        # Daily logs
        for log in DailyLog.objects.filter(project=project).order_by('log_date'):
            add(log.log_date, 'site_log', log.work_done[:80] + ('…' if len(log.work_done or '') > 80 else '') or 'Site log', id_val=log.id)

        # Issues
        for i in Issue.objects.filter(project=project).order_by('created_at'):
            add(i.created_at, 'issue', i.title or 'Issue', extra=i.status, id_val=i.id)

        # Documents
        for d in ProjectDocument.objects.filter(project=project).order_by('created_at'):
            add(d.created_at, 'document', d.title or 'Document', extra=d.doc_type, id_val=d.id)

        # Variations
        for v in Variation.objects.filter(project=project).order_by('variation_date'):
            add(v.variation_date or v.created_at, 'variation', v.title or 'Variation', amount=v.amount, extra=v.status, id_val=v.id)

        # Bank guarantees
        for g in BankGuarantee.objects.filter(project=project).order_by('validity_from'):
            add(g.validity_from, 'guarantee', f"{g.get_guarantee_type_display()} – {g.bank_name}", amount=g.amount, id_val=g.id)

        # Purchase orders
        for po in PurchaseOrder.objects.filter(project=project).order_by('order_date'):
            add(po.order_date or po.created_at, 'purchase_order', po.po_number or 'Purchase order', id_val=po.id)

        events.sort(key=lambda x: (x['sort_key'], x['type'], str(x.get('id') or '')))
        out = [{'date': e['date'], 'type': e['type'], 'title': e['title'], 'amount': e['amount'], 'extra': e['extra'], 'id': e['id']} for e in events]
        return Response({'project_id': project.id, 'project_name': project.name, 'history': out})


def _project_filter(request):
    """Return a Q or filter dict for project scoping by user's company or client."""
    if getattr(request.user, 'client_id', None):
        return {'project__client_id': request.user.client_id}
    if getattr(request.user, 'company_id', None):
        return {'project__company_id': request.user.company_id}
    return {}

class FinancialReportView(APIView):
    """Income vs expenses and summary. Optional project_id for single project."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        qs_income = Income.objects.all().filter(**_project_filter(request))
        qs_expense = Expense.objects.all().filter(**_project_filter(request))
        if project_id:
            qs_income = qs_income.filter(project_id=project_id)
            qs_expense = qs_expense.filter(project_id=project_id)

        total_income = qs_income.aggregate(Sum('amount'))['amount__sum'] or 0
        total_expense = qs_expense.aggregate(Sum('amount'))['amount__sum'] or 0

        return Response({
            'total_income': float(total_income),
            'total_expenses': float(total_expense),
            'net': float(total_income - total_expense),
            'project_id': int(project_id) if project_id else None,
        })


class PendingBillsReportView(APIView):
    """Pending and overdue bills report."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        qs = Bill.objects.filter(is_deleted=False, status__in=['pending', 'overdue']).select_related('project').filter(**_project_filter(request))
        if project_id:
            qs = qs.filter(project_id=project_id)

        bills = [
            {
                'id': b.id,
                'project_id': b.project_id,
                'project_name': b.project.name,
                'description': b.description,
                'amount': float(b.amount),
                'due_date': str(b.due_date),
                'status': b.status,
            }
            for b in qs.order_by('due_date')[:200]
        ]
        total = sum(b['amount'] for b in bills)

        return Response({
            'bills': bills,
            'total_pending_amount': total,
            'count': len(bills),
        })


class CashFlowReportView(APIView):
    """Cash flow by month: income, expenses, net. Optional project_id."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')

        qs_income = Income.objects.all().filter(**_project_filter(request))
        qs_expense = Expense.objects.all().filter(**_project_filter(request))
        if project_id:
            qs_income = qs_income.filter(project_id=project_id)
            qs_expense = qs_expense.filter(project_id=project_id)

        income_by_month = list(
            qs_income.annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(total=Sum('amount'))
            .order_by('month')
        )
        expense_by_month = list(
            qs_expense.annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(total=Sum('amount'))
            .order_by('month')
        )

        months = {}
        for row in income_by_month:
            m = row['month']
            if m:
                key = m.strftime('%Y-%m')
                months[key] = months.get(key, {'income': 0, 'expenses': 0})
                months[key]['income'] = float(row['total'])
        for row in expense_by_month:
            m = row['month']
            if m:
                key = m.strftime('%Y-%m')
                months[key] = months.get(key, {'income': 0, 'expenses': 0})
                months[key]['expenses'] = float(row['total'])

        result = [
            {
                'month': k,
                'income': v['income'],
                'expenses': v['expenses'],
                'net': v['income'] - v['expenses'],
            }
            for k, v in sorted(months.items())
        ]
        if from_date:
            result = [r for r in result if r['month'] >= from_date]
        if to_date:
            result = [r for r in result if r['month'] <= to_date]
        return Response({'cash_flow': result, 'project_id': int(project_id) if project_id else None})


class CashFlowForecastView(APIView):
    """Next 30 days: expected inflows (contract schedules + income), outflows (bills + contract payments due). Plus overdue total."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        today = date.today()
        end = today + timedelta(days=30)

        # Overdue: bills and contract payments past due
        bill_qs = Bill.objects.filter(is_deleted=False, status__in=['pending', 'overdue']).filter(**_project_filter(request))
        sched_qs = ContractPaymentSchedule.objects.filter(status__in=['pending', 'overdue'])
        if getattr(request.user, 'company_id', None):
            sched_qs = sched_qs.filter(contract__project__company_id=request.user.company_id)
        if project_id:
            bill_qs = bill_qs.filter(project_id=project_id)
            sched_qs = sched_qs.filter(contract__project_id=project_id)

        overdue_bills = bill_qs.filter(due_date__lt=today).aggregate(Sum('amount'))['amount__sum'] or 0
        overdue_schedules = sched_qs.filter(due_date__lt=today).aggregate(Sum('amount'))['amount__sum'] or 0
        overdue_total = float(overdue_bills) + float(overdue_schedules)

        # Next 30 days: expected in (contract schedules due in range with expected payment; use due_date as proxy)
        income_qs = Income.objects.filter(date__gte=today, date__lte=end).filter(**_project_filter(request))
        sched_in = ContractPaymentSchedule.objects.filter(status='pending', due_date__gte=today, due_date__lte=end)
        if getattr(request.user, 'company_id', None):
            sched_in = sched_in.filter(contract__project__company_id=request.user.company_id)
        if project_id:
            income_qs = income_qs.filter(project_id=project_id)
            sched_in = sched_in.filter(contract__project_id=project_id)
        expected_in = float(income_qs.aggregate(Sum('amount'))['amount__sum'] or 0) + float(
            sched_in.aggregate(Sum('amount'))['amount__sum'] or 0
        )

        # Next 30 days: expected out (bills due in range + contract payments due in range)
        bills_out = bill_qs.filter(due_date__gte=today, due_date__lte=end).aggregate(Sum('amount'))['amount__sum'] or 0
        sched_out = ContractPaymentSchedule.objects.filter(status='pending', due_date__gte=today, due_date__lte=end)
        if getattr(request.user, 'company_id', None):
            sched_out = sched_out.filter(contract__project__company_id=request.user.company_id)
        if project_id:
            sched_out = sched_out.filter(contract__project_id=project_id)
        expected_out = float(bills_out) + float(sched_out.aggregate(Sum('amount'))['amount__sum'] or 0)

        return Response({
            'overdue_total': overdue_total,
            'expected_in_next_30_days': expected_in,
            'expected_out_next_30_days': expected_out,
            'net_next_30_days': expected_in - expected_out,
            'project_id': int(project_id) if project_id else None,
        })


class DashboardSummaryView(APIView):
    """Counts for at-a-glance: overdue bills, open issues, guarantees expiring in 30 days, pending variations."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        end_30 = today + timedelta(days=30)
        pf = _project_filter(request)
        overdue_bills_count = Bill.objects.filter(is_deleted=False, status__in=['pending', 'overdue'], due_date__lt=today).filter(**pf).count()
        open_issues_count = Issue.objects.filter(status__in=['open', 'in_progress']).filter(**pf).count()
        guarantees_expiring_30_days = BankGuarantee.objects.filter(validity_to__gte=today, validity_to__lte=end_30).filter(**pf).count()
        pending_variations_count = Variation.objects.filter(status='pending').filter(**pf).count()
        return Response({
            'overdue_bills_count': overdue_bills_count,
            'open_issues_count': open_issues_count,
            'guarantees_expiring_30_days': guarantees_expiring_30_days,
            'pending_variations_count': pending_variations_count,
        })


class CompanyDashboardView(APIView):
    """Company-wide dashboard: project count, total balance, overdue total, open punch items, etc."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Scope projects by user's company or client (same logic as ReportsOverviewView)
        projects = Project.objects.filter(is_deleted=False)
        if getattr(request.user, 'client_id', None):
            projects = projects.filter(client_id=request.user.client_id)
        elif getattr(request.user, 'company_id', None):
            projects = projects.filter(company_id=request.user.company_id)

        pf = _project_filter(request)
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
        overdue_bills = Bill.objects.filter(is_deleted=False, status__in=['pending', 'overdue'], due_date__lt=date.today()).filter(**pf).aggregate(Sum('amount'))['amount__sum'] or 0
        from sitelog.models import PunchItem
        open_punch_count = PunchItem.objects.filter(status__in=['open', 'in_progress']).filter(**pf).count()
        return Response({
            'project_count': project_count,
            'total_balance': round(total_balance, 2),
            'overdue_bills_total': float(overdue_bills),
            'open_punch_items_count': open_punch_count,
        })


class CostForecastView(APIView):
    """Cost to complete / forecast at completion for a project. Optional project_id (default: all)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from finances.models import Budget
        project_id = request.query_params.get('project_id')
        projects = Project.objects.filter(is_deleted=False)
        if getattr(request.user, 'client_id', None):
            projects = projects.filter(client_id=request.user.client_id)
        elif getattr(request.user, 'company_id', None):
            projects = projects.filter(company_id=request.user.company_id)
        if project_id:
            projects = projects.filter(pk=project_id)
        result = []
        for project in projects:
            budget_total = Budget.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
            actual_expenses = Expense.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
            variation_total = Variation.objects.filter(project=project, status='approved').aggregate(Sum('amount'))['amount__sum'] or 0
            estimated_total = float(budget_total) + float(variation_total)
            cost_to_complete = max(0, estimated_total - float(actual_expenses))
            result.append({
                'project_id': project.id,
                'project_name': project.name,
                'budget_total': float(budget_total),
                'actual_expenses': float(actual_expenses),
                'approved_variations': float(variation_total),
                'estimated_total': round(estimated_total, 2),
                'cost_to_complete': round(cost_to_complete, 2),
            })
        return Response(result if not project_id else (result[0] if result else {}))


class WHTReportView(APIView):
    """Withholding tax report: WHT by tax period (bills + contract payment schedules). Optional project_id."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        pf = _project_filter(request)
        bills_qs = Bill.objects.filter(is_deleted=False).exclude(Q(wht_amount__isnull=True) | Q(wht_amount=0)).filter(**pf)
        sched_qs = ContractPaymentSchedule.objects.exclude(Q(wht_amount__isnull=True) | Q(wht_amount=0)).select_related('contract', 'contract__project')
        if getattr(request.user, 'company_id', None):
            sched_qs = sched_qs.filter(contract__project__company_id=request.user.company_id)
        if project_id:
            bills_qs = bills_qs.filter(project_id=project_id)
            sched_qs = sched_qs.filter(contract__project_id=project_id)

        by_period = {}
        rows = []
        for b in bills_qs:
            period = (b.wht_tax_period or '').strip() or 'Unspecified'
            amt = float(b.wht_amount or 0)
            by_period[period] = by_period.get(period, 0) + amt
            rows.append({
                'source': 'bill', 'id': b.id, 'project_name': b.project.name, 'description': b.description,
                'amount': float(b.amount), 'wht_amount': amt, 'wht_certificate_number': b.wht_certificate_number or '',
                'wht_tax_period': b.wht_tax_period or '',
            })
        for s in sched_qs:
            period = (s.wht_tax_period or '').strip() or 'Unspecified'
            amt = float(s.wht_amount or 0)
            by_period[period] = by_period.get(period, 0) + amt
            rows.append({
                'source': 'contract_schedule', 'id': s.id, 'project_name': s.contract.project.name,
                'description': f"{s.contract.title} - {s.description}", 'amount': float(s.amount),
                'wht_amount': amt, 'wht_certificate_number': s.wht_certificate_number or '',
                'wht_tax_period': s.wht_tax_period or '',
            })
        summary = [{'tax_period': k, 'total_wht': v} for k, v in sorted(by_period.items())]
        return Response({
            'by_period': summary,
            'rows': sorted(rows, key=lambda x: (x['wht_tax_period'], x['project_name'])),
            'project_id': int(project_id) if project_id else None,
        })


class PayablesAgingView(APIView):
    """Payables by party (from contract payment schedules) and by age bucket (current, 1-30, 31-60, 61-90, 90+)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        today = date.today()

        sched_qs = ContractPaymentSchedule.objects.filter(
            status__in=['pending', 'overdue']
        ).select_related('contract', 'contract__party', 'contract__project')
        if getattr(request.user, 'company_id', None):
            sched_qs = sched_qs.filter(contract__project__company_id=request.user.company_id)
        if project_id:
            sched_qs = sched_qs.filter(contract__project_id=project_id)

        by_party = {}
        for s in sched_qs:
            party_name = s.contract.party.name if s.contract.party else (s.contract.contractor_name or 'Unknown')
            party_id = s.contract.party_id or 0
            key = (party_id, party_name)
            by_party[key] = by_party.get(key, 0) + float(s.amount)
        by_party_list = [{'party_id': k[0], 'party_name': k[1], 'total': v} for k, v in sorted(by_party.items(), key=lambda x: -x[1])]

        # Age buckets (days overdue or days until due)
        buckets = {'current': 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0}
        for s in sched_qs:
            delta = (today - s.due_date).days if s.due_date else 0
            amt = float(s.amount)
            if delta <= 0:
                buckets['current'] += amt
            elif delta <= 30:
                buckets['1_30'] += amt
            elif delta <= 60:
                buckets['31_60'] += amt
            elif delta <= 90:
                buckets['61_90'] += amt
            else:
                buckets['90_plus'] += amt

        # Bills aging (no party link)
        bill_qs = Bill.objects.filter(is_deleted=False, status__in=['pending', 'overdue']).filter(**_project_filter(request))
        if project_id:
            bill_qs = bill_qs.filter(project_id=project_id)
        for b in bill_qs:
            delta = (today - b.due_date).days if b.due_date else 0
            amt = float(b.amount)
            if delta <= 0:
                buckets['current'] += amt
            elif delta <= 30:
                buckets['1_30'] += amt
            elif delta <= 60:
                buckets['31_60'] += amt
            elif delta <= 90:
                buckets['61_90'] += amt
            else:
                buckets['90_plus'] += amt

        return Response({
            'by_party': by_party_list,
            'by_age': buckets,
            'project_id': int(project_id) if project_id else None,
        })


class ExportReportView(APIView):
    """Export financial/pending-bills report as Excel or PDF."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        report_type = request.query_params.get('type', 'financial')  # financial | pending_bills | cash_flow
        format_type = request.query_params.get('format', 'xlsx')  # xlsx | pdf
        project_id = request.query_params.get('project_id')

        if format_type == 'xlsx':
            return self._export_excel(request, report_type, project_id)
        elif format_type == 'pdf':
            return self._export_pdf(request, report_type, project_id)
        return Response({'detail': 'Invalid format. Use format=xlsx or format=pdf'}, status=400)

    def _cash_flow_data(self, request, project_id):
        pf = _project_filter(request)
        qs_income = Income.objects.all().filter(**pf)
        qs_expense = Expense.objects.all().filter(**pf)
        if project_id:
            qs_income = qs_income.filter(project_id=project_id)
            qs_expense = qs_expense.filter(project_id=project_id)
        income_by_month = list(
            qs_income.annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(total=Sum('amount'))
            .order_by('month')
        )
        expense_by_month = list(
            qs_expense.annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(total=Sum('amount'))
            .order_by('month')
        )
        months = {}
        for row in income_by_month:
            m = row['month']
            if m:
                key = m.strftime('%Y-%m')
                months[key] = months.get(key, {'income': 0, 'expenses': 0})
                months[key]['income'] = float(row['total'])
        for row in expense_by_month:
            m = row['month']
            if m:
                key = m.strftime('%Y-%m')
                months[key] = months.get(key, {'income': 0, 'expenses': 0})
                months[key]['expenses'] = float(row['total'])
        return [{'month': k, 'income': v['income'], 'expenses': v['expenses'], 'net': v['income'] - v['expenses']} for k, v in sorted(months.items())]

    def _export_excel(self, request, report_type, project_id):
        import openpyxl
        from openpyxl.styles import Font, Alignment

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Report'

        if report_type == 'financial':
            ws.append(['Project', 'Total Income', 'Total Expenses', 'Net'])
            projects = Project.objects.filter(is_deleted=False).filter(**_project_filter(request))
            if project_id:
                projects = projects.filter(pk=project_id)
            for project in projects:
                ti = Income.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                te = Expense.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                ws.append([project.name, float(ti), float(te), float(ti - te)])
        elif report_type == 'cash_flow':
            ws.append(['Month', 'Income', 'Expenses', 'Net'])
            for row in self._cash_flow_data(request, project_id):
                ws.append([row['month'], row['income'], row['expenses'], row['net']])
        else:  # pending_bills
            ws.append(['Project', 'Description', 'Amount', 'Due Date', 'Status'])
            qs = Bill.objects.filter(is_deleted=False, status__in=['pending', 'overdue']).select_related('project').filter(**_project_filter(request))
            if project_id:
                qs = qs.filter(project_id=project_id)
            for b in qs.order_by('due_date')[:500]:
                ws.append([b.project.name, b.description, float(b.amount), str(b.due_date), b.status])

        for row in ws.iter_rows(min_row=1, max_row=1):
            for c in row:
                c.font = Font(bold=True)
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        fname = {'financial': 'financial', 'pending_bills': 'pending-bills', 'cash_flow': 'cash-flow'}.get(report_type, 'report')
        response['Content-Disposition'] = f'attachment; filename={fname}.xlsx'
        wb.save(response)
        return response

    def _export_pdf(self, request, report_type, project_id):
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        fname = {'financial': 'financial', 'pending_bills': 'pending-bills', 'cash_flow': 'cash-flow'}.get(report_type, 'report')
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename={fname}.pdf'
        doc = SimpleDocTemplate(response, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        elements.append(Paragraph('Construx360 - Report', styles['Title']))
        elements.append(Spacer(1, 12))

        if report_type == 'financial':
            data = [['Project', 'Total Income', 'Total Expenses', 'Net']]
            projects = Project.objects.filter(is_deleted=False).filter(**_project_filter(request))
            if project_id:
                projects = projects.filter(pk=project_id)
            for project in projects:
                ti = Income.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                te = Expense.objects.filter(project=project).aggregate(Sum('amount'))['amount__sum'] or 0
                data.append([project.name, f'{float(ti):,.0f}', f'{float(te):,.0f}', f'{float(ti - te):,.0f}'])
        elif report_type == 'cash_flow':
            data = [['Month', 'Income', 'Expenses', 'Net']]
            for row in self._cash_flow_data(request, project_id):
                data.append([row['month'], f'{row["income"]:,.0f}', f'{row["expenses"]:,.0f}', f'{row["net"]:,.0f}'])
        else:
            data = [['Project', 'Description', 'Amount', 'Due Date', 'Status']]
            qs = Bill.objects.filter(is_deleted=False, status__in=['pending', 'overdue']).select_related('project').filter(**_project_filter(request))
            if project_id:
                qs = qs.filter(project_id=project_id)
            for b in qs.order_by('due_date')[:200]:
                data.append([b.project.name, b.description[:30], f'{float(b.amount):,.0f}', str(b.due_date), b.status])

        t = Table(data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ]))
        elements.append(t)
        doc.build(elements)
        return response
