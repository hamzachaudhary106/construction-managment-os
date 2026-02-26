#!/bin/bash
# Run Construx360: starts backend, then frontend. Use Ctrl+C to stop.
cd "$(dirname "$0")"

echo "Starting backend (Django)..."
(cd backend && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000) &
BACKEND_PID=$!

trap "kill $BACKEND_PID 2>/dev/null" EXIT

sleep 3
echo "Starting frontend (Vite)..."
echo ""
echo "  >>> Open in your browser: http://127.0.0.1:3000"
echo "  >>> Backend: http://127.0.0.1:8000"
echo "  >>> Press Ctrl+C once to stop both servers"
echo ""

(cd frontend && npm run dev)
