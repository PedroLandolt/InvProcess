from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from services.database import init_db, seed_users
from routers import invoices, companies, upload, auth, team
import os

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

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

init_db()
seed_users()

app.include_router(invoices.router)
app.include_router(companies.router)
app.include_router(upload.router)
app.include_router(auth.router)
app.include_router(team.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
