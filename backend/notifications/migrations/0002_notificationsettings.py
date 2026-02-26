from django.db import migrations, models
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email_bills', models.BooleanField(default=True)),
                ('email_contracts', models.BooleanField(default=True)),
                ('email_milestones', models.BooleanField(default=True)),
                ('email_transfers', models.BooleanField(default=True)),
                ('email_wht', models.BooleanField(default=True)),
                ('whatsapp_bills', models.BooleanField(default=False)),
                ('whatsapp_contracts', models.BooleanField(default=False)),
                ('whatsapp_milestones', models.BooleanField(default=False)),
                ('whatsapp_transfers', models.BooleanField(default=False)),
                ('whatsapp_wht', models.BooleanField(default=False)),
                ('user', models.OneToOneField(on_delete=models.deletion.CASCADE, related_name='notification_settings', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]

