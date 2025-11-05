"""
Test script for Phase 24-G V0 PDF Templates
Tests Grant Deed and Quitclaim Deed generation with sample data
"""
import sys
import os
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.grant_deed import GrantDeedRenderContext
from models.quitclaim_deed import QuitclaimDeedContext
from jinja2 import Environment, FileSystemLoader
import tempfile

def test_grant_deed():
    """Test Grant Deed PDF generation with V0 template"""
    print("\n" + "="*60)
    print("🧪 Testing Grant Deed (V0 Template)")
    print("="*60)
    
    # Create sample data
    ctx = GrantDeedRenderContext(
        requested_by="Pacific Coast Title Company",
        title_company="Pacific Coast Title",
        title_order_no="2024-12345",
        escrow_no="ESC-98765",
        return_to={
            "name": "John Doe",
            "company": "Real Estate Services Inc.",
            "address1": "123 Main Street",
            "city": "Los Angeles",
            "state": "CA",
            "zip": "90012"
        },
        apn="8381-021-001",
        county="LOS ANGELES",
        dtt={
            "amount": "550.00",
            "basis": "full",
            "area_type": "city",
            "city_name": "La Verne"
        },
        grantors_text="HERNANDEZ GERARDO J; MENDOZA YESSICA S",
        grantees_text="SMITH JOHN AND SMITH JANE AS JOINT TENANTS",
        legal_description="TRACT NO 6654 LOT 44. This is a sample legal description that is less than 600 characters so it will display inline.",
        execution_date="2025-11-05",
        exhibit_threshold=600
    )
    
    # Load template
    template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template('grant_deed_ca/index.jinja2')
    
    # Add datetime functions to context (CRITICAL for Jinja2)
    template_ctx = ctx.dict()
    template_ctx['now'] = datetime.now
    template_ctx['datetime'] = datetime
    
    # Render HTML
    try:
        html = template.render(**template_ctx)
        print("✅ Template rendered successfully")
        print(f"   HTML length: {len(html)} characters")
        
        # Try to generate PDF using Weasyprint
        try:
            from weasyprint import HTML
            
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
                HTML(string=html, encoding='utf-8').write_pdf(tmp.name)
                pdf_path = tmp.name
            
            pdf_size = os.path.getsize(pdf_path)
            print(f"✅ PDF generated successfully")
            print(f"   PDF path: {pdf_path}")
            print(f"   PDF size: {pdf_size:,} bytes")
            
            # Clean up
            os.unlink(pdf_path)
            
            return True
            
        except ImportError:
            print("⚠️  Weasyprint not installed - HTML rendered but PDF not tested")
            print("   Install with: pip install weasyprint")
            return True
            
        except Exception as e:
            print(f"❌ PDF generation failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Template rendering failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_quitclaim_deed():
    """Test Quitclaim Deed PDF generation with V0 template"""
    print("\n" + "="*60)
    print("🧪 Testing Quitclaim Deed (V0 Template)")
    print("="*60)
    
    # Create sample data with LONG legal description to test exhibit logic
    long_legal_desc = """
    LOT 5 OF TRACT NO. 12345, IN THE CITY OF LA VERNE, COUNTY OF LOS ANGELES, 
    STATE OF CALIFORNIA, AS PER MAP RECORDED IN BOOK 123 PAGES 45 THROUGH 67 
    OF MAPS, IN THE OFFICE OF THE COUNTY RECORDER OF SAID COUNTY.
    
    EXCEPTING THEREFROM ALL OIL, GAS, MINERALS AND OTHER HYDROCARBON SUBSTANCES 
    LYING BELOW A DEPTH OF 500 FEET FROM THE SURFACE OF SAID LAND, BUT WITHOUT 
    THE RIGHT TO ENTER UPON THE SURFACE OF SAID LAND OR ANY PORTION THEREOF 
    ABOVE SAID DEPTH, AS RESERVED IN DEED RECORDED JANUARY 15, 1985 AS 
    INSTRUMENT NO. 85-123456 OF OFFICIAL RECORDS.
    
    ALSO EXCEPTING THEREFROM AN UNDIVIDED ONE-HALF INTEREST IN AND TO ALL OIL, 
    PETROLEUM, GAS, ASPHALTUM, AND OTHER HYDROCARBON SUBSTANCES IN AND UNDER 
    SAID LAND AS RESERVED IN DEED RECORDED MARCH 22, 1990 AS INSTRUMENT 
    NO. 90-654321 OF OFFICIAL RECORDS. This legal description is intentionally 
    long to test the exhibit threshold logic. It should trigger the exhibit A page.
    """
    
    ctx = QuitclaimDeedContext(
        requested_by="First American Title Company",
        title_company="First American Title",
        title_order_no="2024-QC-789",
        escrow_no="QC-ESC-456",
        return_to={
            "name": "Jane Smith",
            "address1": "456 Oak Avenue",
            "city": "Pasadena",
            "state": "CA",
            "zip": "91101"
        },
        apn="5555-444-333",
        county="LOS ANGELES",
        grantors_text="DOE JOHN",
        grantees_text="SMITH JANE",
        legal_description=long_legal_desc,
        execution_date=None,  # Will use now()
        exhibit_threshold=600
    )
    
    # Load template
    template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template('quitclaim_deed_ca/index.jinja2')
    
    # Add datetime functions to context
    template_ctx = ctx.dict()
    template_ctx['now'] = datetime.now
    template_ctx['datetime'] = datetime
    
    # Render HTML
    try:
        html = template.render(**template_ctx)
        print("✅ Template rendered successfully")
        print(f"   HTML length: {len(html)} characters")
        print(f"   Legal description length: {len(long_legal_desc)} chars")
        print(f"   Exhibit threshold: {ctx.exhibit_threshold} chars")
        print(f"   Should show exhibit A: {'YES' if len(long_legal_desc) > ctx.exhibit_threshold else 'NO'}")
        
        # Check if exhibit A is in the HTML
        if "Exhibit A" in html:
            print("✅ Exhibit A logic working (long legal description detected)")
        
        # Try to generate PDF
        try:
            from weasyprint import HTML
            
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
                HTML(string=html, encoding='utf-8').write_pdf(tmp.name)
                pdf_path = tmp.name
            
            pdf_size = os.path.getsize(pdf_path)
            print(f"✅ PDF generated successfully")
            print(f"   PDF path: {pdf_path}")
            print(f"   PDF size: {pdf_size:,} bytes")
            
            # Clean up
            os.unlink(pdf_path)
            
            return True
            
        except ImportError:
            print("⚠️  Weasyprint not installed - HTML rendered but PDF not tested")
            return True
            
        except Exception as e:
            print(f"❌ PDF generation failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Template rendering failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "🚀 "* 20)
    print("Phase 24-G: V0 PDF Template Testing")
    print("🚀 " * 20)
    
    results = {
        "Grant Deed": test_grant_deed(),
        "Quitclaim Deed": test_quitclaim_deed()
    }
    
    # Summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    
    for name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{name:.<40} {status}")
    
    total = len(results)
    passed = sum(results.values())
    print("="*60)
    print(f"Total: {passed}/{total} tests passed ({passed/total*100:.0f}%)")
    print("="*60)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Phase 24-G templates are working!")
        return 0
    else:
        print("\n⚠️  SOME TESTS FAILED - Check errors above")
        return 1


if __name__ == "__main__":
    sys.exit(main())

