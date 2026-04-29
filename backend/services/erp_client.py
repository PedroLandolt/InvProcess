import os
import httpx


def _base_url():
    return os.getenv("ERP_BASE_URL", "")


def _headers():
    return {"X-ERP-API-Key": os.getenv("ERP_API_KEY", "")}


async def get_companies() -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{_base_url()}/companies", headers=_headers())
        resp.raise_for_status()
        return resp.json()


async def submit_invoice(payload: dict) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{_base_url()}/processed-invoices", headers=_headers(), json=payload
        )
        resp.raise_for_status()
        return resp.json()


async def get_processed_invoices() -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{_base_url()}/processed-invoices", headers=_headers()
        )
        resp.raise_for_status()
        return resp.json()


async def reset_processed_invoices() -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{_base_url()}/processed-invoices", headers=_headers()
        )
        resp.raise_for_status()
        return resp.json()
