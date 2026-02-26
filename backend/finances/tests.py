from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, User
from projects.models import Project
from .models import Expense


class FinanceAPITests(APITestCase):
    """
    Smoke tests for finance endpoints:
    - Ensure basic validation on amounts.
    - Enforce company scoping when creating expenses.
    """

    def setUp(self):
        self.company = Company.objects.create(name="Test Co")
        self.other_company = Company.objects.create(name="Other Co")
        self.user = User.objects.create_user(
            username="owner",
            password="testpass123",
            company=self.company,
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(self.user)
        self.project = Project.objects.create(
            name="Project A",
            company=self.company,
            created_by=self.user,
        )
        self.other_project = Project.objects.create(
            name="Project B",
            company=self.other_company,
            created_by=self.user,
        )

    def test_expense_amount_must_be_positive(self):
        url = "/api/finances/expenses/"
        payload = {
            "project": self.project.id,
            "category": "materials",
            "amount": "-100.00",
            "description": "Test negative amount",
            "date": "2026-01-01",
        }
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("amount", resp.data)

    def test_cannot_create_expense_for_other_company_project(self):
        url = "/api/finances/expenses/"
        payload = {
            "project": self.other_project.id,
            "category": "materials",
            "amount": "100.00",
            "description": "Cross-company expense",
            "date": "2026-01-01",
        }
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("project", resp.data)

    def test_create_valid_expense_for_own_company(self):
        url = "/api/finances/expenses/"
        payload = {
            "project": self.project.id,
            "category": "materials",
            "amount": "2500.00",
            "description": "Valid expense",
            "date": "2026-01-02",
        }
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Expense.objects.count(), 1)
        expense = Expense.objects.get()
        self.assertEqual(expense.project, self.project)
        self.assertEqual(str(expense.amount), "2500.00")

