from django.contrib import admin

# Restrict admin to Merchants and Users only (run after all apps register their models)
import config.admin_custom  # noqa: F401, E402

from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from core.views import HealthView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', HealthView.as_view(), name='api-health'),
    path('api/auth/', include('core.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/parties/', include('parties.urls')),
    path('api/finances/', include('finances.urls')),
    path('api/contracts/', include('contracts.urls')),
    path('api/bills/', include('bills.urls')),
    path('api/purchase-orders/', include('purchase_orders.urls')),
    path('api/variations/', include('variations.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/equipment/', include('equipment.urls')),
    path('api/site/', include('sitelog.urls')),
    path('api/guarantees/', include('guarantees.urls')),
    path('api/transfers/', include('transfers.urls')),
    path('api/partners/', include('partners.urls')),
    path('api/employees/', include('employees.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/audit/', include('audit.urls')),
    path('api/rfi/', include('rfi.urls')),
    path('api/materials/', include('materials.urls')),
    path('api/safety/', include('safety.urls')),
    path('api/submittals/', include('submittals.urls')),
    path('api/estimates/', include('estimates.urls')),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
