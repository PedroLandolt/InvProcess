# Portline Invoice Processor — Approach Report

**Author:** Pedro Landolt
**Date:** April 2026

---

## 1. Problem Summary

Portline Logistics processes ~200 vendor invoices per month. Today, finance analysts manually open each PDF, read through it, extract key data (vendor name, tax ID, amounts, dates, line items), cross-reference against company records, flag discrepancies, and type everything into a spreadsheet. Each invoice takes 5–10 minutes. The process is slow, error-prone, and doesn't scale.

The invoices themselves are messy — different vendors use different formats, languages (English, French, Dutch, German), currencies (EUR, USD, INR), and conventions. Some have detailed line items and tax breakdowns, others don't. Vendor names don't always match ERP records exactly.

---

## 2. Solution Overview

A web application that automates the full invoice processing pipeline:

1. **Upload** — Analysts drag-and-drop PDF invoices into the dashboard
2. **Extract** — The backend parses each PDF, pulling structured data using regex-based text extraction
3. **Validate** — Extracted vendor data is cross-referenced against ERP company records using a three-tier matching strategy (tax ID → fuzzy name → full-text search)
4. **Flag** — Each invoice gets a status: OK (confident match), Needs Review (partial), or Error (no match)
5. **Submit** — Processed invoices are automatically submitted to the ERP API
6. **Review** — Finance managers use the dashboard to review results, check flagged invoices, and re-submit if needed

The result: what took 5–10 minutes per invoice now takes seconds, with clear visibility into what needs human attention.

---

## 3. Architecture

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Backend | FastAPI (Python) | Fast development, async support, strong typing with Pydantic |
| Frontend | React 19 + Vite 6 + Tailwind CSS 4 | Fast builds, component-based, utility-first styling |
| Database | SQLite | Zero config, file-based, sufficient for the volume |
| PDF Parsing | pdfplumber | Reliable text extraction, handles multi-page PDFs |
| Vendor Matching | thefuzz (Levenshtein) | Proven fuzzy string matching for name comparison |
| Auth | JWT (python-jose) + bcrypt | Stateless auth, secure password hashing |
| Charts | Recharts | Lightweight, React-native charting for statistics |

### Project Structure

```
InvProcess/
├── .env                        # ERP_API_KEY, ERP_BASE_URL, ALLOWED_ORIGINS
├── db/invoices.db              # SQLite database (auto-created)
├── uploads/                    # PDF files + user avatars
├── backend/
│   ├── main.py                 # App entry, CORS, DB init, user seeding
│   ├── Procfile                # Render deployment
│   ├── runtime.txt             # Python 3.13
│   ├── requirements.txt
│   ├── routers/
│   │   ├── auth.py             # Login, profile, password, avatars
│   │   ├── invoices.py         # List, detail, submit, PDF download
│   │   ├── upload.py           # PDF upload + processing pipeline
│   │   ├── companies.py        # ERP company proxy
│   │   └── team.py             # Team management (CRUD)
│   ├── services/
│   │   ├── extractor.py        # PDF text extraction + regex field parsing
│   │   ├── validator.py        # Vendor matching + status computation
│   │   ├── erp_client.py       # Async HTTP client to ERP API
│   │   ├── auth.py             # JWT, bcrypt, role-based access
│   │   └── database.py         # SQLite CRUD (invoices + users)
│   └── tests/
└── frontend/
    ├── vite.config.js
    ├── public/_redirects        # SPA fallback for Cloudflare Pages
    └── src/
        ├── pages/               # 7 pages (Login, Overview, Upload, Team, Settings, etc.)
        ├── components/          # 11 reusable components
        ├── services/api.js      # Auth-aware fetch wrapper
        └── context/AuthContext.jsx
```

### Data Flow

```
[PDF Upload] → [pdfplumber text extraction] → [Regex field parsing]
                                                      ↓
                                            [Vendor validation]
                                            (tax ID → fuzzy name → full-text)
                                                      ↓
                                            [Status: OK / Review / Error]
                                                      ↓
                                    [Store in SQLite] → [Submit to ERP API]
                                                      ↓
                                            [Dashboard displays results]
```

---

## 4. Processing Pipeline

### 4.1 Extraction (`services/extractor.py`)

Uses **pdfplumber** to extract raw text from PDF pages, then applies regex patterns to pull structured fields:

- **Invoice number** — 10+ patterns covering English, Dutch, German, and French conventions, with false-positive filtering
- **Dates** — Parses ISO numeric formats (YYYY-MM-DD, DD/MM/YYYY), textual dates ("3 August 2014", "28 novembre 2022", "7. Mai 2014"), with month name maps for four languages
- **Vendor name** — Hardcoded patterns for known vendors (AWS, Azure, Coolblue, etc.) with a fallback to the first meaningful text line
- **Tax ID** — Patterns for BTW (NL), VAT/TIN, GSTIN (Indian), and generic 2-letter-prefix IDs
- **Amounts** — Currency-aware patterns for total, tax, subtotal in English ("Total Amount Due"), French ("Total TTC", "Montant TVA"), and Dutch ("Totaal", "BTW bedrag"). Includes derivation logic: if total is missing but subtotal + tax exist, total is computed
- **Line items** — 6 vendor-specific patterns plus a generic fallback, filtering out summary rows
- **Currency detection** — Scans for Rs./INR, $, and Euro patterns

A **confidence score** is computed based on how many key fields were found (4/4 = 0.85, 3/4 = 0.65, etc.), with processing notes for each missing field.

### 4.2 Validation (`services/validator.py`)

Three-tier vendor matching against ERP company records:

1. **Tax ID match** (strongest) — Exact case-insensitive comparison. If matched, immediate "OK" status.
2. **Fuzzy name match** — Normalizes names (strips corporate suffixes like Inc., LLC, B.V., GmbH), then uses `token_sort_ratio` from thefuzz. Score >= 80 = OK, >= 50 = Needs Review.
3. **Full-text search** — Splits ERP company names into significant parts, searches for them in the raw PDF text. Falls back to `partial_ratio` for scoring.

If no match is found at any tier: "Error" status.

**Status computation** accumulates errors (missing totalAmount, no vendor match) and warnings (missing invoiceNumber, issueDate, taxId). The match quality score (0–100) starts from the match score and applies penalties for missing fields.

### 4.3 ERP Submission

Processed invoices are automatically submitted to the ERP API via `POST /api/erp/processed-invoices`. If submission fails (network error, API down), the invoice is still stored locally with `erpSubmitted = false`, and a "Submit to ERP" button appears for managers to retry.

---

## 5. Key Features

### Authentication & Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access. Can manage roles, edit all team members. |
| **Manager** | Can submit to ERP, invite analysts, edit analyst accounts. Cannot edit other managers or change roles. |
| **Analyst** | Can upload invoices and view the overview dashboard. Cannot submit to ERP or access the team page. |

JWT tokens with 24-hour expiry, bcrypt password hashing, invite-token-based analyst onboarding, password reset flow.

### Dashboard (Overview Page)

- **Filterable invoice list** — Search by vendor name, invoice number, tax ID. Filter by status, vendor, currency, and date range (13 presets + custom ranges)
- **Invoice detail view** — Shows all extracted fields, line items table, match quality bar, processing notes, ERP submission status
- **Statistics panel** — Status distribution bar, vendor ranking by invoice count, flagged vendors list. All filters apply to statistics
- **PDF download** — Original invoice PDF available for each processed record

### Upload Page

- Drag-and-drop multi-file upload (up to 20 PDFs at once)
- Real-time processing status per file
- Upload history persisted in localStorage (capped at 20 entries)
- Analysts see only their own uploads; managers see all

### Team Management

- User table with role badges, status indicators, last login
- Invite new analysts (generates random password + set-password link)
- Edit status (active/inactive) and roles (admin-only for role changes)
- Profile picture support with avatar display in team list

### Settings

- Profile editing (name, avatar upload)
- Password change with validation (min 8 chars, must differ from current)
- User preferences (default date range, currency display)

---

## 6. Design Decisions & Trade-offs

### Regex over LLM for extraction

I chose regex-based extraction with pdfplumber rather than an LLM API. The reasoning:

- **Deterministic** — Same input always produces the same output. No temperature, no hallucinated amounts.
- **Fast** — Extraction takes milliseconds, not seconds per invoice.
- **Free** — No API costs for processing 200+ invoices/month.
- **Controllable** — When a new format appears, I add a regex pattern rather than tweaking a prompt.

The trade-off: regex patterns need to be built per-format and won't generalize to completely unseen layouts. With more time, I'd add an LLM fallback for invoices that the regex pipeline can't parse.

### SQLite over PostgreSQL

For ~200 invoices/month, SQLite is more than sufficient. It requires zero configuration, no separate server, and the database file lives alongside the app. If volume grew significantly or the app needed concurrent writes from multiple instances, I'd migrate to PostgreSQL.

### Three-tier vendor matching

Rather than relying on a single matching strategy, the three-tier approach (tax ID → fuzzy name → full-text) handles the real-world messiness:

- Tax ID is the strongest signal — if it matches, we're confident
- Fuzzy name catches cases where the vendor name differs slightly (e.g., "Amazon Web Services" vs "Amazon Web Services, Inc.")
- Full-text search catches cases where the vendor name on the invoice is completely different from the ERP record but the company is mentioned in the document

### Auto-submit with manual fallback

Invoices are automatically submitted to the ERP API during processing. If submission fails, the invoice is still stored and a manual "Submit to ERP" button appears for managers. This ensures no data is lost even if the ERP API is temporarily unavailable.

---

## 7. Handling the Messy Parts

### Multi-language invoices

The extraction pipeline includes regex patterns and month name maps for English, French, Dutch, and German. Date parsing handles both numeric formats (DD/MM/YYYY, YYYY-MM-DD) and textual formats ("28 novembre 2022", "7. Mai 2014"). Amount extraction recognizes French terms ("Total TTC", "Montant TVA") and Dutch terms ("Totaal", "BTW bedrag").

### Vendor name mismatches

Corporate suffixes (Inc., LLC, B.V., GmbH, SAS, Pvt. Ltd., AG) are stripped before fuzzy comparison. The `token_sort_ratio` algorithm handles word reordering, so "Amazon Web Services, Inc." matches "Amazon Web Services" with high confidence.

### Missing fields

The pipeline is tolerant — missing fields don't crash processing. Instead, each missing key field reduces the confidence score and adds a note. Invoices with missing data get "Needs Review" status, surfacing them for human attention.

### Multiple currencies

Currency is auto-detected from invoice text (EUR, USD, INR). All amounts are displayed in their original currency with proper formatting.

### Credit notes

Negative amounts and credit note formats are handled naturally — the amount extraction patterns accept negative values, and the pipeline doesn't enforce positive-only constraints.

---

## 8. What I'd Improve With More Time

1. **ERP submission deduplication** — Before submitting, check `GET /api/erp/processed-invoices` for existing entries and update rather than create duplicates. Currently, re-uploading the same file creates duplicate ERP entries.

2. **LLM fallback for extraction** — For invoices where regex extraction fails or returns low confidence, fall back to an LLM API (GPT-4, Claude) to extract structured data from the raw text. This would handle completely unseen invoice formats.

3. **Manual correction UI** — Let analysts edit extracted fields directly in the detail view, with an audit trail of who changed what and when.

4. **Audit logging** — Track all user actions (uploads, submissions, edits, role changes) for compliance and debugging.

5. **Email notifications** — Send invite emails instead of displaying links. Notify managers when invoices need review. Alert on ERP submission failures.

6. **Bulk re-processing** — Allow re-running the extraction pipeline on existing invoices when the extractor is improved, without re-uploading files.

7. **Dashboard enhancements** — Trend charts over time, export to CSV/Excel, aging analysis for unpaid invoices.

8. **Persistent file storage** — Currently on the local filesystem. For production, use S3 or similar object storage so uploaded files survive server restarts on ephemeral hosting.

---

## 9. Deployment

| Component | Platform | Details | Link |
|-----------|---------|---------|-------|
| Frontend | Cloudflare Pages | Static SPA with `_redirects` for client-side routing. Built with Vite, `VITE_API_URL` env var points to backend | [https://invprocess-dku.pages.dev](https://invprocess-dku.pages.dev) |
| Backend | Render | Runs via Procfile (`uvicorn main:app`). Python 3.13 runtime. Environment variables for ERP_API_KEY, ERP_BASE_URL | [https://invprocess.onrender.com](https://invprocess.onrender.com) |

CORS is configured to allow only the deployed frontend origin in production, with `*` as a development fallback.

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@portline.com | admin |
| Manager | manager@portline.com | manager |
| Analyst | analyst@portline.com | analyst |
| Analyst | ana.torres@portline.com | analyst |
| Analyst (inactive) | peter.s@portline.com | analyst |
