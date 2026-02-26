from typing import Optional, Tuple

from django.contrib.auth.models import AbstractBaseUser
from django.http import HttpRequest
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    JWT auth that also supports reading the access token from a secure HttpOnly cookie.

    - Prefers the Authorization header (for API tools / admin).
    - If header is missing, falls back to "access_token" cookie.
    """

    def authenticate(self, request: HttpRequest) -> Optional[Tuple[AbstractBaseUser, object]]:
        header = self.get_header(request)
        raw_token = None

        if header is not None:
            raw_token = self.get_raw_token(header)

        if raw_token is None:
            raw_token = request.COOKIES.get("access_token")

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token

