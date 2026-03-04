#!/usr/bin/env bash
set -euo pipefail

# Simple one-shot deployment script for Contabo VPS (Ubuntu).
# Run this INSIDE the VPS after copying the project to /var/www/construx360:
#
#   ssh root@YOUR_IP
#   mkdir -p /var/www/construx360
#   # from your laptop:
#   #   cd "Construction Management Software"
#   #   scp -r . root@YOUR_IP:/var/www/construx360
#   # then on VPS:
#   cd /var/www/construx360/deploy
#   bash deploy-contabo.sh
#

APP_DIR="/var/www/construx360"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
SERVER_NAME="${SERVER_NAME:-95.111.238.179}"  # change to your domain when ready

echo "=== Construx360 deployment starting ==="
echo "App directory: $APP_DIR"
echo "Server name:   $SERVER_NAME"

if [ "$(id -u)" -ne 0 ]; then
  echo "This script should be run as root (sudo or root user)." >&2
  exit 1
fi

if [ ! -d "$BACKEND_DIR" ] || [ ! -f "$BACKEND_DIR/manage.py" ]; then
  echo "ERROR: Backend not found at $BACKEND_DIR (manage.py missing)." >&2
  echo "Copy the project into $APP_DIR before running this script." >&2
  exit 1
fi

if [ ! -d "$FRONTEND_DIR" ] || [ ! -f "$FRONTEND_DIR/package.json" ]; then
  echo "ERROR: Frontend not found at $FRONTEND_DIR (package.json missing)." >&2
  echo "Copy the project into $APP_DIR before running this script." >&2
  exit 1
fi

if [ ! -f /etc/os-release ]; then
  echo "WARNING: /etc/os-release not found; assuming Ubuntu-like system." >&2
else
  . /etc/os-release
  if [ "${ID:-}" != "ubuntu" ]; then
    echo "WARNING: This script was written for Ubuntu. Detected: $PRETTY_NAME" >&2
  else
    echo "Detected OS: $PRETTY_NAME"
  fi
fi

echo "=== Installing system packages (Python, Node, Nginx, PostgreSQL) ==="
export DEBIAN_FRONTEND=noninteractive
apt update
apt install -y python3-venv python3-pip nginx nodejs npm git postgresql postgresql-contrib

echo "=== Setting up backend virtualenv and dependencies ==="
cd "$BACKEND_DIR"
if [ ! -d venv ]; then
  python3 -m venv venv
fi
source venv/bin/activate
# On Ubuntu 24 "externally managed" error can appear; allow installing into this venv.
export PIP_BREAK_SYSTEM_PACKAGES=1
if [ -f requirements.txt ]; then
  pip install --no-input -r requirements.txt
else
  echo "WARNING: requirements.txt not found, installing common deps." >&2
  pip install --no-input django djangorestframework gunicorn django-filter python-dotenv reportlab
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "WARNING: backend/.env not found. Make sure to create one with proper secrets and GREEN API config." >&2
fi

echo "=== Applying migrations and collecting static files ==="
PY_BIN="$BACKEND_DIR/venv/bin/python"
"$PY_BIN" manage.py migrate
"$PY_BIN" manage.py collectstatic --noinput

echo "=== Creating systemd service for gunicorn ==="
cat >/etc/systemd/system/construx360.service <<EOF
[Unit]
Description=Construx360 Django backend
After=network.target

[Service]
User=root
Group=www-data
WorkingDirectory=$BACKEND_DIR
Environment=DJANGO_SETTINGS_MODULE=config.settings
ExecStart=$BACKEND_DIR/venv/bin/gunicorn config.wsgi:application --bind 127.0.0.1:8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now construx360
systemctl status construx360 --no-pager || true

echo "=== Building frontend ==="
cd "$FRONTEND_DIR"
npm install
npm run build

echo "=== Configuring Nginx ==="
NGINX_SITE=/etc/nginx/sites-available/construx360
cat >"$NGINX_SITE" <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    # React app (SPA)
    root $FRONTEND_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Django admin
    location /admin {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
    }

    # API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
    }

    # Django static and media
    location /static {
        alias $BACKEND_DIR/staticfiles;
    }
    location /media {
        alias $BACKEND_DIR/media;
    }
}
EOF

ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/construx360
rm -f /etc/nginx/sites-enabled/default || true

nginx -t
systemctl reload nginx

echo "=== Deployment complete ==="
echo "Visit: http://$SERVER_NAME"

