from django.contrib import admin
from .models import Project, ProjectMilestone


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'start_date', 'end_date', 'created_at')
    list_filter = ('status',)
    search_fields = ('name', 'description')


@admin.register(ProjectMilestone)
class ProjectMilestoneAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'due_date', 'completed', 'completed_date')
    list_filter = ('completed',)
