"""
Quick HTML Preview for PDF Templates
Generates HTML without PDF conversion for fast iteration
"""
from jinja2 import Environment, FileSystemLoader
import os
import webbrowser
from datetime import datetime

# Setup Jinja2
template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
env = Environment(loader=FileSystemLoader(template_dir))

def preview_grant_deed():
    """Generate Grant Deed HTML preview"""
    template = env.get_template("grant_deed_ca/index.jinja2")
    
    # Sample data
    html = template.render(
        requested_by="Pacific Coast Title Company",
        title_company="Pacific Coast Title",
        title_order_no="2024-12345",
        escrow_no="ESC-98765",
        apn="5432-016-042",
        county="LOS ANGELES",
        grantors_text="JOHN DOE and JANE DOE, husband and wife",
        grantees_text="ROBERT SMITH and MARY SMITH, husband and wife as joint tenants",
        legal_description="LOT 15 OF TRACT NO. 12345, IN THE CITY OF LOS ANGELES, COUNTY OF LOS ANGELES, STATE OF CALIFORNIA, AS PER MAP RECORDED IN BOOK 123, PAGES 45 TO 50 INCLUSIVE OF MAPS, IN THE OFFICE OF THE COUNTY RECORDER OF SAID COUNTY. THIS IS A VERY LONG LEGAL DESCRIPTION TO TEST THE EXHIBIT THRESHOLD FUNCTIONALITY. IT CONTAINS MULTIPLE SENTENCES AND DETAILED PROPERTY INFORMATION THAT WOULD TYPICALLY REQUIRE AN EXHIBIT PAGE. THE PROPERTY IS LOCATED IN A RESIDENTIAL NEIGHBORHOOD AND INCLUDES ALL IMPROVEMENTS, EASEMENTS, AND APPURTENANCES THERETO BELONGING OR IN ANYWISE APPERTAINING.",
        execution_date="2025-11-05",
        return_to={
            "name": "John Doe",
            "address1": "123 Main Street",
            "address2": "Suite 100",
            "city": "Los Angeles",
            "state": "CA",
            "zip": "90001"
        },
        dtt={
            "amount": "500.00",
            "basis": "full_value",
            "area_type": "city",
            "city_name": "Los Angeles"
        },
        recorder_profile={
            "order_no": "2024-12345",
            "escrow_no": "ESC-98765"
        },
        exhibit_threshold=600,
        now=datetime.now,
        datetime=datetime
    )
    
    # Save to file
    output_file = os.path.join(os.path.dirname(__file__), 'preview_grant_deed.html')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"✅ Grant Deed HTML saved to: {output_file}")
    return output_file

def preview_quitclaim_deed():
    """Generate Quitclaim Deed HTML preview"""
    template = env.get_template("quitclaim_deed_ca/index.jinja2")
    
    # Sample data
    html = template.render(
        REQUESTED_BY="Pacific Coast Title Company",
        TITLE_ORDER="2024-12345",
        ESCROW_NO="ESC-98765",
        MAIL_TO_NAME="John Doe",
        MAIL_TO_ADDRESS="123 Main Street, Suite 100",
        MAIL_TO_CITY_STATE_ZIP="Los Angeles, CA 90001",
        APN="5432-016-042",
        COUNTY="LOS ANGELES",
        DTT_AMOUNT="500.00",
        CITY_TAX="Yes",
        CITY_NAME="Los Angeles",
        GRANTORS="JOHN DOE and JANE DOE, husband and wife",
        GRANTEES="ROBERT SMITH and MARY SMITH, husband and wife as joint tenants",
        LEGAL_DESCRIPTION="LOT 15 OF TRACT NO. 12345, IN THE CITY OF LOS ANGELES, COUNTY OF LOS ANGELES, STATE OF CALIFORNIA, AS PER MAP RECORDED IN BOOK 123, PAGES 45 TO 50 INCLUSIVE OF MAPS, IN THE OFFICE OF THE COUNTY RECORDER OF SAID COUNTY. THIS IS A VERY LONG LEGAL DESCRIPTION TO TEST THE EXHIBIT THRESHOLD FUNCTIONALITY.",
        EXECUTION_DATE="November 5, 2025",
        execution_date="November 5, 2025",
        exhibit_threshold=600,
        now=datetime.now,
        datetime=datetime
    )
    
    # Save to file
    output_file = os.path.join(os.path.dirname(__file__), 'preview_quitclaim_deed.html')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"✅ Quitclaim Deed HTML saved to: {output_file}")
    return output_file

if __name__ == "__main__":
    print("=" * 60)
    print("📄 PDF Template HTML Preview Generator")
    print("=" * 60)
    print()
    
    # Generate both
    grant_file = preview_grant_deed()
    quitclaim_file = preview_quitclaim_deed()
    
    print()
    print("=" * 60)
    print("✅ Preview files generated!")
    print("=" * 60)
    print()
    print("Open these files in your browser to preview:")
    print(f"  - {grant_file}")
    print(f"  - {quitclaim_file}")
    print()
    print("💡 Tip: Edit the template files and re-run this script")
    print("   to see changes instantly without PDF generation!")
    
    # Ask if user wants to open in browser
    try:
        response = input("\nOpen Grant Deed preview in browser? (y/n): ")
        if response.lower() == 'y':
            webbrowser.open('file://' + os.path.abspath(grant_file))
            print("✅ Opened in browser!")
    except:
        pass

