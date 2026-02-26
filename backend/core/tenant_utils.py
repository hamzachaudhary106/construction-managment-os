"""
Multi-tenant utilities: company-scoped filtering and access.
When request.user.company_id is set, all tenant data must be filtered by that company.
When request.user.company_id is None (e.g. superuser), no company filter is applied (platform-wide access).
"""


def get_company_id(request):
    """Return the current user's company_id if set, else None (platform admin)."""
    return getattr(request.user, 'company_id', None) if request.user.is_authenticated else None


def filter_queryset_by_company(qs, request, *, company_id_field='company_id'):
    """
    Apply company filter to a queryset when the user has a company.
    qs: queryset (e.g. User.objects.all())
    request: request with user
    company_id_field: the filter key (e.g. 'company_id' or 'project__company_id')
    """
    cid = get_company_id(request)
    if cid is not None:
        return qs.filter(**{company_id_field: cid})
    return qs
