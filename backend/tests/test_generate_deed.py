import pytest
from fastapi.testclient import TestClient
from main import app  # Your FastAPI app

client = TestClient(app)

@pytest.fixture
def sample_grant_deed_data():
    return {
        "deed_type": "grant_deed",
        "data": {
            "recording_requested_by": "Test Agent",
            "mail_to": "123 Main St, Anytown CA 90210",
            "order_no": "12345",
            "escrow_no": "67890",
            "apn": "987-654-321",
            "documentary_tax": "500.00",
            "city": "Anytown",
            "grantor": "John Doe",
            "grantee": "Jane Smith",
            "county": "Los Angeles",
            "property_description": "Lot 1, Block 2, Tract 1234, as per map recorded in Book 56, Page 78 of Maps, in the office of the County Recorder of Los Angeles County, California.",
            "date": "2025-01-24",
            "grantor_signature": "John Doe",
            "county_notary": "Los Angeles",
            "notary_date": "2025-01-24",
            "notary_name": "Mary Public Notary",
            "appeared_before_notary": "John Doe",
            "notary_signature": "Mary Public Notary"
        }
    }

@pytest.fixture
def sample_quitclaim_deed_data():
    return {
        "deed_type": "quitclaim_deed",
        "data": {
            "recording_requested_by": "Test Agent",
            "mail_to": "456 Oak Ave, Testville CA 90211",
            "order_no": "54321",
            "escrow_no": "09876",
            "apn": "123-456-789",
            "documentary_tax": "750.00",
            "city": "Testville",
            "grantor": "Alice Johnson",
            "grantee": "Bob Wilson",
            "county": "Orange",
            "property_description": "Lot 5, Block 10, Tract 5678, as per map recorded in Book 89, Page 12 of Maps, in the office of the County Recorder of Orange County, California.",
            "date": "2025-01-24",
            "grantor_signature": "Alice Johnson",
            "county_notary": "Orange",
            "notary_date": "2025-01-24",
            "notary_name": "Robert Notary Public",
            "appeared_before_notary": "Alice Johnson",
            "notary_signature": "Robert Notary Public"
        }
    }

def test_generate_grant_deed(sample_grant_deed_data):
    """Test Grant Deed generation with pixel-perfect HTML and PDF output"""
    response = client.post("/generate-deed", json=sample_grant_deed_data)
    assert response.status_code == 200
    
    result = response.json()
    html = result["html"]
    pdf_base64 = result["pdf_base64"]
    
    # Check HTML structure and data injection
    assert "GRANT DEED" in html
    assert "John Doe" in html  # Grantor name injected
    assert "Jane Smith" in html  # Grantee name injected
    assert "Los Angeles" in html  # County injected
    assert "987-654-321" in html  # APN injected
    
    # Check pixel-perfect CSS
    assert "@page { size: 8.5in 11in; margin: 1in;" in html
    assert "font-family: 'Times New Roman', serif" in html
    assert "font-size: 12pt" in html
    assert "line-height: 1.5" in html
    
    # Ensure PDF was generated
    assert pdf_base64 is not None
    assert len(pdf_base64) > 0

def test_generate_quitclaim_deed(sample_quitclaim_deed_data):
    """Test Quitclaim Deed generation with pixel-perfect HTML and PDF output"""
    response = client.post("/generate-deed", json=sample_quitclaim_deed_data)
    assert response.status_code == 200
    
    result = response.json()
    html = result["html"]
    pdf_base64 = result["pdf_base64"]
    
    # Check HTML structure and data injection
    assert "QUITCLAIM DEED" in html
    assert "Alice Johnson" in html  # Grantor name injected
    assert "Bob Wilson" in html  # Grantee name injected
    assert "Orange" in html  # County injected
    assert "123-456-789" in html  # APN injected
    
    # Check pixel-perfect CSS
    assert "@page { size: 8.5in 11in; margin: 1in;" in html
    assert "font-family: 'Times New Roman', serif" in html
    
    # Ensure PDF was generated
    assert pdf_base64 is not None
    assert len(pdf_base64) > 0

def test_invalid_deed_type():
    """Test error handling for invalid deed type"""
    invalid_data = {
        "deed_type": "invalid_deed",
        "data": {"test": "data"}
    }
    response = client.post("/generate-deed", json=invalid_data)
    assert response.status_code == 500  # Should return error for missing template

def test_missing_data_fields():
    """Test error handling for missing required data fields"""
    incomplete_data = {
        "deed_type": "grant_deed",
        "data": {
            "grantor": "John Doe"
            # Missing other required fields
        }
    }
    response = client.post("/generate-deed", json=incomplete_data)
    # Should still work but with empty fields in template
    assert response.status_code == 200
    html = response.json()["html"]
    assert "John Doe" in html 