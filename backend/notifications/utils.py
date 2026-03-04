"""Helpers for sending notifications via WhatsApp."""
import io
import json
import logging
import urllib.request

import requests

from django.conf import settings

from .models import NotificationSettings


def _get_settings(user):
    try:
        return user.notification_settings
    except NotificationSettings.DoesNotExist:
        return None


def _do_send_whatsapp(phone, title, message, link=''):
    body = f"{title}\n\n{message}"
    base_url = getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/')
    if link:
        # If link already looks absolute, keep as is
        if link.startswith('http://') or link.startswith('https://'):
            body += f"\n\nLink: {link}"
        else:
            body += f"\n\nLink: {base_url}{link}"

    # 1) Green API integration (same style as green_test.py using requests)
    if getattr(settings, 'GREENAPI_ENABLED', False):
        instance_id = getattr(settings, 'GREENAPI_INSTANCE_ID', '')
        green_token = getattr(settings, 'GREENAPI_TOKEN', '')
        base_url = getattr(settings, 'GREENAPI_BASE_URL', 'https://api.green-api.com').rstrip('/')
        if instance_id and green_token and base_url:
            url = f"{base_url}/waInstance{instance_id}/sendMessage/{green_token}"
            payload = {
                "chatId": f"{phone}@c.us",  # Green API expects WhatsApp ID
                "message": body,
            }
            try:
                resp = requests.post(url, json=payload, timeout=10)
                if 200 <= resp.status_code < 300:
                    return True
            except Exception:
                # Fall through to Cloud API if Green API fails
                pass

    # 2) Default: WhatsApp Cloud API
    token = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '')
    phone_number_id = getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', '')
    if not token or not phone_number_id:
        return False

    url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": body},
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=5)
        return True
    except Exception:
        # We don't want WhatsApp issues to break core flows
        return False


def send_notification_whatsapp(user, title, message, link='', channel=None):
    """
    Send a WhatsApp message if any WhatsApp provider is enabled
    (Green API for testing or WhatsApp Cloud API) and the user has a phone.
    """
    if not (getattr(settings, 'WHATSAPP_ENABLED', False) or getattr(settings, 'GREENAPI_ENABLED', False)):
        return False

    # Respect per-user settings for this channel, if provided
    if channel:
        s = _get_settings(user)
        if s is not None:
            field = f'whatsapp_{channel}'
            if hasattr(s, field) and not getattr(s, field):
                return False

    phone = getattr(user, 'phone', None)
    if not phone:
        return False

    return _do_send_whatsapp(phone, title, message, link)


def send_whatsapp_document_to_phone(phone, document_url, filename, caption=''):
    """
    Send a PDF or other document to a WhatsApp number using a public URL.

    The document URL must be reachable by WhatsApp's servers (no localhost in production).
    """
    if not getattr(settings, 'WHATSAPP_ENABLED', False):
        return False
    if not phone or not document_url:
        return False

    token = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '')
    phone_number_id = getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', '')
    if not token or not phone_number_id:
        return False

    url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "document",
        "document": {
            "link": document_url,
            "filename": filename or "document.pdf",
        },
    }
    if caption:
        payload["document"]["caption"] = caption

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=5)
        return True
    except Exception:
        return False


def send_whatsapp_document_bytes(phone, pdf_bytes, filename, caption=''):
    """
    Upload PDF bytes to WhatsApp Media API and send as document to the given phone.
    Use this when you don't have a public URL (e.g. auth-required PDFs).

    Prefers WhatsApp Cloud API when WHATSAPP_ENABLED is true; if that is
    disabled but GREENAPI_ENABLED is true, falls back to Green API so all
    document-sending flows continue to work for Green-only setups.
    """
    if not getattr(settings, 'WHATSAPP_ENABLED', False):
        # Fallback: if only Green API is enabled, use that implementation instead.
        if getattr(settings, 'GREENAPI_ENABLED', False):
            return send_greenapi_document_bytes(phone, pdf_bytes, filename, caption)
        return False
    if not phone or not pdf_bytes:
        return False

    token = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '')
    phone_number_id = getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', '')
    if not token or not phone_number_id:
        return False

    # Build multipart form for media upload
    boundary = b'----WhatsAppFormBoundary' + str(id(pdf_bytes)).encode('ascii')
    body = io.BytesIO()
    body.write(b'--' + boundary + b'\r\n')
    body.write(b'Content-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n')
    body.write(b'--' + boundary + b'\r\n')
    body.write(b'Content-Disposition: form-data; name="type"\r\n\r\napplication/pdf\r\n')
    body.write(b'--' + boundary + b'\r\n')
    body.write(b'Content-Disposition: form-data; name="file"; filename="' + (filename or 'document.pdf').encode('utf-8') + b'"\r\n')
    body.write(b'Content-Type: application/pdf\r\n\r\n')
    body.write(pdf_bytes if isinstance(pdf_bytes, bytes) else pdf_bytes.getvalue())
    body.write(b'\r\n--' + boundary + b'--\r\n')
    data = body.getvalue()

    upload_url = f"https://graph.facebook.com/v21.0/{phone_number_id}/media"
    req = urllib.request.Request(
        upload_url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary.decode('ascii')}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_data = json.loads(resp.read().decode())
        media_id = resp_data.get("id")
        if not media_id:
            return False
    except Exception:
        return False


def send_greenapi_document_bytes(phone, pdf_bytes, filename, caption=''):
    """
    Upload PDF bytes to Green API and send as a document to the given phone.
    Uses sendFileByUpload endpoint.
    """
    if not getattr(settings, 'GREENAPI_ENABLED', False):
        return False
    if not phone or not pdf_bytes:
        return False

    logger = logging.getLogger('construx360')

    instance_id = getattr(settings, 'GREENAPI_INSTANCE_ID', '')
    green_token = getattr(settings, 'GREENAPI_TOKEN', '')
    # For file uploads Green API recommends the media host explicitly
    base_url = 'https://media.green-api.com'
    if not (instance_id and green_token):
        return False

    url = f"{base_url}/waInstance{instance_id}/sendFileByUpload/{green_token}"
    files = {
        "file": (
            filename or "document.pdf",
            pdf_bytes if isinstance(pdf_bytes, bytes) else pdf_bytes.getvalue(),
            "application/pdf",
        )
    }
    data = {"chatId": f"{phone}@c.us"}
    if caption:
        data["caption"] = caption

    try:
        resp = requests.post(url, data=data, files=files, timeout=20)
        if 200 <= resp.status_code < 300:
            return True
        # Log non-2xx responses so we can see exact Green API error in backend logs
        try:
            logger.warning("GreenAPI sendFileByUpload failed: status=%s body=%s", resp.status_code, resp.text)
        except Exception:
            pass
        return False
    except Exception as exc:
        try:
            logger.exception("GreenAPI sendFileByUpload exception: %s", exc)
        except Exception:
            pass
        return False

    # Send message with document id
    url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "document",
        "document": {
            "id": media_id,
            "filename": filename or "document.pdf",
        },
    }
    if caption:
        payload["document"]["caption"] = caption

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception:
        return False


def send_whatsapp_to_phone(phone, title, message, link=''):
    """
    Send a WhatsApp message directly to a phone number, without per-user settings.

    Expects the phone number in a format accepted by WhatsApp Cloud API (including country code).
    """
    if not (getattr(settings, 'WHATSAPP_ENABLED', False) or getattr(settings, 'GREENAPI_ENABLED', False)):
        return False
    if not phone:
        return False

    return _do_send_whatsapp(phone, title, message, link)
