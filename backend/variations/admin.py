from django.contrib import admin
from .models import Variation


@admin.register(Variation)
class VariationAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'contract', 'amount', 'status')
    list_filter = ('status',)
