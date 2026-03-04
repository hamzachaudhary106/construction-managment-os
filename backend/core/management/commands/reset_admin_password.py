"""
Reset password for a user (e.g. admin) so you can log in again.
Use when you're locked out or forgot your password.

  python manage.py reset_admin_password
  python manage.py reset_admin_password myusername

If the user exists but is inactive, they will be reactivated.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Reset a user password and ensure the account is active (for admin login recovery).'

    def add_arguments(self, parser):
        parser.add_argument(
            'username',
            nargs='?',
            type=str,
            help='Username to reset (e.g. admin). If omitted, you will be prompted.',
        )

    def handle(self, *args, **options):
        username = options.get('username')
        if not username:
            username = input('Username: ').strip()
        if not username:
            self.stderr.write(self.style.ERROR('Username is required.'))
            return

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stderr.write(self.style.ERROR(f'User "{username}" not found.'))
            return

        password = input('New password: ')
        if not password:
            self.stderr.write(self.style.ERROR('Password is required.'))
            return
        password2 = input('Confirm new password: ')
        if password != password2:
            self.stderr.write(self.style.ERROR('Passwords do not match.'))
            return

        user.set_password(password)
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.save(update_fields=['password', 'is_active', 'is_staff', 'is_superuser'])

        self.stdout.write(self.style.SUCCESS(
            f'Password for "{username}" has been reset and admin access (is_staff, is_superuser) enabled. You can log in at /admin/ now.'
        ))
