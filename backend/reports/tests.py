from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status

from core.models import Company, Client, User
from projects.models import Project


class ReportsOverviewScopingTests(APITestCase):
    """
    Smoke tests to ensure /api/reports/overview/ respects
    company and client scoping for multi-tenant safety.
    """

    def setUp(self):
        # Two companies with a project each
        self.company_a = Company.objects.create(name="Company A")
        self.company_b = Company.objects.create(name="Company B")

        self.user_company_a = User.objects.create_user(
            username="owner_a",
            password="testpass123",
            company=self.company_a,
            role=User.Role.ADMIN,
        )

        self.project_a = Project.objects.create(
            name="Project A",
            company=self.company_a,
            created_by=self.user_company_a,
        )
        self.project_b = Project.objects.create(
            name="Project B",
            company=self.company_b,
            created_by=self.user_company_a,
        )

    def test_overview_scoped_by_company(self):
        """User tied to company A should only see Company A projects."""
        self.client.force_authenticate(self.user_company_a)
        resp = self.client.get("/api/reports/overview/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in resp.data}
        self.assertIn(self.project_a.id, ids)
        self.assertNotIn(self.project_b.id, ids)

    def test_overview_scoped_by_client(self):
        """
        Client user should only see projects for their client, even if user.company is set.
        """
        client = Client.objects.create(company=self.company_a, name="Owner One")
        user_client = User.objects.create_user(
            username="client_user",
            password="testpass123",
            company=self.company_a,
            client=client,
            role=User.Role.STAFF,
        )

        # Project linked to this client and another project without client
        project_client = Project.objects.create(
            name="Client Project",
            company=self.company_a,
            client=client,
            created_by=self.user_company_a,
        )
        project_other = Project.objects.create(
            name="Other Project",
            company=self.company_a,
            created_by=self.user_company_a,
        )

        self.client.force_authenticate(user_client)
        resp = self.client.get("/api/reports/overview/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in resp.data}
        self.assertIn(project_client.id, ids)
        self.assertNotIn(project_other.id, ids)
