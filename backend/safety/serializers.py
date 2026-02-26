from rest_framework import serializers
from .models import SafetyIncident, ToolboxTalk


class SafetyIncidentSerializer(serializers.ModelSerializer):
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = SafetyIncident
        fields = '__all__'
        read_only_fields = ('created_at',)


class ToolboxTalkSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = ToolboxTalk
        fields = '__all__'
        read_only_fields = ('created_at',)
