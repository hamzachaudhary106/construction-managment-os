from django.urls import path
from .views import (
    BudgetListCreateView, BudgetDetailView,
    ExpenseListCreateView, ExpenseDetailView,
    IncomeListCreateView, IncomeDetailView,
)

urlpatterns = [
    path('budgets/', BudgetListCreateView.as_view(), name='budget-list'),
    path('budgets/<int:pk>/', BudgetDetailView.as_view(), name='budget-detail'),
    path('expenses/', ExpenseListCreateView.as_view(), name='expense-list'),
    path('expenses/<int:pk>/', ExpenseDetailView.as_view(), name='expense-detail'),
    path('incomes/', IncomeListCreateView.as_view(), name='income-list'),
    path('incomes/<int:pk>/', IncomeDetailView.as_view(), name='income-detail'),
]
