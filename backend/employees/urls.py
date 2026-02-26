from django.urls import path

from .views import (
    EmployeeListCreateView,
    EmployeeDetailView,
    PayrollPeriodListCreateView,
    PayrollPeriodDetailView,
    PayrollPeriodMarkPaidView,
    PayrollEntryListUpdateView,
    PayrollEntryBulkUpdateView,
    PayslipPDFView,
    PayslipSendWhatsAppView,
)

urlpatterns = [
    path('employees/', EmployeeListCreateView.as_view(), name='employee-list'),
    path('employees/<int:pk>/', EmployeeDetailView.as_view(), name='employee-detail'),
    path('payroll-periods/', PayrollPeriodListCreateView.as_view(), name='payroll-period-list'),
    path('payroll-periods/<int:pk>/', PayrollPeriodDetailView.as_view(), name='payroll-period-detail'),
    path('payroll-periods/<int:pk>/mark-paid/', PayrollPeriodMarkPaidView.as_view(), name='payroll-period-mark-paid'),
    path('payroll-entries/', PayrollEntryListUpdateView.as_view(), name='payroll-entry-list'),
    path('payroll-entries/bulk-update/', PayrollEntryBulkUpdateView.as_view(), name='payroll-entry-bulk-update'),
    path('payroll-entries/<int:pk>/payslip/', PayslipPDFView.as_view(), name='payroll-entry-payslip'),
    path('payroll-entries/<int:pk>/send-payslip-whatsapp/', PayslipSendWhatsAppView.as_view(), name='payroll-entry-payslip-whatsapp'),
]

