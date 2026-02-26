from rest_framework import serializers
from .models import Notification, NotificationSettings


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSettings
        fields = [
            'whatsapp_bills',
            'whatsapp_contracts',
            'whatsapp_milestones',
            'whatsapp_transfers',
            'whatsapp_wht',
        ]
