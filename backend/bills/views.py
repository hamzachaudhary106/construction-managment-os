from datetime import date
from io import BytesIO

from django.http import HttpResponse
from django.conf import settings as django_settings
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

from audit.log import log
from notifications.models import NotificationSettings
from notifications.utils import send_whatsapp_document_bytes, send_greenapi_document_bytes, send_whatsapp_to_phone
from .models import Bill
from .serializers import BillSerializer


def _ensure_bill_status(bill):
    if bill.status == 'pending' and bill.due_date and bill.due_date < date.today():
        bill.status = 'overdue'
        bill.save(update_fields=['status'])


class BillListCreateView(generics.ListCreateAPIView):
    serializer_class = BillSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ('project', 'status')
    search_fields = ('description',)

    def get_queryset(self):
        qs = Bill.objects.filter(is_deleted=False).select_related('project')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        _ensure_bill_status(obj)
        log(self.request.user, 'create_bill', 'Bill', obj.id, {'amount': str(obj.amount), 'project_id': obj.project_id}, self.request)

        # Auto-send WhatsApp PDF to billed party on creation, if enabled in notification settings.
        # This respects the current user's WhatsApp "Bills" toggle and supports both Cloud and Green API.
        phone = (getattr(obj, 'billed_to_phone', None) or '').strip()
        if phone:
            try:
                settings_obj, _ = NotificationSettings.objects.get_or_create(user=self.request.user)
                if settings_obj.whatsapp_bills:
                    whatsapp_enabled = getattr(django_settings, 'WHATSAPP_ENABLED', False)
                    green_enabled = getattr(django_settings, 'GREENAPI_ENABLED', False)
                    if whatsapp_enabled or green_enabled:
                        caption = f"Bill for project {obj.project.name} – Rs {obj.amount} (due {obj.due_date})."
                        pdf_bytes = _build_bill_pdf_bytes(obj)
                        if whatsapp_enabled:
                            send_whatsapp_document_bytes(
                                phone,
                                pdf_bytes,
                                f"bill-{obj.id}.pdf",
                                caption=caption,
                            )
                        elif green_enabled:
                            send_greenapi_document_bytes(
                                phone,
                                pdf_bytes,
                                f"bill-{obj.id}.pdf",
                                caption=caption,
                            )
            except Exception:
                # Never block bill creation due to WhatsApp/Green API issues
                pass


class BillDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BillSerializer

    def get_queryset(self):
        qs = Bill.objects.filter(is_deleted=False).select_related('project')
        if getattr(self.request.user, 'company_id', None):
            qs = qs.filter(project__company_id=self.request.user.company_id)
        return qs

    def perform_update(self, serializer):
        obj = serializer.save()
        _ensure_bill_status(obj)
        log(self.request.user, 'update_bill', 'Bill', obj.id, {'amount': str(obj.amount)}, self.request)

    def perform_destroy(self, instance):
        from django.utils import timezone
        bid, pid = instance.id, instance.project_id
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save()
        log(self.request.user, 'delete_bill', 'Bill', bid, {'project_id': pid}, self.request)


class BillsBulkMarkPaidView(APIView):
    """POST { bill_ids: [1,2,3], paid_date: 'YYYY-MM-DD' } to mark multiple bills as paid."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        bill_ids = request.data.get('bill_ids') or []
        paid_date_str = request.data.get('paid_date')
        if not bill_ids:
            return Response({'detail': 'bill_ids required'}, status=400)
        try:
            paid_date = date.fromisoformat(paid_date_str) if paid_date_str else date.today()
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid paid_date'}, status=400)

        updated = 0
        bill_qs = Bill.objects.filter(is_deleted=False)
        if getattr(request.user, 'company_id', None):
            bill_qs = bill_qs.filter(project__company_id=request.user.company_id)
        for bid in bill_ids:
            try:
                bill = bill_qs.filter(id=bid).first()
                if bill and bill.status in ('pending', 'overdue'):
                    bill.status = 'paid'
                    bill.paid_date = paid_date
                    bill.save()
                    updated += 1
                    log(request.user, 'update_bill', 'Bill', bill.id, {'bulk_paid': True}, request)
            except Exception:
                pass
        return Response({'updated': updated, 'paid_date': str(paid_date)})


def _safe_escape(s):
    """Escape for use inside ReportLab Paragraph HTML."""
    if s is None:
        return ''
    import html
    return html.escape(str(s).strip())


def _safe_date_str(d):
    """Format date for display; return empty string if None or invalid."""
    if d is None:
        return ''
    try:
        if hasattr(d, 'strftime'):
            return d.strftime('%d %b %Y')
        return str(d)
    except Exception:
        return ''


def _get_invoice_issuer_name(bill):
    """Real company name for invoice: from settings first, else project's company."""
    from django.conf import settings as django_settings
    name = (getattr(django_settings, 'INVOICE_ISSUER_NAME', None) or '').strip()
    if name:
        return name
    try:
        if getattr(bill, 'project', None) and getattr(bill.project, 'company', None) and bill.project.company:
            return (bill.project.company.name or '').strip() or 'Construx360'
    except Exception:
        pass
    return 'Construx360'


def _build_bill_pdf_bytes(bill):
    """Build a standard invoice-style bill PDF. Caller must have already checked access."""
    from django.conf import settings as django_settings
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas as pdf_canvas

    # Issuer: real company from settings or project's company
    company_name = _safe_escape(_get_invoice_issuer_name(bill))
    issuer_address = (getattr(django_settings, 'INVOICE_ISSUER_ADDRESS', None) or '').strip()
    if issuer_address:
        company_name += '<br/><font size="8" color="#555555">%s</font>' % _safe_escape(issuer_address)
    project_name = _safe_escape(getattr(bill.project, 'name', None) if getattr(bill, 'project', None) else '')
    invoice_date = _safe_date_str(getattr(bill, 'created_at', None))
    due_date_str = _safe_date_str(getattr(bill, 'due_date', None))
    is_paid = getattr(bill, 'status', None) == 'paid'

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
    )
    styles = getSampleStyleSheet()
    elements = []

    # ----- Header: company name (issuer) + INVOICE -----
    header_data = [[
        Paragraph('<font size="14"><b>%s</b></font><br/><font size="9" color="#666666">Project: %s</font>' % (company_name, project_name or '—'), styles['Normal']),
        Paragraph(
            '<font size="18"><b>INVOICE</b></font><br/>'
            '<font size="9">Invoice No.</font> <font size="10"><b>BILL-%s</b></font><br/>'
            '<font size="9">Date: %s</font><br/>'
            '<font size="9">Due date: %s</font>' % (bill.id, invoice_date, due_date_str),
            styles['Normal'],
        ),
    ]]
    header_table = Table(header_data, colWidths=[3.8 * inch, 2.2 * inch])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 4))
    # Horizontal line under header
    line_table = Table([['']], colWidths=[6 * inch])
    line_table.setStyle(TableStyle([('LINEABOVE', (0, 0), (-1, -1), 1.5, colors.Color(0.2, 0.35, 0.55))]))
    elements.append(line_table)
    elements.append(Spacer(1, 22))

    # ----- Bill To (left) | Payment info (right) -----
    bill_to_lines = []
    if getattr(bill, 'billed_to_name', None) and (bill.billed_to_name or '').strip():
        bill_to_lines.append('<b>%s</b>' % _safe_escape(bill.billed_to_name))
    if getattr(bill, 'billed_to_phone', None) and (bill.billed_to_phone or '').strip():
        bill_to_lines.append('Tel: %s' % _safe_escape(bill.billed_to_phone))
    if not bill_to_lines:
        bill_to_lines.append('Customer')
    bill_to_text = '<br/>'.join(bill_to_lines)
    paid_str = _safe_date_str(getattr(bill, 'paid_date', None)) if is_paid else ''
    info_left = Paragraph('<font size="9" color="#444444"><b>BILL TO</b></font><br/><br/>%s' % bill_to_text, styles['Normal'])
    if is_paid and paid_str:
        info_right = Paragraph('<font size="9" color="#166534"><b>PAID</b></font><br/><font size="9">Date: %s</font>' % paid_str, styles['Normal'])
    else:
        info_right = Paragraph('<font size="9" color="#444444">Payment due: %s</font>' % due_date_str, styles['Normal'])
    info_data = [[info_left, info_right]]
    info_table = Table(info_data, colWidths=[3.8 * inch, 2.2 * inch])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 18))

    # ----- Line items table -----
    amount_rs = float(bill.amount)
    wht = float(bill.wht_amount or 0)
    desc_cell = _safe_escape(bill.description) or '—'
    items_data = [
        ['#', 'Description', 'Amount (Rs)'],
        ['1', desc_cell, f'{amount_rs:,.2f}'],
    ]
    dark = colors.Color(0.15, 0.28, 0.45)
    grid_color = colors.Color(0.85, 0.87, 0.9)
    row_alt = colors.Color(0.98, 0.98, 0.99)
    items_table = Table(items_data, colWidths=[0.45 * inch, 4.05 * inch, 1.5 * inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), dark),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, grid_color),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, row_alt]),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 18))

    # ----- Totals (right-aligned box) -----
    totals_data = []
    totals_data.append(['Subtotal', 'Rs %s' % f'{amount_rs:,.2f}'])
    if wht > 0:
        totals_data.append(['WHT', '- Rs %s' % f'{wht:,.2f}'])
        if getattr(bill, 'wht_certificate_number', None) and bill.wht_certificate_number:
            totals_data.append(['WHT Cert.', _safe_escape(bill.wht_certificate_number)])
        if getattr(bill, 'wht_tax_period', None) and bill.wht_tax_period:
            totals_data.append(['WHT Period', _safe_escape(bill.wht_tax_period)])
    net = amount_rs - wht
    totals_data.append([
        Paragraph('<b>Total</b>', styles['Normal']),
        Paragraph('<b>Rs %s</b>' % f'{net:,.2f}', styles['Normal']),
    ])
    totals_table = Table(totals_data, colWidths=[2.2 * inch, 1.8 * inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEABOVE', (-1, -1), (-1, -1), 1.5, colors.black),
        ('BOX', (0, 0), (-1, -1), 0.5, grid_color),
        ('BACKGROUND', (-1, -1), (-1, -1), colors.Color(0.96, 0.97, 0.98)),
    ]))
    elements.append(Paragraph('', styles['Normal']))
    elements.append(totals_table)
    elements.append(Spacer(1, 24))

    # ----- Notes -----
    notes = getattr(bill, 'notes', None) or ''
    if notes.strip():
        elements.append(Paragraph('<font size="9" color="#444444"><b>Notes</b></font>', styles['Normal']))
        elements.append(Paragraph('<font size="9">%s</font>' % _safe_escape(notes).replace('\n', '<br/>'), styles['Normal']))
        elements.append(Spacer(1, 12))

    # ----- Footer -----
    elements.append(Spacer(1, 20))
    elements.append(Paragraph('<font size="9" color="#666666"><i>Thank you for your business.</i></font>', styles['Normal']))

    # PAID stamp: custom canvas that draws a watermark on the first page when status is paid
    if is_paid:
        _page_num = [0]
        from reportlab.lib.pagesizes import A4 as A4_size
        _stamp_w, _stamp_h = A4_size

        class PaidStampCanvas(pdf_canvas.Canvas):
            def showPage(self):
                if _page_num[0] == 0:
                    self.saveState()
                    self.translate(_stamp_w / 2, _stamp_h / 2)
                    self.rotate(-35)
                    self.setFont('Helvetica-Bold', 78)
                    self.setFillColorRGB(0.75, 0.15, 0.15, 0.42)
                    self.drawCentredString(0, 0, 'PAID')
                    self.restoreState()
                _page_num[0] += 1
                super().showPage()

        doc.build(elements, canvasmaker=PaidStampCanvas)
    else:
        doc.build(elements)

    return buffer.getvalue()


class BillPDFView(APIView):
    """Generate a simple PDF for a single bill (download)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            bill = Bill.objects.select_related('project', 'project__company').get(pk=pk, is_deleted=False)
        except Bill.DoesNotExist:
            return Response({'detail': 'Bill not found.'}, status=404)

        if getattr(request.user, 'company_id', None):
            if bill.project.company_id != request.user.company_id:
                return Response({'detail': 'Not found.'}, status=404)

        try:
            pdf_bytes = _build_bill_pdf_bytes(bill)
        except Exception as e:
            return Response(
                {'detail': 'PDF generation failed: %s' % str(e)},
                status=500,
            )
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename=bill-{bill.id}.pdf'
        return response


class BillSendPDFWhatsAppView(APIView):
    """POST to send this bill's PDF to the billed-to phone via WhatsApp."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            bill = Bill.objects.select_related('project', 'project__company').get(pk=pk, is_deleted=False)
        except Bill.DoesNotExist:
            return Response({'detail': 'Bill not found.'}, status=404)

        if getattr(request.user, 'company_id', None):
            if bill.project.company_id != request.user.company_id:
                return Response({'detail': 'Not found.'}, status=404)

        phone = (bill.billed_to_phone or '').strip()
        if not phone:
            return Response({'detail': 'No WhatsApp number set for this bill (billed to phone).'}, status=400)

        whatsapp_enabled = getattr(django_settings, 'WHATSAPP_ENABLED', False)
        green_enabled = getattr(django_settings, 'GREENAPI_ENABLED', False)
        if not (whatsapp_enabled or green_enabled):
            return Response({'detail': 'WhatsApp is not configured on the server.'}, status=502)

        caption = f"Bill for project {bill.project.name} – Rs {bill.amount} (due {bill.due_date})."

        # If WhatsApp Cloud API is enabled, send the real PDF document via Cloud Media API
        if whatsapp_enabled:
            try:
                pdf_bytes = _build_bill_pdf_bytes(bill)
            except Exception as e:
                return Response(
                    {'detail': 'PDF generation failed: %s' % str(e)},
                    status=500,
                )
            ok = send_whatsapp_document_bytes(phone, pdf_bytes, f"bill-{bill.id}.pdf", caption=caption)
            if not ok:
                return Response({'detail': 'Failed to send via WhatsApp. Check server WhatsApp configuration.'}, status=502)
            return Response({'detail': 'PDF sent to WhatsApp.'})

        # Otherwise, use Green API to upload and send the PDF document
        try:
            pdf_bytes = _build_bill_pdf_bytes(bill)
        except Exception as e:
            return Response(
                {'detail': 'PDF generation failed: %s' % str(e)},
                status=500,
            )
        ok = send_greenapi_document_bytes(phone, pdf_bytes, f"bill-{bill.id}.pdf", caption=caption)
        if not ok:
            return Response({'detail': 'Failed to send via WhatsApp. Check server WhatsApp configuration.'}, status=502)
        return Response({'detail': 'PDF sent to WhatsApp.'})


class BillSendWhatsAppView(APIView):
    """
    POST to send a WhatsApp text alert for this bill
    (uses Green API first if enabled, then WhatsApp Cloud API).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            bill = Bill.objects.select_related('project', 'project__company').get(pk=pk, is_deleted=False)
        except Bill.DoesNotExist:
            return Response({'detail': 'Bill not found.'}, status=404)

        if getattr(request.user, 'company_id', None):
            if bill.project.company_id != request.user.company_id:
                return Response({'detail': 'Not found.'}, status=404)

        phone = (bill.billed_to_phone or '').strip()
        if not phone:
            return Response({'detail': 'No WhatsApp number set for this bill (billed to phone).'}, status=400)

        title = 'Bill notification'
        message = f'Bill "{bill.description}" for project {bill.project.name} – Rs {bill.amount} (due {bill.due_date}).'
        # Optional link back into the app (bills screen)
        link = '/bills'

        ok = send_whatsapp_to_phone(phone, title, message, link)
        if not ok:
            return Response({'detail': 'Failed to send WhatsApp alert. Check server WhatsApp/Green API configuration.'}, status=502)
        return Response({'detail': 'WhatsApp alert sent.'})
