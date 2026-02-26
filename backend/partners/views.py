from io import BytesIO

from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse

from audit.log import log
from notifications.utils import send_whatsapp_document_bytes
from .models import Partner, ProjectInvestment, PartnerWithdrawal
from .serializers import PartnerSerializer, ProjectInvestmentSerializer, PartnerWithdrawalSerializer


def _partner_phone(partner):
    if not partner:
        return None
    phone = (getattr(partner, 'phone', None) or '').strip()
    if phone:
        return phone
    user = getattr(partner, 'user', None)
    if user:
        return (getattr(user, 'phone', None) or '').strip() or None
    return None


class PartnerListCreateView(generics.ListCreateAPIView):
    serializer_class = PartnerSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('company',)

    def get_queryset(self):
        qs = Partner.objects.all()
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(company_id=self.request.user.company_id)
        return qs

    def perform_create(self, serializer):
        cid = getattr(self.request.user, 'company_id', None)
        if cid is not None and not serializer.validated_data.get('company_id'):
            serializer.save(company_id=cid)
        else:
            serializer.save()


class PartnerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PartnerSerializer

    def get_queryset(self):
        qs = Partner.objects.all()
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(company_id=self.request.user.company_id)
        return qs


class ProjectInvestmentListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectInvestmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'partner')

    def get_queryset(self):
        qs = ProjectInvestment.objects.select_related('project', 'partner').all()
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(created_by=self.request.user)
        log(self.request.user, 'create_investment', 'ProjectInvestment', obj.id, {'project_id': obj.project_id, 'amount': str(obj.amount)}, self.request)

        # Send WhatsApp receipt to partner, if a phone number is available.
        phone = _partner_phone(obj.partner)
        if phone:
            pdf_bytes = _build_investment_receipt_pdf_bytes(obj)
            caption = f"Investment receipt – {obj.project.name}: Rs {obj.amount} on {obj.investment_date}."
            send_whatsapp_document_bytes(phone, pdf_bytes, f"investment-{obj.id}.pdf", caption=caption)


class ProjectInvestmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectInvestmentSerializer

    def get_queryset(self):
        qs = ProjectInvestment.objects.select_related('project', 'partner').all()
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs


class PartnerWithdrawalListCreateView(generics.ListCreateAPIView):
    serializer_class = PartnerWithdrawalSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ('project', 'partner')

    def get_queryset(self):
        qs = PartnerWithdrawal.objects.select_related('project', 'partner').all()
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(created_by=self.request.user)
        log(self.request.user, 'create_withdrawal', 'PartnerWithdrawal', obj.id, {'project_id': obj.project_id, 'partner_id': obj.partner_id, 'amount': str(obj.amount)}, self.request)

        # Send WhatsApp receipt to partner, if a phone number is available.
        phone = _partner_phone(obj.partner)
        if phone:
            pdf_bytes = _build_withdrawal_receipt_pdf_bytes(obj)
            caption = f"Withdrawal receipt – {obj.project.name}: Rs {obj.amount} on {obj.withdrawal_date}."
            send_whatsapp_document_bytes(phone, pdf_bytes, f"withdrawal-{obj.id}.pdf", caption=caption)


def _build_investment_receipt_pdf_bytes(inv):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []
    elements.append(Paragraph('Investment Receipt', styles['Title']))
    elements.append(Spacer(1, 12))
    partner_name = inv.partner.name if inv.partner else ''
    info_data = [
        ['Project', inv.project.name],
        ['Investor', partner_name],
        ['Amount', f"Rs {float(inv.amount):,.2f}"],
        ['Date', str(inv.investment_date)],
        ['Description', inv.description or ''],
    ]
    table = Table(info_data, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(table)
    doc.build(elements)
    return buffer.getvalue()


def _build_withdrawal_receipt_pdf_bytes(wd):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []
    elements.append(Paragraph('Withdrawal Receipt', styles['Title']))
    elements.append(Spacer(1, 12))
    partner_name = wd.partner.name if wd.partner else ''
    info_data = [
        ['Project', wd.project.name],
        ['Partner', partner_name],
        ['Amount', f"Rs {float(wd.amount):,.2f}"],
        ['Date', str(wd.withdrawal_date)],
        ['Description', wd.description or ''],
    ]
    table = Table(info_data, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(table)
    doc.build(elements)
    return buffer.getvalue()


class ProjectInvestmentReceiptPDFView(APIView):
    """Generate a simple PDF receipt for a project investment (download)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            inv = ProjectInvestment.objects.select_related('project', 'partner', 'project__company').get(pk=pk)
        except ProjectInvestment.DoesNotExist:
            return Response({'detail': 'Investment not found.'}, status=404)

        if getattr(request.user, 'company_id', None):
            if getattr(inv.project, 'company_id', None) != request.user.company_id:
                return Response({'detail': 'Not found.'}, status=404)

        pdf_bytes = _build_investment_receipt_pdf_bytes(inv)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename=investment-{inv.id}.pdf'
        return response


class ProjectInvestmentSendReceiptWhatsAppView(APIView):
    """POST to send this investment receipt PDF to the partner's WhatsApp."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            inv = ProjectInvestment.objects.select_related('project', 'partner').get(pk=pk)
        except ProjectInvestment.DoesNotExist:
            return Response({'detail': 'Investment not found.'}, status=404)

        if getattr(request.user, 'company_id', None):
            if getattr(inv.project, 'company_id', None) != request.user.company_id:
                return Response({'detail': 'Not found.'}, status=404)

        phone = _partner_phone(inv.partner)
        if not phone:
            return Response({'detail': 'No WhatsApp number set for the investor/partner.'}, status=400)

        pdf_bytes = _build_investment_receipt_pdf_bytes(inv)
        caption = f"Investment receipt – {inv.project.name}: Rs {inv.amount} on {inv.investment_date}."
        ok = send_whatsapp_document_bytes(phone, pdf_bytes, f"investment-{inv.id}.pdf", caption=caption)
        if not ok:
            return Response({'detail': 'Failed to send via WhatsApp. Check server WhatsApp configuration.'}, status=502)
        return Response({'detail': 'Receipt sent to WhatsApp.'})


class PartnerWithdrawalReceiptPDFView(APIView):
    """Generate a simple PDF receipt for a partner withdrawal (download)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            wd = PartnerWithdrawal.objects.select_related('project', 'partner', 'project__company').get(pk=pk)
        except PartnerWithdrawal.DoesNotExist:
            return Response({'detail': 'Withdrawal not found.'}, status=404)

        if getattr(request.user, 'company_id', None):
            if getattr(wd.project, 'company_id', None) != request.user.company_id:
                return Response({'detail': 'Not found.'}, status=404)

        pdf_bytes = _build_withdrawal_receipt_pdf_bytes(wd)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename=withdrawal-{wd.id}.pdf'
        return response


class PartnerWithdrawalSendReceiptWhatsAppView(APIView):
    """POST to send this withdrawal receipt PDF to the partner's WhatsApp."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            wd = PartnerWithdrawal.objects.select_related('project', 'partner').get(pk=pk)
        except PartnerWithdrawal.DoesNotExist:
            return Response({'detail': 'Withdrawal not found.'}, status=404)

        if getattr(request.user, 'company_id', None):
            if getattr(wd.project, 'company_id', None) != request.user.company_id:
                return Response({'detail': 'Not found.'}, status=404)

        phone = _partner_phone(wd.partner)
        if not phone:
            return Response({'detail': 'No WhatsApp number set for this partner.'}, status=400)

        pdf_bytes = _build_withdrawal_receipt_pdf_bytes(wd)
        caption = f"Withdrawal receipt – {wd.project.name}: Rs {wd.amount} on {wd.withdrawal_date}."
        ok = send_whatsapp_document_bytes(phone, pdf_bytes, f"withdrawal-{wd.id}.pdf", caption=caption)
        if not ok:
            return Response({'detail': 'Failed to send via WhatsApp. Check server WhatsApp configuration.'}, status=502)
        return Response({'detail': 'Receipt sent to WhatsApp.'})


class PartnerWithdrawalDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PartnerWithdrawalSerializer

    def get_queryset(self):
        qs = PartnerWithdrawal.objects.select_related('project', 'partner').all()
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs
