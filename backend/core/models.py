from django.contrib.auth.models import AbstractUser
from django.db import models


class Company(models.Model):
    """A tenant/merchant in the multi-tenant system (construction company using the software)."""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Merchant'
        verbose_name_plural = 'Merchants'

    def __str__(self):
        return self.name


class Client(models.Model):
    """Client/owner for projects (e.g. for client portal)."""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='clients')
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        MANAGER = 'manager', 'Manager'
        STAFF = 'staff', 'Staff'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STAFF)
    phone = models.CharField(max_length=20, blank=True)
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    client = models.ForeignKey(
        Client, on_delete=models.SET_NULL, null=True, blank=True, related_name='users',
        help_text='If set, user is a client and sees only projects for this client'
    )

    def is_admin_user(self):
        return self.role == self.Role.ADMIN or self.is_superuser

    def is_manager_or_above(self):
        return self.role in (self.Role.ADMIN, self.Role.MANAGER) or self.is_superuser
