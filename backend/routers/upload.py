import os
import re
import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from services.extractor import extract_invoice
from services.validator import validate_invoice
from services.database import save_invoice
from services.erp_client import submit_invoice as erp_submit
from services.auth import get_current_user

router = APIRouter(prefix="/api/upload", tags=["upload"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "pdfs")
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

STATUS_MAP = {"OK": "ok", "Needs Review": "review", "Error": "error"}


def safe_filename(name: str) -> str:
    clean = os.path.basename(name)
    clean = re.sub(r"[^\w\.\-]", "_", clean)
    return clean


@router.post("/pdfs")
async def upload_pdfs(files: list[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 files per upload")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    results = []

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            results.append({"fileName": file.filename, "status": "error", "error": "Not a PDF"})
            continue

        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            results.append({"fileName": file.filename, "status": "error", "error": "File too large (max 20MB)"})
            continue

        safe_name = safe_filename(file.filename)
        file_path = os.path.join(UPLOAD_DIR, safe_name)
        with open(file_path, "wb") as f:
            f.write(content)

        # Process
        try:
            extracted = extract_invoice(file_path)
            result = await validate_invoice(extracted)

            matched = result.get("matchedCompany")
            invoice_data = {
                "fileName": safe_name,
                "status": result["status"],
                "confidenceScore": result["confidenceScore"],
                "matchQuality": result["matchQuality"],
                "processingNotes": result["processingNotes"],
                "uploadedBy": user.get("name"),
                "extractedData": {
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
                },
                "matchedCompany": matched,
                "matchScore": result.get("matchScore"),
                "matchMethod": result.get("matchMethod"),
                "errors": result.get("errors", []),
                "warnings": result.get("warnings", []),
            }

            # Submit to ERP
            erp_payload = {
                "fileName": safe_name,
                "extractedData": invoice_data["extractedData"],
                "confidenceScore": result["confidenceScore"],
                "processingNotes": result["processingNotes"],
            }
            try:
                await erp_submit(erp_payload)
                invoice_data["erpSubmitted"] = True
            except Exception:
                invoice_data["erpSubmitted"] = False

            save_invoice(invoice_data)
            mq = result["matchQuality"]
            results.append({
                "fileName": safe_name,
                "status": STATUS_MAP.get(result["status"], result["status"].lower()),
                "matchQuality": round(mq / 100, 2) if mq > 1 else mq,
                "confidenceScore": result["confidenceScore"],
                "erpSubmitted": invoice_data["erpSubmitted"],
            })

        except Exception as e:
            results.append({"fileName": safe_name, "status": "error", "error": "Processing failed"})

    return {"results": results, "processed": len(results)}
