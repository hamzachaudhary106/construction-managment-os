from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.db.models import Q
from .models import User, Company, Client
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    CompanySerializer,
    ClientSerializer,
    EmailOrUsernameTokenObtainPairSerializer,
)
from .tenant_utils import get_company_id


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.is_admin_user()


def _cookie_params(max_age: int):
  """
  Shared cookie settings for auth cookies.
  """
  secure = not settings.DEBUG
  return {
      "httponly": True,
      "secure": secure,
      "samesite": "Lax",
      "max_age": max_age,
  }


class JWTLoginView(TokenObtainPairView):
    """
    Obtain access/refresh tokens and set them in secure HttpOnly cookies.
    Response body does not expose the tokens (frontend uses /auth/me/).
    """

    serializer_class = EmailOrUsernameTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        data = response.data
        access = data.get("access")
        refresh = data.get("refresh")

        if access and refresh:
            # Access token cookie (short-lived)
            access_lifetime = settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
            response.set_cookie(
                "access_token",
                access,
                **_cookie_params(int(access_lifetime.total_seconds())),
            )
            # Refresh token cookie (longer-lived)
            refresh_lifetime = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
            response.set_cookie(
                "refresh_token",
                refresh,
                **_cookie_params(int(refresh_lifetime.total_seconds())),
            )

            # Do not expose tokens in response body
            response.data = {"detail": "login_ok"}

        return response


class CookieTokenRefreshView(TokenRefreshView):
    """
    Refresh access/refresh tokens using HttpOnly refresh cookie.
    Frontend just calls this endpoint; no token is handled in JS.
    """

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get("refresh") or request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response({"detail": "No refresh token"}, status=401)

        # Inject refresh token into request data for parent implementation
        request.data["refresh"] = refresh_token
        response = super().post(request, *args, **kwargs)

        data = response.data
        access = data.get("access")
        new_refresh = data.get("refresh")

        if access:
            access_lifetime = settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
            response.set_cookie(
                "access_token",
                access,
                **_cookie_params(int(access_lifetime.total_seconds())),
            )
        if new_refresh:
            refresh_lifetime = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
            response.set_cookie(
                "refresh_token",
                new_refresh,
                **_cookie_params(int(refresh_lifetime.total_seconds())),
            )

        # Do not expose tokens in body
        response.data = {"detail": "refresh_ok"}
        return response


class LogoutView(APIView):
    """
    Logout current user: blacklist refresh token (if possible) and clear cookies.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # Ignore blacklist errors to avoid blocking logout
                pass

        response = Response({"detail": "logout_ok"})
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        return response


class CompanyListView(generics.ListAPIView):
    """List companies (read-only). Superuser sees all; others see only their own. Create/edit companies in Django admin."""
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Company.objects.all().order_by('name')
        if not self.request.user.is_superuser:
            cid = get_company_id(self.request)
            if cid is not None:
                qs = qs.filter(id=cid)
            else:
                qs = qs.none()
        return qs


class CompanyDetailView(generics.RetrieveAPIView):
    """Retrieve a company (read-only). Create/edit companies in Django admin."""
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Company.objects.all()
        if not self.request.user.is_superuser:
            cid = get_company_id(self.request)
            if cid is not None:
                qs = qs.filter(id=cid)
            else:
                qs = qs.none()
        return qs


class ClientListCreateView(generics.ListCreateAPIView):
    """List/create clients (company-scoped). For assigning projects to clients (client portal)."""
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        qs = Client.objects.select_related('company').order_by('name')
        cid = get_company_id(self.request)
        if cid is not None:
            qs = qs.filter(company_id=cid)
        return qs

    def perform_create(self, serializer):
        cid = get_company_id(self.request)
        if cid:
            serializer.save(company_id=cid)
        else:
            serializer.save()


class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        qs = Client.objects.select_related('company')
        cid = get_company_id(self.request)
        if cid is not None:
            qs = qs.filter(company_id=cid)
        return qs


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = User.objects.select_related('company').order_by('username')
        cid = get_company_id(self.request)
        if cid is not None:
            qs = qs.filter(company_id=cid)
        return qs

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        cid = get_company_id(self.request)
        if cid is not None and not serializer.validated_data.get('company_id'):
            serializer.save(company_id=cid)
        else:
            serializer.save()


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = User.objects.select_related('company')
        cid = get_company_id(self.request)
        if cid is not None:
            qs = qs.filter(company_id=cid)
        return qs


class GlobalSearchView(APIView):
    """Search across projects, contracts, bills, and parties. ?q=term (min 2 chars). Company-scoped."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        q = (request.query_params.get('q') or '').strip()
        if len(q) < 2:
            return Response({'results': []})

        from projects.models import Project
        from contracts.models import Contract
        from bills.models import Bill
        from parties.models import Party

        results = []
        cid = get_company_id(request)

        project_qs = Project.objects.filter(is_deleted=False).filter(
            Q(name__icontains=q) | Q(description__icontains=q)
        )
        if cid is not None:
            project_qs = project_qs.filter(company_id=cid)
        for p in project_qs[:8]:
            results.append({'type': 'project', 'id': p.id, 'label': p.name, 'url': f'/projects/{p.id}/dashboard'})

        contract_qs = Contract.objects.filter(
            Q(title__icontains=q) | Q(contractor_name__icontains=q)
        ).select_related('project')
        if cid is not None:
            contract_qs = contract_qs.filter(project__company_id=cid)
        for c in contract_qs[:8]:
            results.append({
                'type': 'contract', 'id': c.id, 'label': f'{c.title} ({c.project.name})',
                'url': f'/contracts/{c.id}',
            })

        bill_qs = Bill.objects.filter(is_deleted=False).filter(
            Q(description__icontains=q)
        ).select_related('project')
        if cid is not None:
            bill_qs = bill_qs.filter(project__company_id=cid)
        for b in bill_qs[:8]:
            results.append({
                'type': 'bill', 'id': b.id, 'label': f'{b.description} - {b.project.name}',
                'url': '/bills',
            })

        party_qs = Party.objects.filter(Q(name__icontains=q) | Q(contact_person__icontains=q))
        if cid is not None:
            party_qs = party_qs.filter(company_id=cid)
        for p in party_qs[:8]:
            results.append({'type': 'party', 'id': p.id, 'label': f'{p.name} ({p.get_party_type_display()})', 'url': '/parties'})

        return Response({'results': results})
