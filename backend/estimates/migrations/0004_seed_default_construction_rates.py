# Default quick-calculator rates (PKR/sft). Lahore base; other cities use factor.
from decimal import Decimal
from django.db import migrations

# Base rates for Lahore (company_id = None): type_mode -> PKR/sft
BASE_LAHORE = {
    ('grey_structure', 'with_material'): Decimal('1200.00'),
    ('grey_structure', 'without_material'): Decimal('650.00'),
    ('complete', 'with_material'): Decimal('2200.00'),
    ('complete', 'without_material'): Decimal('1150.00'),
}

CITIES_FACTOR = [
    ('lahore', Decimal('1.00')),
    ('karachi', Decimal('1.05')),
    ('islamabad', Decimal('1.08')),
    ('rawalpindi', Decimal('1.02')),
    ('faisalabad', Decimal('0.98')),
    ('multan', Decimal('0.96')),
    ('peshawar', Decimal('1.02')),
    ('quetta', Decimal('0.99')),
    ('sialkot', Decimal('0.97')),
    ('gujranwala', Decimal('0.95')),
    ('other', Decimal('1.00')),
]


def seed_default_rates(apps, schema_editor):
    ConstructionRate = apps.get_model('estimates', 'ConstructionRate')
    from datetime import date
    effective = date.today()
    for city, factor in CITIES_FACTOR:
        for (ctype, cmode), base in BASE_LAHORE.items():
            rate = (base * factor).quantize(Decimal('0.01'))
            ConstructionRate.objects.get_or_create(
                company_id=None,
                city=city,
                construction_type=ctype,
                construction_mode=cmode,
                defaults={'rate_per_sft': rate, 'effective_date': effective, 'notes': 'Default rate'},
            )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('estimates', '0003_construction_rates'),
    ]

    operations = [
        migrations.RunPython(seed_default_rates, noop),
    ]
