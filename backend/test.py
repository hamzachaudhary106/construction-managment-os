import json
import urllib.request

# Hard-coded Green API config (for quick testing)
GREENAPI_INSTANCE_ID = "7103508051"
GREENAPI_TOKEN = "a3d98782f1f04ad79f93c555d9eb1a128c84ac6e52da43eea4"
GREENAPI_BASE_URL = "https://7103.api.greenapi.com"

# TARGET NUMBER (must be in international format, without +)
# Example for Pakistan: +92 333 2466662  =>  "923332466662"
TARGET_PHONE = "923332466662"  # 0333 2466662 => 923332466662

def send_greenapi_message(phone: str, text: str) -> bool:
    if not (GREENAPI_INSTANCE_ID and GREENAPI_TOKEN and GREENAPI_BASE_URL):
        print("Missing GREENAPI config.")
        return False

    url = f"{GREENAPI_BASE_URL}/waInstance{GREENAPI_INSTANCE_ID}/sendMessage/{GREENAPI_TOKEN}"

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
    msg = "Test message from Construx360 via Green API."
    ok = send_greenapi_message(TARGET_PHONE, msg)
    print("Sent:", ok)