# Portline Invoice Processor

Automated invoice extraction, validation, and ERP submission system for Portline Logistics.

## Architecture

- **Backend**: FastAPI (Python) — PDF extraction, vendor validation, ERP integration, JWT auth
- **Frontend**: Vite + React — Finance team dashboard with role-based access
- **Pipeline**: PDF → Extract → Validate (against ERP companies) → Store → Submit to ERP API

```
InvProcess/
├── backend/              # FastAPI server
│   ├── main.py           # App entrypoint
│   ├── routers/          # API routes (invoices, companies, upload, auth, team)
│   ├── services/         # ETL pipeline (extractor, validator, erp_client, database, auth)
│   └── tests/
├── frontend/             # Vite + React
│   └── src/
│       ├── pages/        # Overview, Upload, Team, Settings, Login
│       ├── components/   # Reusable UI (FilterBar, InvoiceList, StatisticsPanel, etc.)
│       ├── services/     # API client (api.js)
│       └── context/      # Auth context
├── uploads/              # Uploaded files
│   ├── pdfs/             # Invoice PDFs
│   └── users/
│       └── profile_picture/{userId}/
├── db/                   # SQLite database
├── docs/                 # Documentation and approach report
└── .env                  # ERP_API_KEY, ERP_BASE_URL
```

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
python seed.py            # Initialize DB with demo users
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev               # Starts on :5173, proxies /api to :8000
```

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@portline.com | admin |
| Manager | manager@portline.com | manager |
| Analyst | analyst@portline.com | analyst |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ERP_API_KEY` | API key for the external ERP system |
| `ERP_BASE_URL` | ERP API base URL |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated, default: `*`) |
| `VITE_API_URL` | Backend URL for production frontend |

## Deployment

### Frontend (GitHub Pages)

Pushes to `main` auto-deploy via GitHub Actions. Set `VITE_API_URL` secret to your backend URL.

### Backend (Railway/Render)

Connect the repo, set root directory to `InvProcess/backend`, add environment variables.

## Features

- **Multi-language PDF extraction** — English, French, Dutch, German invoices
- **Multi-currency support** — EUR, USD, INR
- **Vendor cross-referencing** — Tax ID matching, fuzzy name matching, text search fallback
- **Status system** — OK (confident match), Needs Review (missing data/partial match), Error (no match)
- **Role-based access** — Admin, Manager, Analyst with different permissions
- **Team management** — Invite analysts, activate/deactivate accounts
- **PDF viewer** — In-browser PDF preview with download option
- **Statistics panel** — Status distribution, vendor ranking, flagged vendors
