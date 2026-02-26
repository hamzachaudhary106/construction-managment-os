# Construx360

A full-stack construction project management system with Django REST Framework (backend), PostgreSQL, and React (frontend).

## Features

- **Project Dashboard** – Per-project view of total income, expenses, balance, and categorized financial data
- **Financial Management** – Budgets and expenses by category (materials, labor, equipment, etc.)
- **Contract Management** – Contracts with payment schedules and statuses (expected vs completed payments)
- **Bill Management** – Bills with amount, due date, expected payment date; track paid, pending, overdue
- **Fund Transfers** – Move funds between projects with full audit trail
- **Partners & Funds** – Fund projects as **investments** (with optional partner); **partner withdrawals** from projects with full record of who withdrew how much and when; project balance = income + investments + transfers in − expenses − withdrawals − transfers out
- **Reporting** – Financial reports (income vs expenses) and pending bills with optional project filter
- **User Management** – Roles: Admin, Manager, Staff with permission levels
- **Notifications** – In-app and WhatsApp alerts for fund transfers, project milestones (add/complete), and due/overdue bills (via daily command)
- **Project Milestones** – Add milestones per project, due dates, mark complete (with notifications)
- **Audit Log** – Actions (e.g. bill updates, transfers) recorded with user, timestamp, and details
- **Progress Photos** – Upload and track progress photos per project/phase with date and caption
- **Punch / Snag Lists** – Handover punch items: title, location, status, assignee, due date
- **Retention Tracking** – Contract retention % and release days; payment schedule retention amount and release date
- **Company Dashboard** – Company-wide project count, total balance, overdue bills total, open punch count
- **Cost Forecast** – Per-project budget vs actual, approved variations, cost to complete
- **RFIs** – Requests for Information: title, description, status, response date and text
- **Material Tracking** – Material catalog (company) and project-level quantity required/used and reorder level
- **Project Phases** – Phases now have optional start_date and end_date for timeline/Gantt
- **Equipment Maintenance** – Maintenance records (scheduled, repair, inspection) with cost and next due date
- **Safety** – Safety incident reports (severity, corrective action) and toolbox talk records
- **Submittals** – Submittals (material sample, method statement, shop drawing) with status and approval date
- **Document Revision** – Project documents have a revision field (e.g. Rev A) for version control
- **Subcontractor Performance** – Party (subcontractor/supplier) performance rating (1–5) and notes
- **Clients & Client Portal** – Client model; assign projects to clients; users with `client` see only that client’s projects
- **Clients API** – CRUD clients (company-scoped); assign `client` to users for client portal access

## Tech Stack

- **Backend:** Django 4.x, Django REST Framework, Simple JWT, PostgreSQL, django-cors-headers, django-filter
- **Frontend:** React 18, React Router 6, Axios, Vite, TypeScript

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (running locally or via Docker)

## Run the project (quick start)

You need **two terminals** (both from the project root).

**Terminal 1 — Backend:**
```bash
cd backend
source venv/bin/activate   # Windows: venv\Scripts\activate
python manage.py runserver
```
Leave this running. You should see: `Starting development server at http://127.0.0.1:8000/`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
Leave this running. You should see: `Local: http://localhost:3000/`

**Then open in your browser:**  
**http://127.0.0.1:3000**  
(If that fails, try **http://localhost:3000**)

Log in with a user you created in Django admin (http://127.0.0.1:8000/admin/).

**If you see "This page isn't working" or "Can't connect":**
- Make sure **both** terminals are still running (backend and frontend).
- Use **http://127.0.0.1:3000** (not just "localhost").
- If port 3000 is in use, the frontend may start on 3001 — check the URL in Terminal 2.

## Backend Setup

1. Create a virtual environment and install dependencies:

```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. Create the PostgreSQL database and set environment variables if needed:

```bash
# Create the database (run in psql or as postgres user)
createdb construction_db

# Optional: set env vars (defaults shown)
export DB_NAME=construction_db
export DB_USER=postgres
export DB_PASSWORD=postgres
export DB_HOST=localhost
export DB_PORT=5432
```

3. Run migrations and create a superuser:

```bash
python manage.py migrate
python manage.py createsuperuser
```

4. Start the development server:

```bash
python manage.py runserver
```

Backend runs at **http://localhost:8000**. API root: `http://localhost:8000/api/`.

## Frontend Setup

1. Install dependencies and start the dev server:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:3000** and proxies `/api` to the Django backend.

## First Use

1. Log in with the superuser account (or create a user via Django admin: `/admin/`).
2. Create projects under **Projects**.
3. Add budgets, expenses, and income under **Finances**.
4. Add contracts and payment schedules under **Contracts**.
5. Add bills under **Bills** and use **Fund Transfers** to move money between projects.
6. Use **Partners & Funds** to add partners, record **investments** into projects (who put money in), and **partner withdrawals** (who took money out); all are included in project balance.
7. Use **Reports** for income vs expenses and pending bills; open a project’s **Dashboard** for per-project totals and categories.
8. **Users** and **Audit Log** are available to admin users only.
9. **Milestones** – Add and complete project milestones; notifications are created when milestones are added or completed.
10. Run **due bill notifications** daily (e.g. via cron): `python manage.py notify_due_bills` to create alerts for bills due in the next 7 days and to mark overdue bills.
11. **Documents** – Add document metadata and optionally attach a file (file upload in “Add document” form).
12. **Reports** – Financial, pending bills, payables aging, cash flow, and **WHT (withholding tax)** report; export as Excel or PDF. Dashboard “at a glance” and search on Projects, Contracts, Bills.
13. **Company scoping** – If a user has a company assigned, they only see projects and data for that company.
14. **Budgets/expenses** – Optional phase and purchase order link on budgets and expenses.

### Adding new companies and giving access

The app is multi-tenant: each **company** has its own users, projects, parties, partners, and data.

**Create companies in Django admin only**

1. Go to **Django admin** (`/admin/`) → **Companies** → **Add Company**. Enter name, code, and set **Is active** as needed. Save.
2. **Give access** by assigning users to that company:
   - **Users** → **Add user** (or edit existing). Set **Company** to the new company and assign role (Admin/Manager/Staff). Save.
   - Or via API: `POST /api/auth/users/` with body including `"company": <company_id>`. Only a **superuser** can set `company` to any company; company admins can only create users in their own company (and `company` is set automatically if omitted).

**Notes**

- **List companies (read-only):** `GET /api/auth/companies/` – superusers see all; others see only their own company. `GET /api/auth/companies/<id>/` to retrieve one. Create and edit companies only in Django admin.
- Users with no company (e.g. superuser) have platform-wide access; users with a company see only that company’s data.

### Optional cron jobs

- `python manage.py notify_due_bills` – Bills due/overdue (run daily).
- `python manage.py notify_contract_and_guarantees` – Contract payments due in 7 days, retention release, bank guarantees expiring in 30 days (run daily).
- `python manage.py notify_wht_reminder` – WHT filing reminder for previous month (run monthly, e.g. 1st of month).
- `python manage.py send_weekly_digest` – In-app weekly digest (project count, balance, overdue bills, open punch items) per company (run weekly).

Alerts can be sent via **WhatsApp** (configure `WHATSAPP_ENABLED`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`); users choose which notification types to receive in **Notification settings**.

**Invoice PDF:** Bill/invoice PDFs show your company as the issuer. Set `INVOICE_ISSUER_NAME` (and optionally `INVOICE_ISSUER_ADDRESS`) in the environment so all generated invoices use your real company name and address instead of the project’s company or a default. If unset, the project’s company name is used.

## Demo Data

To load realistic sample data for testing or demos (projects, parties, contracts, bills, equipment, site logs, documents, finances, notifications, etc.):

```bash
cd backend
source venv/bin/activate   # or venv\Scripts\activate on Windows
python manage.py seed_demo_data
```

Create a superuser first if you have not already (`python manage.py createsuperuser`); the command uses an existing user for notifications and audit fields. To replace existing demo data with a fresh set, run:

```bash
python manage.py seed_demo_data --clear
```

Demo data includes a company “Demo Construction Ltd”, three projects (e.g. Residential Tower, Commercial Plaza, Highway Section), subcontractors and suppliers, contracts with payment schedules, variations, bank guarantees, purchase orders, bills, equipment allocations, documents, daily logs and issues, budgets/expenses/income, **partners (e.g. Hamza, Sami), project investments and partner withdrawals**, notifications, and a fund transfer.

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/token/` | Obtain JWT (username, password) |
| `GET /api/auth/me/` | Current user |
| `GET/POST /api/projects/` | List/create projects |
| `GET /api/reports/dashboard/<id>/` | Project dashboard data |
| `GET /api/reports/overview/` | All projects financial summary |
| `GET /api/reports/financial/` | Income vs expenses (optional `?project_id=`) |
| `GET /api/reports/pending-bills/` | Pending/overdue bills |
| `GET/POST /api/finances/budgets/` | Budgets |
| `GET/POST /api/finances/expenses/` | Expenses |
| `GET/POST /api/finances/incomes/` | Income |
| `GET/POST /api/projects/milestones/` | Project milestones |
| `GET/POST /api/contracts/` | Contracts |
| `GET/POST /api/contracts/<id>/` | Contract detail + payment schedules |
| `GET/POST /api/contracts/payment-schedules/` | Contract payment schedules |
| `GET/POST /api/bills/` | Bills |
| `GET/POST /api/transfers/` | Fund transfers |
| `GET/POST /api/partners/` | Partners (for investments/withdrawals) |
| `GET/POST /api/partners/investments/` | Project investments |
| `GET/POST /api/partners/withdrawals/` | Partner withdrawals |
| `GET /api/notifications/` | Notifications |
| `GET /api/audit/` | Audit log (admin) |
| `GET /api/auth/companies/` | Companies list (read-only; create/edit in Django admin) |
| `GET /api/auth/companies/<id>/` | Company detail (read-only) |
| `GET/POST /api/auth/clients/` | Clients (company-scoped; for client portal) |
| `GET/PATCH/DELETE /api/auth/clients/<id>/` | Client detail |
| `GET/POST /api/auth/users/` | Users (admin; set `company`/`client` for tenant or client portal) |
| `GET/POST /api/projects/progress-photos/` | Progress photos (filter by project, phase) |
| `GET/POST /api/site/punch-items/` | Punch/snag list (filter by project, status) |
| `GET/POST /api/rfi/` | RFIs (filter by project, status) |
| `GET/POST /api/materials/` | Material catalog; `GET/POST /api/materials/project-materials/` for project usage |
| `GET/POST /api/safety/incidents/` | Safety incidents |
| `GET/POST /api/safety/toolbox-talks/` | Toolbox talks |
| `GET/POST /api/submittals/` | Submittals (filter by project, status, type) |
| `GET/POST /api/equipment/maintenance/` | Equipment maintenance records |
| `GET /api/reports/company-dashboard/` | Company-wide dashboard stats |
| `GET /api/reports/cost-forecast/?project_id=` | Cost to complete / forecast at completion |

## Production Notes

- Set `DEBUG=False` and configure `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`.
- Use a strong `DJANGO_SECRET_KEY` and keep `DB_*` credentials secure.
- Run `python manage.py collectstatic` and serve static files via your web server.
- Build the frontend: `cd frontend && npm run build`, then serve the `dist/` folder or mount it in Django.
