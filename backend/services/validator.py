import asyncio
import re
from thefuzz import fuzz
from services.erp_client import get_companies


def _normalize_name(name: str) -> str:
    if not name:
        return ""
    suffixes = [", Inc.", ", LLC", ", Ltd.", " B.V.", " SAS", " Pvt. Ltd.", " AG", " GmbH"]
    normalized = name
    for s in suffixes:
        normalized = normalized.replace(s, "")
    return normalized.strip().lower()


def match_vendor(extracted: dict, companies: list[dict]) -> dict:
    vendor_name = extracted.get("vendorName", "")
    vendor_tax_id = extracted.get("vendorTaxId")
    raw_text = extracted.get("_rawText", "")

    best_match = None
    best_score = 0
    match_method = None

    # 1. Tax ID match (strongest signal)
    if vendor_tax_id:
        for company in companies:
            if company.get("taxId", "").lower() == vendor_tax_id.lower():
                return {
                    "matchedCompany": company,
                    "matchScore": 100,
                    "matchMethod": "tax_id",
                    "status": "OK",
                    "notes": f"Matched by tax ID: {vendor_tax_id}",
                }

    # 2. Fuzzy name match
    if vendor_name:
        norm_extracted = _normalize_name(vendor_name)
        for company in companies:
            norm_company = _normalize_name(company["name"])
            score = fuzz.token_sort_ratio(norm_extracted, norm_company)
            if score > best_score:
                best_score = score
                best_match = company

        if best_score >= 80:
            return {
                "matchedCompany": best_match,
                "matchScore": best_score,
                "matchMethod": "name_fuzzy",
                "status": "OK",
                "notes": f"Matched by name (score: {best_score}%) to {best_match['name']}",
            }

        if best_score >= 50:
            return {
                "matchedCompany": best_match,
                "matchScore": best_score,
                "matchMethod": "name_fuzzy",
                "status": "Needs Review",
                "notes": f"Partial name match (score: {best_score}%) to {best_match['name']}",
            }

    # 3. Search ERP company names in the full PDF text
    if raw_text:
        best_text_match = None
        best_text_score = 0
        for company in companies:
            name_parts = company["name"].split()
            significant_parts = [p for p in name_parts if len(p) > 4 and p.lower() not in ("pvt", "ltd", "inc", "corp", "bv", "ag", "sas", "gmbh", "nl", "fr", "de")]
            matched_parts = 0
            for part in significant_parts:
                if re.search(re.escape(part), raw_text, re.IGNORECASE):
                    matched_parts += 1
            if significant_parts and matched_parts >= len(significant_parts):
                score = fuzz.partial_ratio(_normalize_name(vendor_name), _normalize_name(company["name"]))
                if score > best_text_score:
                    best_text_score = score
                    best_text_match = company

        if best_text_match and best_text_score >= 20:
            return {
                "matchedCompany": best_text_match,
                "matchScore": best_text_score,
                "matchMethod": "text_search",
                "status": "Needs Review",
                "notes": f"Found ERP company '{best_text_match['name']}' referenced in invoice text (different brand name)",
            }

    # 4. No match
    return {
        "matchedCompany": None,
        "matchScore": best_score,
        "matchMethod": None,
        "status": "Error",
        "notes": "No matching vendor found in ERP records",
    }


def compute_match_quality(extracted: dict, match_result: dict) -> int:
    """Return 0-100 match quality score."""
    base = match_result.get("matchScore", 0)

    # Boost for tax ID match
    if match_result.get("matchMethod") == "tax_id":
        base = 100

    # Penalties for missing fields
    penalties = 0
    if not extracted.get("invoiceNumber"):
        penalties += 5
    if not extracted.get("issueDate"):
        penalties += 5
    if not extracted.get("totalAmount"):
        penalties += 10
    if not extracted.get("vendorTaxId") and match_result.get("matchMethod") != "tax_id":
        penalties += 5
    if not extracted.get("taxAmount") and extracted.get("totalAmount"):
        penalties += 3
    if not extracted.get("lineItems"):
        penalties += 2

    return max(0, min(100, base - penalties))


def compute_status(extracted: dict, match_result: dict) -> dict:
    errors = []
    warnings = []

    if extracted.get("totalAmount") is None:
        errors.append("Missing totalAmount")
    if extracted.get("invoiceNumber") is None:
        warnings.append("Missing invoiceNumber")
    if extracted.get("issueDate") is None:
        warnings.append("Missing issueDate")

    if match_result["status"] == "Error":
        errors.append(match_result["notes"])
    elif match_result["status"] == "Needs Review":
        warnings.append(match_result["notes"])

    if extracted.get("vendorTaxId") is None and match_result.get("matchMethod") != "tax_id":
        warnings.append("No tax ID extracted")
    if extracted.get("taxAmount") is None and extracted.get("totalAmount") is not None:
        warnings.append("Tax amount not found")
    if not extracted.get("lineItems"):
        warnings.append("No line items extracted")

    # Determine final status
    if errors:
        status = "Error" if match_result["status"] == "Error" else "Needs Review"
    elif match_result["status"] == "Error":
        status = "Error"
    elif match_result["status"] == "Needs Review":
        status = "Needs Review"
    else:
        has_invoice = extracted.get("invoiceNumber") is not None
        has_date = extracted.get("issueDate") is not None
        has_total = extracted.get("totalAmount") is not None
        if has_invoice and has_date and has_total:
            status = "OK"
        else:
            status = "Needs Review"

    # Confidence 0-1
    confidence = extracted.get("confidenceScore", 0.5)
    if match_result["status"] == "OK" and match_result["matchMethod"] == "tax_id":
        confidence = min(confidence + 0.10, 1.0)
    elif match_result["status"] == "OK":
        confidence = min(confidence + 0.05, 1.0)
    elif match_result["status"] == "Error":
        confidence = confidence * 0.5

    # Match quality 0-100
    match_quality = compute_match_quality(extracted, match_result)

    # Backfill tax ID from matched company
    matched = match_result.get("matchedCompany")
    if matched and not extracted.get("vendorTaxId"):
        extracted["vendorTaxId"] = matched.get("taxId")
        warnings = [w for w in warnings if w != "No tax ID extracted"]
        if matched.get("taxId"):
            warnings.append(f"Tax ID backfilled from ERP match: {matched['taxId']}")

    # No line items → Needs Review regardless of other fields
    if not extracted.get("lineItems") and status == "OK":
        status = "Needs Review"
        if "No line items extracted" not in warnings:
            warnings.append("No line items extracted")

    all_notes = errors + warnings
    if not all_notes:
        all_notes.append("All fields extracted, vendor matched")

    return {
        "status": status,
        "confidenceScore": round(confidence, 2),
        "matchQuality": match_quality,
        "processingNotes": "; ".join(all_notes),
        "matchedCompany": matched,
        "matchScore": match_result.get("matchScore"),
        "matchMethod": match_result.get("matchMethod"),
        "errors": errors,
        "warnings": warnings,
    }


async def validate_invoice(extracted: dict) -> dict:
    companies = await get_companies()
    match_result = match_vendor(extracted, companies)
    return compute_status(extracted, match_result)
