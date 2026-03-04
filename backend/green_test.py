import os
import sys
import requests


def load_env_from_dotenv():
    """
    Very small .env loader so this script can be run directly
    and still reuse backend/.env values without extra packages.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(base_dir, ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            # Do not override already-set env vars
            if key and key not in os.environ:
                os.environ[key] = value


def get_env(name, default=None):
    value = os.getenv(name, default)
    if value is None or str(value).strip() == "":
        raise RuntimeError("Environment variable %s is not set." % name)
    return str(value).strip()


def send_whatsapp_text(message):
    instance_id = get_env("GREENAPI_INSTANCE_ID")
    token = get_env("GREENAPI_TOKEN")
    base_url = os.getenv("GREENAPI_BASE_URL", "https://api.green-api.com").rstrip("/")
    target_phone = get_env("GREENAPI_TARGET_PHONE")  # e.g. 923332466662

    url = "%s/waInstance%s/sendMessage/%s" % (base_url, instance_id, token)
    chat_id = "%s@c.us" % target_phone

    payload = {
        "chatId": chat_id,
        "message": message,
    }

    print("Sending to %s via %s ..." % (chat_id, url))
    resp = requests.post(url, json=payload, timeout=20)
    print("Status:", resp.status_code)
    try:
        print("Response JSON:", resp.json())
    except Exception:
        print("Response text:", resp.text)


def main():
    load_env_from_dotenv()
    if len(sys.argv) > 1:
        msg = " ".join(sys.argv[1:])
    else:
        msg = "Construx360 Green API test message."
    send_whatsapp_text(msg)


if __name__ == "__main__":
    main()

