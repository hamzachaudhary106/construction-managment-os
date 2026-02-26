from django.contrib import admin
from .models import Party


@admin.register(Party)
class PartyAdmin(admin.ModelAdmin):
    list_display = ('name', 'party_type', 'contact_person', 'phone')
    list_filter = ('party_type',)
