"""
Audit logging is performed in views via audit.log.log().
This middleware is a placeholder for any request-level audit if needed.
"""


class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)
