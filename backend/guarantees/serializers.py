from rest_framework import serializers
from .models import BankGuarantee


class BankGuaranteeSerializer(serializers.ModelSerializer):
    guarantee_type_display = serializers.CharField(source='get_guarantee_type_display', read_only=True)

    class Meta:
        model = BankGuarantee
        fields = '__all__'
