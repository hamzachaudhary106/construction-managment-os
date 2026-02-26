# Seed quick-calculator rates from Pakistan construction cost guide (Rs/sft).
# Categories: Grey Structure Only | Complete Standard | Complete Mid-Range | Complete Premium
# Modes: With Materials (Contractor + Materials) | Without Materials (Labour Only)
from decimal import Decimal
from django.db import migrations
from datetime import date

# (construction_type, construction_mode) -> (rate_min, rate_max, rate_per_sft midpoint)
# From reference: Grey 3000-3600 / 1500-2500; Standard 5000-6500 / varies; Mid 6500-8000 / varies; Premium 8000+ / varies
RATE_TABLE = [
    ('grey_structure_only', 'with_material', Decimal('3000'), Decimal('3600'), Decimal('3300')),
    ('grey_structure_only', 'without_material', Decimal('1500'), Decimal('2500'), Decimal('2000')),
    ('complete_standard', 'with_material', Decimal('5000'), Decimal('6500'), Decimal('5750')),
    ('complete_standard', 'without_material', Decimal('2000'), Decimal('3500'), Decimal('2750')),
    ('complete_mid_range', 'with_material', Decimal('6500'), Decimal('8000'), Decimal('7250')),
    ('complete_mid_range', 'without_material', Decimal('3000'), Decimal('4000'), Decimal('3500')),
    ('complete_premium', 'with_material', Decimal('8000'), Decimal('10000'), Decimal('9000')),
    ('complete_premium', 'without_material', Decimal('3500'), Decimal('4500'), Decimal('4000')),
]

CITIES = [
    'lahore', 'karachi', 'islamabad', 'rawalpindi', 'faisalabad', 'multan',
    'peshawar', 'quetta', 'sialkot', 'gujranwala', 'other',
]

CITY_FACTOR = {
    'lahore': Decimal('1.00'), 'karachi': Decimal('1.05'), 'islamabad': Decimal('1.08'),
    'rawalpindi': Decimal('1.02'), 'faisalabad': Decimal('0.98'), 'multan': Decimal('0.96'),
    'peshawar': Decimal('1.02'), 'quetta': Decimal('0.99'), 'sialkot': Decimal('0.97'),
    'gujranwala': Decimal('0.95'), 'other': Decimal('1.00'),
}


def seed_guide_rates(apps, schema_editor):
    ConstructionRate = apps.get_model('estimates', 'ConstructionRate')
    effective = date.today()
    # Remove all system default rates so we can seed the new categories
    ConstructionRate.objects.filter(company_id__isnull=True).delete()
    for city in CITIES:
        factor = CITY_FACTOR.get(city, Decimal('1.00'))
        for ctype, cmode, rmin, rmax, rmid in RATE_TABLE:
            ConstructionRate.objects.create(
                company_id=None,
                city=city,
                construction_type=ctype,
                construction_mode=cmode,
                rate_per_sft=(rmid * factor).quantize(Decimal('0.01')),
                rate_min=(rmin * factor).quantize(Decimal('0.01')),
                rate_max=(rmax * factor).quantize(Decimal('0.01')),
                effective_date=effective,
                notes='From construction cost guide (Rs/sft)',
            )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('estimates', '0005_add_rate_range_and_categories'),
    ]

    operations = [
        migrations.RunPython(seed_guide_rates, noop),
    ]
