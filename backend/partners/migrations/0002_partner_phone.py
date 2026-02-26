from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('partners', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='partner',
            name='phone',
            field=models.CharField(blank=True, max_length=50, help_text='WhatsApp number for this partner'),
        ),
    ]

