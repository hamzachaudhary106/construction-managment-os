"""
Utility script to test Green API WhatsApp integration.

IMPORTANT:
- This file no longer contains real credentials.
- Configure the following environment variables before use:
    GREENAPI_INSTANCE_ID
    GREENAPI_TOKEN
    GREENAPI_BASE_URL       (e.g. https://7103.api.greenapi.com)
    GREENAPI_TARGET_PHONE   (e.g. 923331234567)

Rotate any real credentials that may have previously been committed.
"""

import json
import os
import urllib.request


GREENAPI_INSTANCE_ID = os.environ.get("GREENAPI_INSTANCE_ID", "").strip()
GREENAPI_TOKEN = os.environ.get("GREENAPI_TOKEN", "").strip()
GREENAPI_BASE_URL = os.environ.get("GREENAPI_BASE_URL", "").strip() or "https://api.green-api.com"
TARGET_PHONE = os.environ.get("GREENAPI_TARGET_PHONE", "").strip()


def send_greenapi_message(phone: str, text: str) -> bool:
    if not (GREENAPI_INSTANCE_ID and GREENAPI_TOKEN and GREENAPI_BASE_URL):
        print("Missing GREENAPI config. Set GREENAPI_INSTANCE_ID, GREENAPI_TOKEN, GREENAPI_BASE_URL.")
        return False

    url = f"{GREENAPI_BASE_URL.rstrip('/')}/waInstance{GREENAPI_INSTANCE_ID}/sendMessage/{GREENAPI_TOKEN}"

    payload = {
        "chatId": f"{phone}@c.us",  # Green API format
        "message": text,
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            print("Green API response:", body)
        return True
    except Exception as e:
        print("Failed to send via Green API:", e)
        return False


if __name__ == "__main__":
    if not TARGET_PHONE:
        print("Set GREENAPI_TARGET_PHONE (e.g. 923331234567) before running this script.")
    else:
        msg = "Test message from Construx360 via Green API."
        ok = send_greenapi_message(TARGET_PHONE, msg)
        print("Sent:", ok)