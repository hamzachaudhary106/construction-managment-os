from django.urls import path
from .views import (
    ReportsOverviewView, ProjectDashboardView, ProjectHistoryView, FinancialReportView,
    PendingBillsReportView, CashFlowReportView, CashFlowForecastView,
    PayablesAgingView, ExportReportView, DashboardSummaryView, WHTReportView,
    CompanyDashboardView, CostForecastView, ExportReportSendWhatsAppView,
    ClientOverviewView, ClientProjectDetailView,
)

urlpatterns = [
    path('overview/', ReportsOverviewView.as_view(), name='reports-overview'),
    path('company-dashboard/', CompanyDashboardView.as_view(), name='company-dashboard'),
    path('cost-forecast/', CostForecastView.as_view(), name='cost-forecast'),
    path('dashboard-summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('dashboard/<int:project_id>/', ProjectDashboardView.as_view(), name='project-dashboard'),
    path('project/<int:project_id>/history/', ProjectHistoryView.as_view(), name='project-history'),
    path('financial/', FinancialReportView.as_view(), name='financial-report'),
    path('pending-bills/', PendingBillsReportView.as_view(), name='pending-bills-report'),
    path('cash-flow/', CashFlowReportView.as_view(), name='cash-flow-report'),
    path('cash-flow-forecast/', CashFlowForecastView.as_view(), name='cash-flow-forecast'),
    path('payables-aging/', PayablesAgingView.as_view(), name='payables-aging'),
    path('wht/', WHTReportView.as_view(), name='wht-report'),
    path('export/', ExportReportView.as_view(), name='export-report'),
    path('export/send-whatsapp/', ExportReportSendWhatsAppView.as_view(), name='export-report-send-whatsapp'),
    path('client/overview/', ClientOverviewView.as_view(), name='client-overview'),
    path('client/projects/<int:project_id>/', ClientProjectDetailView.as_view(), name='client-project-detail'),
]
