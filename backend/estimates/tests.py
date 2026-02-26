from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Company, User
from projects.models import Project
from .models import ConstructionRate, Estimate, EstimateItem


class QuickCalcAndEstimateTests(APITestCase):
    """
    Unit + smoke tests for cost estimation:
    - Quick calculator math and validation.
    - Estimate subtotal/overhead/contingency/total properties.
    """

    def setUp(self):
        self.company = Company.objects.create(name="Estimates Co")
        self.user = User.objects.create_user(
            username="estimator",
            password="testpass123",
            company=self.company,
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(self.user)
        self.project = Project.objects.create(
            name="Sample Project",
            company=self.company,
            created_by=self.user,
        )

        # Merchant-specific construction rate for quick calculator
        ConstructionRate.objects.create(
            company=self.company,
            city="lahore",
            construction_type="complete_standard",
            construction_mode="without_material",
            rate_per_sft=Decimal("5000.00"),
            effective_date=timezone.now().date(),
        )

    def test_quick_calc_rejects_too_small_area(self):
        url = "/api/estimates/quick-calc/"
        resp = self.client.post(
            url,
            {
                "city": "lahore",
                "covered_area_sft": 0,
                "construction_type": "complete_standard",
                "construction_mode": "without_material",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

    def test_quick_calc_computes_expected_totals(self):
        """
        For area A, rate R, overhead p1, contingency p2:
        subtotal = A * R
        overhead = subtotal * p1/100
        contingency = (subtotal + overhead) * p2/100
        total = subtotal + overhead + contingency
        """
        url = "/api/estimates/quick-calc/"
        covered = Decimal("1000")  # sft
        rate = Decimal("5000.00")
        overhead_percent = Decimal("10")
        contingency_percent = Decimal("5")

        resp = self.client.post(
            url,
            {
                "city": "lahore",
                "covered_area_sft": str(covered),
                "construction_type": "complete_standard",
                "construction_mode": "without_material",
                "overhead_percent": str(overhead_percent),
                "contingency_percent": str(contingency_percent),
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        subtotal = covered * rate
        overhead = (subtotal * overhead_percent / Decimal("100")).quantize(Decimal("0.01"))
        base_for_contingency = subtotal + overhead
        contingency = (base_for_contingency * contingency_percent / Decimal("100")).quantize(
            Decimal("0.01")
        )
        total = (subtotal + overhead + contingency).quantize(Decimal("0"))

        data = resp.data
        self.assertEqual(Decimal(data["subtotal"]), subtotal.quantize(Decimal("0.01")))
        self.assertEqual(Decimal(data["overhead"]), overhead)
        self.assertEqual(Decimal(data["contingency"]), contingency)
        self.assertEqual(Decimal(data["total"]), total)

    def test_estimate_totals_match_items_and_percentages(self):
        estimate = Estimate.objects.create(
            company=self.company,
            project=self.project,
            name="BOQ Test",
            overhead_percent=Decimal("10.00"),
            contingency_percent=Decimal("5.00"),
        )
        EstimateItem.objects.create(
            estimate=estimate,
            category="concrete",
            description="Item 1",
            quantity=Decimal("10"),
            unit="sft",
            unit_rate=Decimal("1000.00"),
        )
        EstimateItem.objects.create(
            estimate=estimate,
            category="steel",
            description="Item 2",
            quantity=Decimal("5"),
            unit="sft",
            unit_rate=Decimal("2000.00"),
        )

        # Reload from DB to ensure computed properties use persisted values
        estimate = Estimate.objects.get(pk=estimate.pk)

        subtotal = sum((item.amount for item in estimate.items.all()), Decimal("0"))
        self.assertEqual(estimate.subtotal, subtotal)

        overhead_expected = (subtotal * Decimal("10.00") / Decimal("100")).quantize(
            Decimal("0.01")
        )
        self.assertEqual(estimate.overhead_amount, overhead_expected)

        base_for_contingency = subtotal + overhead_expected
        contingency_expected = (
            base_for_contingency * Decimal("5.00") / Decimal("100")
        ).quantize(Decimal("0.01"))
        self.assertEqual(estimate.contingency_amount, contingency_expected)

        total_expected = (subtotal + overhead_expected + contingency_expected).quantize(
            Decimal("0.01")
        )
        self.assertEqual(estimate.total, total_expected)

