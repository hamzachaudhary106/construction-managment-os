from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bills', '0004_add_missing_features'),
    ]

    operations = [
        migrations.AddField(
            model_name='bill',
            name='billed_to_name',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='bill',
            name='billed_to_phone',
            field=models.CharField(blank=True, max_length=50, help_text='WhatsApp number for billed party'),
        ),
    ]

