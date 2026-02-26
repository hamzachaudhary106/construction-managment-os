from rest_framework import serializers
from .models import Party


class PartySerializer(serializers.ModelSerializer):
    party_type_display = serializers.CharField(source='get_party_type_display', read_only=True)

    class Meta:
        model = Party
        fields = '__all__'
