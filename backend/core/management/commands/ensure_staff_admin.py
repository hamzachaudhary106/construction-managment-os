"""
Ensure a user has admin (staff) access so they can log in at /admin/.
Use when login keeps redirecting back to the login page.

  python manage.py ensure_staff_admin admin

Does not change password. After running, log in at your backend URL, e.g.:
  http://127.0.0.1:8000/admin/
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Set is_staff and is_superuser for a user so they can access Django admin.'

    def add_arguments(self, parser):
        parser.add_argument(
            'username',
            type=str,
            help='Username (e.g. admin)',
        )

    def handle(self, *args, **options):
        username = options['username'].strip()
        if not username:
            self.stderr.write(self.style.ERROR('Username is required.'))
            return

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stderr.write(self.style.ERROR(f'User "{username}" not found.'))
            return

        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.save(update_fields=['is_active', 'is_staff', 'is_superuser'])

        self.stdout.write(self.style.SUCCESS(
            f'"{username}" is now staff and superuser. Log in at /admin/ (use backend URL, e.g. http://127.0.0.1:8000/admin/).'
        ))
