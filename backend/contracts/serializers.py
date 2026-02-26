from rest_framework import serializers
from .models import Contract, ContractPaymentSchedule


class ContractPaymentScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractPaymentSchedule
        fields = '__all__'


class ContractSerializer(serializers.ModelSerializer):
    payment_schedules = ContractPaymentScheduleSerializer(many=True, read_only=True)
    party_name = serializers.SerializerMethodField()

    def get_party_name(self, obj):
        return obj.party.name if obj.party else None

    class Meta:
        model = Contract
        fields = '__all__'


class ContractPaymentScheduleDetailSerializer(serializers.ModelSerializer):
    contract_title = serializers.CharField(source='contract.title', read_only=True)

    class Meta:
        model = ContractPaymentSchedule
        fields = '__all__'
