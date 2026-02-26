from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_notificationsettings'),
    ]

    operations = [
        migrations.RemoveField(model_name='notificationsettings', name='email_bills'),
        migrations.RemoveField(model_name='notificationsettings', name='email_contracts'),
        migrations.RemoveField(model_name='notificationsettings', name='email_milestones'),
        migrations.RemoveField(model_name='notificationsettings', name='email_transfers'),
        migrations.RemoveField(model_name='notificationsettings', name='email_wht'),
    ]
