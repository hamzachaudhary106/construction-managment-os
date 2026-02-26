from rest_framework import serializers
from .models import DailyLog, Issue, PunchItem


class DailyLogSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    class Meta:
        model = DailyLog
        fields = '__all__'


class IssueSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    class Meta:
        model = Issue
        fields = '__all__'


class PunchItemSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PunchItem
        fields = '__all__'
