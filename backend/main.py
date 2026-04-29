from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import sys

# Try loading .env from multiple locations (local dev vs deployed)
for _p in [os.path.join(os.path.dirname(__file__), "..", ".env"), ".env"]:
    if os.path.exists(_p):
        load_dotenv(_p)
        break

print("Starting Portline Invoice Processor...", flush=True)

from services.database import init_db, seed_users
from routers import invoices, companies, upload, auth, team

app = FastAPI(title="Portline Invoice Processor", version="0.1.0")

_origins = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in _origins.split(",")] if _origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    init_db()
    print("Database initialized.", flush=True)
    seed_users()
    print("Users seeded.", flush=True)
except Exception as e:
    print(f"Startup error: {e}", file=sys.stderr, flush=True)
    raise

# Ensure upload directories exist
os.makedirs(os.path.join(os.path.dirname(__file__), "..", "uploads", "pdfs"), exist_ok=True)
os.makedirs(os.path.join(os.path.dirname(__file__), "..", "uploads", "users", "profile_picture"), exist_ok=True)

app.include_router(invoices.router)
app.include_router(companies.router)
app.include_router(upload.router)
app.include_router(auth.router)
app.include_router(team.router)

print("All routers loaded. Ready.", flush=True)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
