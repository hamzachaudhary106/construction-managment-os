from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Company, Client


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ('id', 'name', 'code', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ('id', 'company', 'name', 'contact_person', 'email', 'phone', 'address', 'notes', 'created_at')
        read_only_fields = ('id', 'created_at')


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False)
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_code = serializers.CharField(source='company.code', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'password', 'first_name', 'last_name',
            'role', 'phone', 'is_staff', 'company', 'company_name', 'company_code', 'client',
        )
        read_only_fields = ('id', 'is_staff')

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name', 'role', 'phone', 'company', 'client')

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Allow login with either username OR email (case-insensitive).
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # You can put extra claims here if needed
        token["role"] = user.role
        token["company_id"] = user.company_id
        return token

    def validate(self, attrs):
        username_field = User.USERNAME_FIELD
        username = attrs.get(username_field)
        password = attrs.get("password")

        # Try username as given
        user = authenticate(username=username, password=password)

        # If that fails, try email-based auth
        if user is None and "@" in str(username or ""):
            try:
                u = User.objects.get(email__iexact=username)
                user = authenticate(username=u.username, password=password)
            except User.DoesNotExist:
                user = None

        if user is None:
            raise serializers.ValidationError({"detail": "No active account found with the given credentials."})

        if not user.is_active:
            raise serializers.ValidationError({"detail": "This account is inactive."})

        data = super().validate({username_field: user.username, "password": password})
        return data
