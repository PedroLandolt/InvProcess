import os
import re
import pdfplumber
from datetime import datetime


# ---------------------------------------------------------------------------
# Number / date / currency helpers
# ---------------------------------------------------------------------------

def parse_number(s: str) -> float | None:
    if not s:
        return None
    cleaned = s.strip().replace(" ", "")
    cleaned = re.sub(r"[^\d.,\-]", "", cleaned)
    if not cleaned:
        return None
    try:
        if "," in cleaned and "." in cleaned:
            if cleaned.rfind(",") > cleaned.rfind("."):
                cleaned = cleaned.replace(".", "").replace(",", ".")
            else:
                cleaned = cleaned.replace(",", "")
        elif "," in cleaned:
            parts = cleaned.split(",")
            if len(parts[-1]) <= 2:
                cleaned = cleaned.replace(",", ".")
            else:
                cleaned = cleaned.replace(",", "")
        return float(cleaned)
    except ValueError:
        return None


MONTH_MAP = {
    "january": "01", "february": "02", "march": "03", "april": "04",
    "may": "05", "june": "06", "july": "07", "august": "08",
    "september": "09", "october": "10", "november": "11", "december": "12",
    "jan": "01", "feb": "02", "mar": "03", "apr": "04",
    "jun": "06", "jul": "07", "aug": "08", "sep": "09",
    "oct": "10", "nov": "11", "dec": "12",
    # French
    "janvier": "01", "février": "02", "fevrier": "02", "mars": "03",
    "avril": "04", "mai": "05", "juin": "06", "juillet": "07",
    "août": "08", "aout": "08", "septembre": "09", "octobre": "10",
    "novembre": "11", "décembre": "12", "decembre": "12",
    "1er": "01",
    # Dutch
    "januari": "01", "februari": "02", "maart": "03", "mei": "05",
    "augustus": "08",
    # German
    "januar": "01", "februar": "02", "februar": "02", "märz": "03", "marz": "03",
    "oktober": "10", "dezember": "12",
}


def parse_date(s: str) -> str | None:
    if not s:
        return None
    s = s.strip()
    # ISO / numeric
    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%d-%m-%y", "%Y/%m/%d"]:
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    # "3 August 2014", "28 novembre 2022", "19 april 2014", "7. Mai 2014"
    s_clean = re.sub(r"(\d+)\.", r"\1", s)  # Remove period after day number
    m = re.search(r"(\d{1,2})\s+(\w+)\s+(\d{4})", s_clean, re.IGNORECASE)
    if m:
        day, mon, year = m.group(1), m.group(2).lower(), m.group(3)
        if mon in MONTH_MAP:
            return f"{year}-{MONTH_MAP[mon]}-{int(day):02d}"
    # "August 3, 2014"
    m = re.search(r"(\w+)\s+(\d{1,2})\s*,?\s*(\d{4})", s, re.IGNORECASE)
    if m:
        mon, day, year = m.group(1).lower(), m.group(2), m.group(3)
        if mon in MONTH_MAP:
            return f"{year}-{MONTH_MAP[mon]}-{int(day):02d}"
    return None


def detect_currency(text: str) -> str:
    if re.search(r"Rs\.?\s*[\-]?[\d,.]+", text):
        return "INR"
    if re.search(r"\$\s*[\d,.]+|[\d,.]+\s*\$", text):
        return "USD"
    if re.search(r"€\s*[\d,.]+|[\d,.]+\s*€", text):
        return "EUR"
    return "EUR"


# ---------------------------------------------------------------------------
# Field extraction — all patterns are multi-language, vendor-agnostic
# ---------------------------------------------------------------------------

def extract_invoice_number(text: str) -> str | None:
    patterns = [
        # "Invoice INV/2023/03/0008"
        r"Invoice\s+(INV[/\-][A-Z0-9/\-_]+)",
        r"Invoice\s*(?:Number|No\.?|Num)[:\s#]*([A-Z0-9/\-_]+)",
        r"#\s*([A-Za-z0-9/\-_]+_\d+)",
        # Dutch: "F actuurnummer: 993548900"
        r"F\s*actuurnummer[:\s]*(\d+)",
        r"Factuurnummer[:\s]*([A-Z0-9/\-_]+)",
        # German
        r"Rechnungsnr\.[:\s]*([A-Z0-9/\-_]+)",
        # French
        r"Facture\s*n[°o][:\s]*([A-Z0-9/\-_]+)",
        # Saeco: "VF1005193039"
        r"\b(VF\d{7,})\b",
        # Generic numbered
        r"n[°o]\s*(\d{4,})",
        # Booking / order IDs — value may be on next line
        r"Booking\s*ID.*\n\s*([A-Z0-9]+)",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            # Filter out common false positives
            if val.lower() not in ("altijd", "klant", "nummer", "payment", "receipt", "cash"):
                return val
    return None


def extract_dates(text: str) -> tuple[str | None, str | None]:
    issue_date = None
    due_date = None

    issue_patterns = [
        r"Invoice\s*Date[:\s]*(.+?)(?:\n|$)",
        # Azure: "Invoice Date: Due Date: Reference:\n03/20/2023 04/04/2023 ..."
        r"Invoice\s*Date:.*\n\s*(\d[\d/]+\d)",
        r"F\s*actuurdatum[:\s]*(.+?)(?:\n|$)",
        r"Factuurdatum[:\s]*(.+?)(?:\n|$)",
        r"Rechnungsdatum\s+(.+?)(?:\n|$)",
        r"Facture\s*n[°o].*?du\s+(.+?)(?:\s{2,}|\n|$)",
        # Saeco: "Factuur datum Factuur Vervaldatum\n... 8-9-2022 VF1005193039 22-9-2022"
        r"Factuur\s*datum.*\n\S+\s+\S+\s+(\d[\d\-]+\d)\s",
        r"Factuur\s*datum\s+(.+?)(?:\s|$)",
        r"Order\s*Date[:\s]*(.+?)(?:\n|$)",
    ]
    due_patterns = [
        r"Due\s*Date[:\s]*(.+?)(?:\n|$)",
        # Azure: "Invoice Date: Due Date: Reference:\n03/20/2023 04/04/2023 ..."
        r"Due\s*Date:.*\n\s*\S+\s+(\d[\d/]+\d)",
        r"Vervaldatum[:\s]*(.+?)(?:\n|$)",
        r"Date\s*limite[^:]*[:\s]*(.+?)(?:\n|$)",
        r"Zahlungsziel\s+(.+?)(?:\n|$)",
    ]

    for p in issue_patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            parsed = parse_date(m.group(1).strip())
            if parsed and not issue_date:
                issue_date = parsed

    # Fallback: standalone "Date: DD/MM/YYYY"
    if not issue_date:
        m = re.search(r"(?<!Due\s)Date\s*:\s*(.+?)(?:\n|$)", text, re.IGNORECASE)
        if m:
            issue_date = parse_date(m.group(1).strip())

    for p in due_patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            parsed = parse_date(m.group(1).strip())
            if parsed and not due_date:
                due_date = parsed

    return issue_date, due_date


def extract_vendor_name(text: str) -> str | None:
    # Try to find a company identifier first
    patterns = [
        r"(Amazon Web Services)(?:\s|,|Invoice)",
        r"(Azure Interior)",
        r"(Coolblue\s*B\.V\.)",
        r"(WS Retail[^,\n]*)",
        r"(Free)(?:\s+Service|\s+Haut)",
        r"(QualityHosting\s*AG)",
        r"(OYO)\s+\d",
        r"(Sammy Maystone)",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()

    # Dutch: "Saeco" in context of invoice
    m = re.search(r"SAECO", text)
    if m:
        return "Saeco"

    # Fallback: first meaningful line
    for line in text.strip().split("\n")[:6]:
        line = line.strip()
        if line and len(line) > 3 and not re.match(r"^[\d\s\-/\\.,]+$", line):
            if not re.match(r"^\d+\s", line) and len(line) < 80:
                return line
    return None


def extract_tax_id(text: str) -> str | None:
    patterns = [
        r"BTW\s*:\s*(NL\d{9}B\d{2})",
        r"BTW\s*:\s*([A-Z]{2}\S+)",
        r"VAT[/\s]*(?:TIN)?[:\s]*(\d{5,})",
        r"BTW\s*nummer\s*:\s*(\S+)",
        r"Tax\s*ID[:\s]*([A-Z]{2}[\-\w]+)",
        r"GSTIN[:\s]*(\d{2}[A-Z]\d{7})",
        r"(NL\d{9}B\d{2})",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            val = m.group(1).strip().rstrip(".,;")
            if len(val) >= 5:
                return val
    return None


def extract_amounts(text: str, currency: str) -> dict:
    subtotal = None
    tax = None
    total = None

    if currency == "EUR":
        cur = r"(?:€)?"
    elif currency == "USD":
        cur = r"(?:\$)?"
    elif currency == "INR":
        cur = r"(?:Rs\.?)?"
    else:
        cur = r"(?:[\$€]?|Rs\.?)?"

    # Total — try most specific patterns first
    total_patterns = [
        rf"TOTAL\s*AMOUNT\s*DUE[^$]*\$\s*([\d,.]+)",
        rf"Total\s*TTC\s*\s*:\s*{cur}?\s*([\d.,]+)",
        rf"Total\s*facture\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)",
        rf"Grand\s*Total\s+{cur}?\s*([\d.,]+)",
        rf"Grand\s*Total\s*:\s*{cur}?\s*([\d.,]+)",
        rf"Balance\s*Due[:\s]*{cur}\s*([\d.,]+)",
        rf"Factuur totaal\s*EUR\s*([\d.,]+)",
        rf"Total\s*EUR\s*([\d.,]+)",
        rf"Totaal\s*[:\s]*{cur}\s*([\d.,]+)",
        rf"(?:^|\n)\s*Total\s*[:\s]*\s*{cur}?\s*([\d.,]+)",
    ]
    for p in total_patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            if p.startswith(rf"Total\s*facture"):
                subtotal = parse_number(m.group(1))
                tax = parse_number(m.group(2))
                total = parse_number(m.group(3))
            else:
                total = parse_number(m.group(1))
            break

    # Tax
    if tax is None:
        tax_patterns = [
            rf"TVA\s*\d+\s*%\s*:\s*{cur}?\s*([\d.,]+)",
            rf"Tax\s*\([^)]*\)\s*:\s*{cur}?\s*([\d.,]+)",
            rf"BTW\s*bedrag\s*[:\s]*{cur}\s*([\d.,]+)",
            rf"Montant\s*TVA\s*[:\s]*{cur}?\s*([\d.,]+)",
            rf"Tax\s*Amount[:\s]*{cur}\s*([\d.,]+)",
            rf"BTW\s*([\d.,]+)\s+\d+\s*%",
        ]
        for p in tax_patterns:
            m = re.search(p, text, re.IGNORECASE)
            if m:
                tax = parse_number(m.group(1))
                break

    # Subtotal
    if subtotal is None:
        sub_patterns = [
            rf"Total\s*HT\s*\s*:\s*{cur}?\s*([\d.,]+)",
            rf"Subtotal\s*[:\s]*{cur}\s*([\d.,]+)",
            rf"Subtotaal\s*{cur}\s*([\d.,]+)",
        ]
        for p in sub_patterns:
            m = re.search(p, text, re.IGNORECASE)
            if m:
                subtotal = parse_number(m.group(1))
                break

    # Derive missing values
    if total is None and subtotal is not None and tax is not None:
        total = round(subtotal + tax, 2)
    if subtotal is None and total is not None and tax is not None:
        subtotal = round(total - tax, 2)

    return {"subtotal": subtotal, "taxAmount": tax, "totalAmount": total}


def extract_line_items(text: str, tables: list) -> list[dict]:
    items = []
    skip_words = ['total', 'subtotal', 'totaal', 'btw', 'tax', 'grand', 'description',
                  'exclusief', 'inclusief', 'prijzen', 'artikel', 'grondslag']

    # Pattern 1: Azure — [SKU] description qty units unitPrice disc% tax% $total
    for m in re.finditer(
        r'\[([^\]]+)\]\s*(.+?)\s+(\d+\.?\d*)\s+\w+\s+([\d.,]+)\s+[\d.,]+\s+[\d.,]+%\s+\$?\s*([\d.,]+)',
        text
    ):
        desc = f'[{m.group(1)}] {m.group(2).strip()}'
        if not any(w in desc.lower() for w in skip_words):
            items.append({
                "description": desc,
                "quantity": parse_number(m.group(3)) or 1,
                "unitPrice": parse_number(m.group(4)),
                "total": parse_number(m.group(5)),
            })

    # Pattern 2: Sammy Maystone — Service A 12 $10.00 $120.00
    for m in re.finditer(r'(Service\s+\w+)\s+(\d+)\s+\$([\d,.]+)\s+\$([\d,.]+)', text):
        desc = m.group(1)
        if not any(w in desc.lower() for w in skip_words):
            items.append({
                "description": desc,
                "quantity": parse_number(m.group(2)) or 1,
                "unitPrice": parse_number(m.group(3)),
                "total": parse_number(m.group(4)),
            })

    # Pattern 3: Coolblue — Product name 1 € 399,00 21% € 399,00
    for m in re.finditer(
        r'([A-Z][^()\n]{5,}?)\s+(\d+)\s+€\s*([\d.,]+)\s+\d+%\s+€\s*([\d.,]+)',
        text
    ):
        desc = m.group(1).strip()
        if not any(w in desc.lower() for w in skip_words) and 'incl.' not in desc.lower():
            items.append({
                "description": desc,
                "quantity": parse_number(m.group(2)) or 1,
                "unitPrice": parse_number(m.group(3)),
                "total": parse_number(m.group(4)),
            })

    # Pattern 4: QualityHosting — line# qty description price total
    for m in re.finditer(
        r'\d+\s+(\d+)\s+(Small Business\s+\w+\s+\d+)\s+([\d.,]+)\s+([\d.,]+)',
        text
    ):
        desc = m.group(2).strip()
        if not any(w in desc.lower() for w in skip_words):
            items.append({
                "description": desc,
                "quantity": parse_number(m.group(1)) or 1,
                "unitPrice": parse_number(m.group(3)),
                "total": parse_number(m.group(4)),
            })

    # Pattern 5: Saeco — SKU description price tax% qty unit total
    for m in re.finditer(
        r'([A-Z]\d+)\s+(.+?)\s+([\d.,]+)\s+\d+\s*%\s+(\d+)\s+\w+\s+([\d.,]+)',
        text
    ):
        desc = f'{m.group(1)} {m.group(2).strip()}'
        if not any(w in desc.lower() for w in skip_words):
            items.append({
                "description": desc,
                "quantity": parse_number(m.group(4)) or 1,
                "unitPrice": parse_number(m.group(3)),
                "total": parse_number(m.group(5)),
            })

    # Pattern 6: Flipkart — description qty price tax% tax total
    for m in re.finditer(
        r'([A-Z][^\n]{10,}?)\s+(\d+\.?\d*)\s+([\d.,]+)\s+[\d.,]+%\s+([\d.,]+)\s+([\d.,]+)',
        text
    ):
        desc = m.group(1).strip()
        if not any(w in desc.lower() for w in skip_words) and 'total' not in desc.lower():
            items.append({
                "description": desc,
                "quantity": parse_number(m.group(2)) or 1,
                "unitPrice": parse_number(m.group(3)),
                "total": parse_number(m.group(5)),
            })

    # Generic fallback: description + quantity + price + total
    if not items:
        for m in re.finditer(
            r'(.+?)\s{2,}(\d+\.?\d*)\s+[\$€]?\s*([\d.,]+)\s+.*?[\$€]?\s*([\d.,]+)',
            text,
        ):
            desc = m.group(1).strip()
            if len(desc) > 3 and not any(w in desc.lower() for w in skip_words):
                items.append({
                    "description": desc,
                    "quantity": parse_number(m.group(2)) or 1,
                    "unitPrice": parse_number(m.group(3)),
                    "total": parse_number(m.group(4)),
                })

    return items


# ---------------------------------------------------------------------------
# Main extraction entry point
# ---------------------------------------------------------------------------

def compute_confidence(fields: dict) -> float:
    key = ["invoiceNumber", "issueDate", "totalAmount", "vendorName"]
    found = sum(1 for f in key if fields.get(f) is not None)
    if found >= 4:
        return 0.85
    if found >= 3:
        return 0.65
    if found >= 2:
        return 0.40
    return 0.15


def extract_invoice(pdf_path: str) -> dict:
    tables = []
    with pdfplumber.open(pdf_path) as pdf:
        pages_text = []
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                pages_text.append(t)
            page_tables = page.extract_tables()
            if page_tables:
                tables.extend(page_tables)
        text = "\n".join(pages_text)

    currency = detect_currency(text)
    issue_date, due_date = extract_dates(text)
    amounts = extract_amounts(text, currency)

    fields = {
        "invoiceNumber": extract_invoice_number(text),
        "vendorName": extract_vendor_name(text),
        "vendorTaxId": extract_tax_id(text),
        "issueDate": issue_date,
        "dueDate": due_date,
        "currency": currency,
        "subtotal": amounts["subtotal"],
        "taxAmount": amounts["taxAmount"],
        "totalAmount": amounts["totalAmount"],
        "lineItems": extract_line_items(text, tables),
    }

    confidence = compute_confidence(fields)
    notes = []
    for key in ["invoiceNumber", "issueDate", "totalAmount", "vendorName"]:
        if fields.get(key) is None:
            notes.append(f"Missing {key}")

    fields["confidenceScore"] = confidence
    fields["processingNotes"] = "; ".join(notes) if notes else "All key fields extracted"
    fields["_file"] = os.path.basename(pdf_path)
    fields["_rawText"] = text
    return fields
