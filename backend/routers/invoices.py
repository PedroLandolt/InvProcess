import os
import re
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from services.database import get_invoices, get_invoice, get_summary, mark_submitted
from services.auth import get_current_user, require_role
from services.erp_client import submit_invoice as erp_submit

router = APIRouter(prefix="/api/invoices", tags=["invoices"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "pdfs")

STATUS_MAP = {"OK": "ok", "Needs Review": "review", "Error": "error"}


def safe_filename(name: str) -> str:
    clean = os.path.basename(name)
    return re.sub(r"[^\w\.\-]", "_", clean)


def transform_invoice(row: dict) -> dict:
    status = STATUS_MAP.get(row.get("status", ""), row.get("status", "error").lower())
    match_quality = row.get("matchQuality", 0)
    if isinstance(match_quality, (int, float)) and match_quality > 1:
        match_quality = round(match_quality / 100, 2)
    extracted = row.get("extractedData", {})
    matched_company = row.get("matchedCompany")
    return {
        "id": row["id"],
        "fileName": row.get("fileName", ""),
        "invoiceNumber": extracted.get("invoiceNumber"),
        "vendorName": extracted.get("vendorName"),
        "vendorTaxId": extracted.get("vendorTaxId"),
        "issueDate": extracted.get("issueDate"),
        "dueDate": extracted.get("dueDate"),
        "currency": extracted.get("currency"),
        "subtotal": extracted.get("subtotal"),
        "taxAmount": extracted.get("taxAmount"),
        "totalAmount": extracted.get("totalAmount"),
        "lineItems": extracted.get("lineItems", []),
        "status": status,
        "matchQuality": match_quality,
        "processingNotes": row.get("processingNotes", ""),
        "erpMatched": matched_company is not None,
        "erpCompanyName": matched_company.get("name") if matched_company else None,
        "submittedToERP": bool(row.get("erpSubmitted", 0)),
        "submittedBy": row.get("submittedBy"),
        "submittedAt": row.get("submittedAt"),
        "uploadedAt": row.get("uploadedAt") or row.get("createdAt"),
        "uploadedBy": row.get("uploadedBy"),
        "uploadedById": row.get("uploadedById"),
    }


@router.get("")
def list_invoices():
    rows = get_invoices()
    items = [transform_invoice(r) for r in rows]
    return {"items": items, "total": len(items)}


@router.get("/summary")
def summary():
    return get_summary()


@router.get("/{invoice_id}")
def get_invoice_detail(invoice_id: int):
    invoice = get_invoice(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return transform_invoice(invoice)


@router.post("/{invoice_id}/submit")
async def submit_to_erp(invoice_id: int, user: dict = Depends(require_role("manager"))):
    invoice = get_invoice(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.get("erpSubmitted"):
        raise HTTPException(status_code=409, detail="Already submitted to ERP")

    extracted = invoice.get("extractedData", {})
    erp_payload = {
        "fileName": invoice.get("fileName", ""),
        "extractedData": extracted,
        "confidenceScore": invoice.get("confidenceScore"),
        "processingNotes": invoice.get("processingNotes", ""),
    }
    await erp_submit(erp_payload)
    mark_submitted(invoice_id, user["name"])
    return {"success": True, "submittedBy": user["name"]}


@router.get("/{invoice_id}/pdf")
def get_invoice_pdf(invoice_id: int, token: str = ""):
    from services.auth import verify_token
    if not verify_token(token):
        raise HTTPException(status_code=401, detail="Invalid token")
    invoice = get_invoice(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    file_name = invoice.get("fileName", "")
    file_path = os.path.join(UPLOAD_DIR, safe_filename(file_name))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    return FileResponse(file_path, media_type="application/pdf", filename=file_name)
