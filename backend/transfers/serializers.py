from rest_framework import serializers
from .models import FundTransfer
from projects.serializers import ProjectSerializer


class FundTransferSerializer(serializers.ModelSerializer):
    from_project_name = serializers.CharField(source='from_project.name', read_only=True)
    to_project_name = serializers.CharField(source='to_project.name', read_only=True)

    class Meta:
        model = FundTransfer
        fields = '__all__'
