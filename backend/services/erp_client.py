import os
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

ERP_BASE_URL = os.getenv("ERP_BASE_URL", "")
ERP_API_KEY = os.getenv("ERP_API_KEY", "")

_headers = {"X-ERP-API-Key": ERP_API_KEY}


async def get_companies() -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{ERP_BASE_URL}/companies", headers=_headers)
        resp.raise_for_status()
        return resp.json()


async def submit_invoice(payload: dict) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ERP_BASE_URL}/processed-invoices", headers=_headers, json=payload
        )
        resp.raise_for_status()
        return resp.json()


async def get_processed_invoices() -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ERP_BASE_URL}/processed-invoices", headers=_headers
        )
        resp.raise_for_status()
        return resp.json()


async def reset_processed_invoices() -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{ERP_BASE_URL}/processed-invoices", headers=_headers
        )
        resp.raise_for_status()
        return resp.json()
