from fastapi import APIRouter
from services.erp_client import get_companies as fetch_erp_companies

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.get("")
async def list_companies():
    companies = await fetch_erp_companies()
    return [
        {"id": c["id"], "name": c["name"], "taxId": c.get("taxId", ""), "country": c.get("country", "")}
        for c in companies
    ]
