def log(user, action, model_name='', object_id='', details=None, request=None):
    from .models import AuditLog
    ip = None
    if request:
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')
    AuditLog.objects.create(
        user=user,
        action=action,
        model_name=model_name or '',
        object_id=str(object_id) if object_id else '',
        details=details or {},
        ip_address=ip,
    )
