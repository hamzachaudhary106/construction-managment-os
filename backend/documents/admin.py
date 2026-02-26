from django.contrib import admin
from .models import ProjectDocument


@admin.register(ProjectDocument)
class ProjectDocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'doc_type', 'revision')
    list_filter = ('doc_type',)
