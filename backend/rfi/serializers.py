from rest_framework import serializers
from .models import RFI


class RFISerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = RFI
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
