from rest_framework import serializers
from .models import Partner, ProjectInvestment, PartnerWithdrawal


class PartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Partner
        fields = '__all__'


class ProjectInvestmentSerializer(serializers.ModelSerializer):
    partner_name = serializers.CharField(source='partner.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = ProjectInvestment
        fields = '__all__'


class PartnerWithdrawalSerializer(serializers.ModelSerializer):
    partner_name = serializers.CharField(source='partner.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = PartnerWithdrawal
        fields = '__all__'
