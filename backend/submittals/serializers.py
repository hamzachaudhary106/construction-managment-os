from rest_framework import serializers
from .models import Submittal


class SubmittalSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    submittal_type_display = serializers.CharField(source='get_submittal_type_display', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Submittal
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
