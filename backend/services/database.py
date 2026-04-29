import sqlite3
import json
import os
from passlib.context import CryptContext

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "db", "invoices.db")
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fileName TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            confidenceScore REAL,
            matchQuality INTEGER DEFAULT 0,
            processingNotes TEXT,
            extractedData TEXT NOT NULL DEFAULT '{}',
            matchedCompany TEXT,
            matchScore INTEGER,
            matchMethod TEXT,
            errors TEXT DEFAULT '[]',
            warnings TEXT DEFAULT '[]',
            erpSubmitted INTEGER DEFAULT 0,
            submittedBy TEXT,
            submittedAt TEXT,
            uploadedAt TEXT DEFAULT (datetime('now')),
            uploadedBy TEXT,
            createdAt TEXT DEFAULT (datetime('now')),
            updatedAt TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'analyst',
            initials TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            avatar TEXT,
            last_login TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()


def save_invoice(data: dict) -> int:
    conn = get_db()
    from datetime import datetime as dt
    existing = conn.execute("SELECT id FROM invoices WHERE fileName = ?", (data["fileName"],)).fetchone()
    erp_ok = bool(data.get("erpSubmitted"))
    now_str = dt.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    if existing:
        conn.execute(
            """UPDATE invoices SET
               status=?, confidenceScore=?, matchQuality=?, processingNotes=?, extractedData=?,
               matchedCompany=?, matchScore=?, matchMethod=?, errors=?, warnings=?, erpSubmitted=?,
               submittedBy=?, submittedAt=?, uploadedBy=?, updatedAt=datetime('now')
               WHERE id=?""",
            (
                data["status"],
                data.get("confidenceScore"),
                data.get("matchQuality", 0),
                data.get("processingNotes", ""),
                json.dumps(data.get("extractedData", {})),
                json.dumps(data.get("matchedCompany")) if data.get("matchedCompany") else None,
                data.get("matchScore"),
                data.get("matchMethod"),
                json.dumps(data.get("errors", [])),
                json.dumps(data.get("warnings", [])),
                1 if erp_ok else 0,
                "System" if erp_ok else None,
                now_str if erp_ok else None,
                data.get("uploadedBy"),
                existing["id"],
            ),
        )
        conn.commit()
        conn.close()
        return existing["id"]
    cursor = conn.execute(
        """INSERT INTO invoices
           (fileName, status, confidenceScore, matchQuality, processingNotes, extractedData,
            matchedCompany, matchScore, matchMethod, errors, warnings, erpSubmitted,
            submittedBy, submittedAt, uploadedBy, uploadedAt, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))""",
        (
            data["fileName"],
            data["status"],
            data.get("confidenceScore"),
            data.get("matchQuality", 0),
            data.get("processingNotes", ""),
            json.dumps(data.get("extractedData", {})),
            json.dumps(data.get("matchedCompany")) if data.get("matchedCompany") else None,
            data.get("matchScore"),
            data.get("matchMethod"),
            json.dumps(data.get("errors", [])),
            json.dumps(data.get("warnings", [])),
            1 if erp_ok else 0,
            "System" if erp_ok else None,
            now_str if erp_ok else None,
            data.get("uploadedBy"),
        ),
    )
    conn.commit()
    invoice_id = cursor.lastrowid
    conn.close()
    return invoice_id


def get_invoices() -> list[dict]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM invoices ORDER BY createdAt DESC").fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def get_invoice(id: int) -> dict | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM invoices WHERE id = ?", (id,)).fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


def mark_submitted(invoice_id: int, submitted_by: str):
    conn = get_db()
    conn.execute(
        "UPDATE invoices SET erpSubmitted = 1, submittedBy = ?, submittedAt = datetime('now'), updatedAt = datetime('now') WHERE id = ?",
        (submitted_by, invoice_id),
    )
    conn.commit()
    conn.close()


def get_summary() -> dict:
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM invoices").fetchone()[0]
    ok = conn.execute("SELECT COUNT(*) FROM invoices WHERE status = 'OK'").fetchone()[0]
    review = conn.execute("SELECT COUNT(*) FROM invoices WHERE status = 'Needs Review'").fetchone()[0]
    error = conn.execute("SELECT COUNT(*) FROM invoices WHERE status = 'Error'").fetchone()[0]
    total_amount = conn.execute(
        "SELECT SUM(json_extract(extractedData, '$.totalAmount')) FROM invoices WHERE status = 'OK'"
    ).fetchone()[0] or 0
    conn.close()
    return {"total": total, "ok": ok, "needsReview": review, "error": error, "totalAmount": round(total_amount, 2)}


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["extractedData"] = json.loads(d.get("extractedData", "{}"))
    if d.get("matchedCompany"):
        d["matchedCompany"] = json.loads(d["matchedCompany"])
    d["errors"] = json.loads(d.get("errors", "[]"))
    d["warnings"] = json.loads(d.get("warnings", "[]"))
    return d


# --- Users ---

def seed_users():
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if count > 0:
        conn.close()
        return
    users = [
        {"name": "Admin User", "email": "admin@portline.com", "role": "admin", "initials": "AU"},
        {"name": "Jane Doe", "email": "analyst@portline.com", "role": "analyst", "initials": "JD"},
        {"name": "Mark Silva", "email": "manager@portline.com", "role": "manager", "initials": "MS"},
        {"name": "Ana Torres", "email": "ana.torres@portline.com", "role": "analyst", "initials": "AT"},
        {"name": "Peter Schmidt", "email": "peter.s@portline.com", "role": "analyst", "initials": "PS", "status": "inactive"},
    ]
    for u in users:
        conn.execute(
            "INSERT INTO users (name, email, password_hash, role, initials, status) VALUES (?, ?, ?, ?, ?, ?)",
            (u["name"], u["email"], _pwd_context.hash(u["role"]), u["role"], u["initials"], u.get("status", "active")),
        )
    conn.commit()
    conn.close()


def get_user_by_email(email: str) -> dict | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_all_users() -> list[dict]:
    conn = get_db()
    rows = conn.execute("SELECT id, name, email, role, initials, status, last_login, created_at FROM users ORDER BY name").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_user(data: dict) -> int:
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO users (name, email, password_hash, role, initials) VALUES (?, ?, ?, ?, ?)",
        (data["name"], data["email"], data["password_hash"], data.get("role", "analyst"), data["initials"]),
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return user_id


def update_user_last_login(email: str):
    conn = get_db()
    conn.execute("UPDATE users SET last_login = datetime('now') WHERE email = ?", (email,))
    conn.commit()
    conn.close()


def set_user_password(email: str, password_hash: str):
    conn = get_db()
    conn.execute(
        "UPDATE users SET password_hash = ?, status = 'active' WHERE email = ?",
        (password_hash, email),
    )
    conn.commit()
    conn.close()


def update_user(user_id: int, updates: dict):
    conn = get_db()
    sets = []
    vals = []
    for k in ("name", "status", "avatar"):
        if k in updates:
            sets.append(f"{k} = ?")
            vals.append(updates[k])
    if not sets:
        conn.close()
        return
    vals.append(user_id)
    conn.execute(f"UPDATE users SET {', '.join(sets)} WHERE id = ?", vals)
    conn.commit()
    conn.close()
