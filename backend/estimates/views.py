from decimal import Decimal
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from django_filters.rest_framework import DjangoFilterBackend
from .models import Estimate, EstimateItem, ConstructionRate, ESTIMATE_UNITS, ESTIMATE_CATEGORIES, CONSTRUCTION_CATEGORIES, CONSTRUCTION_MODES
from .serializers import (
    EstimateSerializer,
    EstimateListSerializer,
    EstimateWriteSerializer,
    EstimateItemSerializer,
)

# Limits for validation (trustworthy calculator)
MIN_COVERED_SFT = Decimal('1')
MAX_COVERED_SFT = Decimal('50000000')  # 50M sft
MAX_PERCENT = Decimal('100')


def _estimates_queryset(request):
    """Standalone: scope by company (company_id or project__company_id for legacy)."""
    qs = Estimate.objects.prefetch_related('items').select_related('project', 'phase', 'company')
    if getattr(request.user, 'company_id', None):
        qs = qs.filter(
            Q(company_id=request.user.company_id) | Q(project__company_id=request.user.company_id)
        )
    return qs


class EstimateListCreateView(generics.ListCreateAPIView):
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('status', 'project', 'phase')

    def get_queryset(self):
        return _estimates_queryset(self.request)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EstimateWriteSerializer
        return EstimateListSerializer

    def perform_create(self, serializer):
        company_id = getattr(self.request.user, 'company_id', None)
        project = serializer.validated_data.get('project')
        if project:
            company_id = project.company_id
        elif company_id is None:
            pass  # allow save without company (e.g. superuser)
        serializer.save(company_id=company_id)


class EstimateDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EstimateSerializer

    def get_queryset(self):
        return _estimates_queryset(self.request)

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return EstimateWriteSerializer
        return EstimateSerializer


def _item_queryset(request, estimate_id):
    qs = EstimateItem.objects.filter(estimate_id=estimate_id)
    if getattr(request.user, 'company_id', None):
        qs = qs.filter(
            Q(estimate__company_id=request.user.company_id)
            | Q(estimate__project__company_id=request.user.company_id)
        )
    return qs


class EstimateItemListCreateView(generics.ListCreateAPIView):
    serializer_class = EstimateItemSerializer

    def get_queryset(self):
        return _item_queryset(self.request, self.kwargs['estimate_id'])

    def perform_create(self, serializer):
        serializer.save(estimate_id=self.kwargs['estimate_id'])


class EstimateItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EstimateItemSerializer

    def get_queryset(self):
        return _item_queryset(self.request, self.kwargs['estimate_id'])


class PakistanEstimateConstantsView(APIView):
    """Pakistan standard units and categories for cost estimation (read-only)."""
    def get(self, request):
        return Response({
            'currency': 'PKR',
            'units': [{'value': u[0], 'label': u[1]} for u in ESTIMATE_UNITS],
            'categories': [{'value': c[0], 'label': c[1]} for c in ESTIMATE_CATEGORIES],
        })


def _get_rate_for_quick_calc(request: Request, city: str, construction_type: str, construction_mode: str):
    """Resolve rate: merchant-specific first, then system default. Latest effective_date <= today."""
    today = timezone.now().date()
    company_id = getattr(request.user, 'company_id', None)
    qs = ConstructionRate.objects.filter(
        city=city,
        construction_type=construction_type,
        construction_mode=construction_mode,
        effective_date__lte=today,
    ).order_by('-effective_date')
    # Prefer company-specific
    if company_id:
        rate_obj = qs.filter(company_id=company_id).first()
        if rate_obj:
            return rate_obj, 'merchant'
    rate_obj = qs.filter(company_id__isnull=True).first()
    if rate_obj:
        return rate_obj, 'default'
    return None, None


def _latest_rate_matrix(qs):
    """Build dict (city, type, mode) -> { rate_per_sft, rate_min, rate_max, effective_date } with latest effective_date only."""
    matrix = {}
    for r in qs:
        key = (r['city'], r['construction_type'], r['construction_mode'])
        if key not in matrix or r['effective_date'] > matrix[key]['effective_date']:
            matrix[key] = {
                'rate_per_sft': r['rate_per_sft'],
                'rate_min': r.get('rate_min'),
                'rate_max': r.get('rate_max'),
                'effective_date': r['effective_date'],
            }
    return matrix


class QuickCalcRatesView(APIView):
    """Returns cities, categories, and rate matrix for quick calculator (from construction cost guide)."""
    def get(self, request):
        today = timezone.now().date()
        company_id = getattr(request.user, 'company_id', None)
        qs = ConstructionRate.objects.filter(effective_date__lte=today).order_by('-effective_date')
        default_rates = list(qs.filter(company_id__isnull=True).values(
            'city', 'construction_type', 'construction_mode',
            'rate_per_sft', 'rate_min', 'rate_max', 'effective_date'
        ))
        default_matrix = _latest_rate_matrix(default_rates)
        cities = sorted(set(r['city'] for r in default_rates))
        latest_date = max((r['effective_date'] for r in default_rates), default=today)
        result = {
            'currency': 'PKR',
            'cities': cities,
            'construction_categories': [{'value': c[0], 'label': c[1]} for c in CONSTRUCTION_CATEGORIES],
            'construction_modes': [{'value': m[0], 'label': m[1]} for m in CONSTRUCTION_MODES],
            'rates_effective_date': str(latest_date),
            'rate_matrix': {f"{c}_{t}_{m}": v for (c, t, m), v in default_matrix.items()},
            'disclaimer': 'This estimate is for planning only. Actual costs depend on site conditions, design, and market. Obtain detailed quotes for binding contracts.',
        }
        if company_id:
            merchant_rates = list(qs.filter(company_id=company_id).values(
                'city', 'construction_type', 'construction_mode',
                'rate_per_sft', 'rate_min', 'rate_max', 'effective_date'
            ))
            result['merchant_rate_matrix'] = {
                f"{r['city']}_{r['construction_type']}_{r['construction_mode']}": {
                    'rate_per_sft': r['rate_per_sft'], 'rate_min': r.get('rate_min'), 'rate_max': r.get('rate_max'),
                    'effective_date': r['effective_date'],
                } for r in merchant_rates
            }
        return Response(result)


class QuickCalcCalculateView(APIView):
    """Server-side quick calculator: one source of truth, consistent rounding, validation."""
    def post(self, request):
        city = (request.data.get('city') or '').strip().lower() or 'lahore'
        try:
            covered_sft = Decimal(str(request.data.get('covered_area_sft', 0)))
        except Exception:
            return Response({'error': 'Invalid covered_area_sft.'}, status=400)
        construction_type = request.data.get('construction_type') or 'complete_standard'
        construction_mode = request.data.get('construction_mode') or 'without_material'
        valid_types = {c[0] for c in CONSTRUCTION_CATEGORIES}
        valid_modes = {m[0] for m in CONSTRUCTION_MODES}
        if construction_type not in valid_types:
            construction_type = 'complete_standard'
        if construction_mode not in valid_modes:
            construction_mode = 'without_material'
        try:
            overhead_percent = Decimal(str(request.data.get('overhead_percent', 0)))
            contingency_percent = Decimal(str(request.data.get('contingency_percent', 5)))
        except Exception:
            overhead_percent = Decimal('0')
            contingency_percent = Decimal('5')
        if overhead_percent < 0 or overhead_percent > MAX_PERCENT:
            overhead_percent = Decimal('0')
        if contingency_percent < 0 or contingency_percent > MAX_PERCENT:
            contingency_percent = Decimal('5')

        if covered_sft < MIN_COVERED_SFT:
            return Response({'error': 'Covered area must be at least 1 sq. ft.'}, status=400)
        if covered_sft > MAX_COVERED_SFT:
            return Response({'error': 'Covered area exceeds maximum allowed.'}, status=400)

        rate_obj, rate_source = _get_rate_for_quick_calc(request, city, construction_type, construction_mode)
        if not rate_obj:
            return Response({'error': f'No rate found for {city} / {construction_type} / {construction_mode}. Please configure rates in admin.'}, status=404)

        rate_per_sft = rate_obj.rate_per_sft
        subtotal = (covered_sft * rate_per_sft).quantize(Decimal('0.01'))
        overhead = (subtotal * overhead_percent / Decimal('100')).quantize(Decimal('0.01'))
        base_for_contingency = subtotal + overhead
        contingency = (base_for_contingency * contingency_percent / Decimal('100')).quantize(Decimal('0.01'))
        total = (subtotal + overhead + contingency).quantize(Decimal('0'))

        formula_steps = [
            f"Covered area: {covered_sft} sft × Rate: {rate_per_sft} PKR/sft = Subtotal: {subtotal} PKR",
            f"Overhead ({overhead_percent}% of subtotal) = {overhead} PKR",
            f"Contingency ({contingency_percent}% of subtotal + overhead) = {contingency} PKR",
            f"Total = Subtotal + Overhead + Contingency = {total} PKR",
        ]
        payload = {
            'subtotal': str(subtotal),
            'overhead': str(overhead),
            'contingency': str(contingency),
            'total': str(total),
            'rate_per_sft': str(rate_per_sft),
            'rate_effective_date': str(rate_obj.effective_date),
            'rate_source': rate_source or 'default',
            'formula_steps': formula_steps,
            'covered_area_sft': str(covered_sft),
        }
        if rate_obj.rate_min is not None:
            payload['rate_min'] = str(rate_obj.rate_min)
        if rate_obj.rate_max is not None:
            payload['rate_max'] = str(rate_obj.rate_max)
        return Response(payload)
