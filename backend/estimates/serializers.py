from decimal import Decimal
from rest_framework import serializers
from .models import Estimate, EstimateItem, ESTIMATE_UNITS, ESTIMATE_CATEGORIES


class EstimateItemSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    unit_display = serializers.CharField(source='get_unit_display', read_only=True)

    class Meta:
        model = EstimateItem
        fields = [
            'id', 'estimate', 'category', 'category_display',
            'description', 'quantity', 'unit', 'unit_display',
            'unit_rate', 'amount',
        ]
        read_only_fields = ['amount']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_unit_rate(self, value):
        if value < 0:
            raise serializers.ValidationError("Unit rate cannot be negative.")
        return value


class EstimateSerializer(serializers.ModelSerializer):
    items = EstimateItemSerializer(many=True, read_only=True)
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    overhead_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    contingency_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Estimate
        fields = [
            'id', 'project', 'phase', 'name', 'version', 'status',
            'estimate_date', 'notes', 'overhead_percent', 'contingency_percent',
            'subtotal', 'overhead_amount', 'contingency_amount', 'total',
            'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['subtotal', 'overhead_amount', 'contingency_amount', 'total']


class EstimateListSerializer(serializers.ModelSerializer):
    """Light serializer for list view (no nested items)."""
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Estimate
        fields = [
            'id', 'project', 'phase', 'name', 'version', 'status',
            'estimate_date', 'subtotal', 'total', 'created_at',
        ]


class EstimateWriteSerializer(serializers.ModelSerializer):
    """For create/update without computed fields. Project/phase optional (standalone scenarios)."""
    class Meta:
        model = Estimate
        fields = [
            'id', 'project', 'phase', 'name', 'version', 'status',
            'estimate_date', 'notes', 'overhead_percent', 'contingency_percent',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {'project': {'required': False}, 'phase': {'required': False}}

    def validate_overhead_percent(self, value):
        if value < 0 or value > Decimal('100'):
            raise serializers.ValidationError("Overhead percent must be between 0 and 100.")
        return value

    def validate_contingency_percent(self, value):
        if value < 0 or value > Decimal('100'):
            raise serializers.ValidationError("Contingency percent must be between 0 and 100.")
        return value
