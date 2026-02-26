# Multi-tenant: create default company and assign all existing null company_id records to it.

from django.db import migrations


def create_default_company_and_assign(apps, schema_editor):
    Company = apps.get_model('core', 'Company')
    User = apps.get_model('core', 'User')
    Project = apps.get_model('projects', 'Project')
    Party = apps.get_model('parties', 'Party')
    Partner = apps.get_model('partners', 'Partner')
    Equipment = apps.get_model('equipment', 'Equipment')

    default_company, _ = Company.objects.get_or_create(
        code='DEFAULT',
        defaults={'name': 'Default Company', 'is_active': True},
    )

    User.objects.filter(company_id__isnull=True).update(company_id=default_company.id)
    Project.objects.filter(company_id__isnull=True).update(company_id=default_company.id)
    Party.objects.filter(company_id__isnull=True).update(company_id=default_company.id)
    Partner.objects.filter(company_id__isnull=True).update(company_id=default_company.id)
    Equipment.objects.filter(company_id__isnull=True).update(company_id=default_company.id)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_company_is_active'),
        ('projects', '0003_project_company_project_deleted_at_and_more'),
        ('parties', '0001_initial'),
        ('partners', '0001_initial'),
        ('equipment', '0002_equipment_company'),
    ]

    operations = [
        migrations.RunPython(create_default_company_and_assign, noop_reverse),
    ]
