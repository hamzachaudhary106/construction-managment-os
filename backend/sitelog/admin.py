from django.contrib import admin
from .models import DailyLog, Issue


@admin.register(DailyLog)
class DailyLogAdmin(admin.ModelAdmin):
    list_display = ('project', 'log_date', 'manpower_count', 'weather')
    list_filter = ('log_date',)


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'status', 'severity', 'is_ncr')
    list_filter = ('status', 'severity', 'is_ncr')
