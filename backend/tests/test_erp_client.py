import pytest
from services.erp_client import (
    get_companies,
    get_processed_invoices,
    reset_processed_invoices,
    submit_invoice,
)


@pytest.mark.asyncio
async def test_get_companies():
    companies = await get_companies()
    assert isinstance(companies, list)
    assert len(companies) > 0
    first = companies[0]
    assert "name" in first
    assert "taxId" in first


@pytest.mark.asyncio
async def test_submit_and_list_invoice():
    await reset_processed_invoices()

    payload = {
        "fileName": "TestInvoice.pdf",
        "extractedData": {
            "invoiceNumber": "TEST-001",
            "vendorName": "Test Vendor",
            "totalAmount": 100.0,
        },
        "confidenceScore": 0.95,
        "processingNotes": "Integration test",
    }
    result = await submit_invoice(payload)
    assert "id" in result

    listed = await get_processed_invoices()
    assert listed["total"] >= 1


@pytest.mark.asyncio
async def test_reset_processed_invoices():
    result = await reset_processed_invoices()
    assert "deleted" in result
    assert isinstance(result["deleted"], int)
