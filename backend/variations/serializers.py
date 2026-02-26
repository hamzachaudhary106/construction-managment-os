from rest_framework import serializers
from .models import Variation


class VariationSerializer(serializers.ModelSerializer):
    contract_title = serializers.CharField(source='contract.title', read_only=True)

    class Meta:
        model = Variation
        fields = '__all__'
