from rest_framework import serializers
from .models import ProjectDocument


class ProjectDocumentSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)

    class Meta:
        model = ProjectDocument
        fields = '__all__'
