# Pre-Listing Report Analysis & Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Business Purpose & Value](#business-purpose--value)
3. [Order Form Routing Logic](#order-form-routing-logic)
4. [Technical Implementation](#technical-implementation)
5. [Report Structure & Content](#report-structure--content)
6. [PDF Layout & Margin System](#pdf-layout--margin-system)
7. [Data Sources & Integration](#data-sources--integration)
8. [Document Generation Pipeline](#document-generation-pipeline)
9. [Admin Management Interface](#admin-management-interface)
10. [Performance & Security](#performance--security)
11. [Development Guidelines](#development-guidelines)

---

## 📊 Overview

The Pre-Listing Report is a sophisticated property analysis document designed specifically for **real estate listing agents** and **property sellers**. It provides comprehensive property information, title research, and identifies potential obstacles that sellers might face when listing their property.

### Key Components
- **File**: `pacificcosttitile-pct-orders-4aee9c3edffd/application/modules/frontend/views/report/instrument_report.php`
- **Generator**: `pacificcosttitile-pct-orders-4aee9c3edffd/application/libraries/order/Order.php`
- **Function**: `createLpReport($fileNumber, $regerateGeoDoc = false, $regenerate = false)`
- **File Prefix**: LP-00000001, LP-00000002, etc.

---

## 🎯 Business Purpose & Value

### Target Audience
- **Primary**: Real estate listing agents
- **Secondary**: Property sellers and marketing teams
- **Use Case**: Property marketing and due diligence before listing

### Value Proposition
- **Early Issue Detection**: Identifies title problems before listing
- **Professional Marketing**: High-quality reports for client presentations
- **Competitive Advantage**: Comprehensive property analysis tools
- **Time Savings**: Automated research and document generation

### Business Benefits

#### For Real Estate Agents
- Professional branded reports for client presentations
- Early identification of potential title issues
- Comprehensive property analysis in a single document
- Marketing advantage over competitors

#### For Property Sellers
- Transparency about property status and potential obstacles
- Professional service demonstration from title company
- Early problem identification allows time for resolution
- Clear understanding of property marketability

#### For Title Company
- Premium service offering for real estate partners
- Additional revenue stream beyond standard orders
- Client retention through value-added services
- Operational efficiency through automated generation

---

## 🔀 Order Form Routing Logic

### Core Decision Logic

The system determines whether to generate a pre-listing report or create a full order based on this primary condition:

```php
// File: pacificcosttitile-pct-orders-4aee9c3edffd/application/modules/frontend/controllers/order/Home.php (line 334)
if ((empty($_POST['EscrowId']) && empty($_POST['escrow_officer']) && 
     ($isEnable == 1 || ($SalesRep == '15340')) && 
     ($orderUser['is_allow_only_resware_orders'] == 0) && 
     ($orderUser['is_escrow'] != 1) && 
     $ProductTypeID == '20') || 
     ($ionReportStatusRequired == 'true')) {
    $lpOrderFlag = 1;
    // Pre-listing report path
} else {
    // Full order path
}
```

### Decision Matrix

| Condition | Pre-Listing Report | Full Order |
|-----------|-------------------|------------|
| **Product Type ID** | `== '20'` | `!= '20'` |
| **Client Type** | Non-escrow users | All users |
| **Escrow Officer** | Not assigned | Assigned |
| **LP Orders Enabled** | System enabled | Any |
| **User Restrictions** | `is_allow_only_resware_orders = 0` | Any |
| **ION Fraud Report** | Required = true | Not required |

### Client Type Classification

```php
// Database table: customer_basic_details
// Client types:
// 1. Escrow (is_escrow = 1)
// 2. Mortgage Broker (is_mortgage_user = 1) 
// 3. Lender (is_escrow = 0, is_mortgage_user = 0)
```

### LP File Number Generation

```php
// Pre-listing orders get special file numbering
if ($lpOrderFlag == 1) {
    $orderInfo = $this->home_model->getLastFileNumberForLpOrders();
    if (empty($orderInfo)) {
        $lp_file_number = 'LP-00000001';
        $file_id = 90000001;
    } else {
        $lp_file_number = ++$orderInfo['lp_file_number'];
        $file_id = ++$orderInfo['file_id'];
    }
}
```

**File Number Format**: 
- Pre-Listing: `LP-00000001`, `LP-00000002`, etc.
- File ID Range: Starting from 90000001
- Full Orders: Standard numbering via Resware integration

---

## 🔧 Technical Implementation

### Core Generation Function

**Location**: `pacificcosttitile-pct-orders-4aee9c3edffd/application/libraries/order/Order.php`

```php
public function createLpReport($fileNumber, $regerateGeoDoc = false, $regenerate = false)
{
    $document_name = 'pre_listing_report_' . $fileNumber . '.pdf';
    
    // Load required models and libraries
    $this->CI->load->model('order/titlePointData');
    $this->CI->load->model('order/home_model');
    $this->CI->load->library('order/titlepoint');
    
    // Get order and title point data
    $condition = array('where' => array('file_number' => $fileNumber));
    $titlePointDetails = $this->CI->titlePointData->gettitlePointDetails($condition);
    $file_id = $titlePointDetails[0]['file_id'];
    $orderDetails = $this->get_order_details($file_id);
    
    // Generate geographic document if needed
    if (!$regerateGeoDoc) {
        $this->CI->titlepoint->generateGeoDoc($postData);
    }
    
    // Process instrument data into sections
    $sectionGRecord = array_filter($titlePointInstrumentDetails, function ($v) {
        return ($v['display_in_section'] == 'G');
    });
    // ... additional section processing
    
    // Generate HTML from template
    $html = $this->CI->load->view('report/instrument_report', $instrumentRecordDetails, true);
    
    // Configure PDF generation
    $this->CI->load->library('snappy_pdf');
    $this->CI->snappy_pdf->pdf->setOption('zoom', '1.15');
    
    // Generate PDF
    $pdfFilePath = FCPATH . '/uploads/pre-listing-doc/' . $document_name;
    $this->CI->snappy_pdf->pdf->generateFromHtml($html, $pdfFilePath);
    
    // Upload to AWS S3 and record in database
    $this->uploadDocumentOnAwsS3($document_name, 'pre-listing-doc');
    $this->insertRecord($document_name, $file_id, $orderDetails);
}
```

### Dependencies

- **TitlePoint API**: Primary data source for property research
- **Snappy PDF**: HTML to PDF conversion library (wkhtmltopdf wrapper)
- **AWS S3**: Document storage and retrieval
- **CodeIgniter Framework**: MVC structure and database management

---

## 📄 Report Structure & Content

### Cover Page
- Pacific Coast Title Company branding
- Report title: "Listing Prelim Report"
- Property address and customer information
- Prepared for sales representative
- Date and order details

### Table of Contents & Introduction
- **Section A**: Property Information
- **Section B**: Beds, Baths, Zoning
- **Section C**: Current Ownership
- **Section D**: Taxes (1st & 2nd Installment)
- **Section E**: Legal Description
- **Section F**: Property Vesting
- **Section G**: Open Deeds of Trust
- **Section H**: Foreclosure Activity
- **Section I**: Liens & Items for Review

### Detailed Content Sections

#### Section A: Property Information
```html
<div class="table_title"><em>Section A:</em> Property</div>
<table class="table_a table">
    <tr>
        <td>Property Address</td>
        <td><?php echo $orderDetails['full_address']; ?></td>
    </tr>
    <tr>
        <td>APN</td>
        <td><?php echo $orderDetails['apn']; ?></td>
    </tr>
    <tr>
        <td>County</td>
        <td><?php echo $orderDetails['county']; ?></td>
    </tr>
    <tr>
        <td colspan="2">Brief Legal: <?php echo $orderDetails['legal_description']; ?></td>
    </tr>
</table>
```

#### Section B: Property Details
```html
<div class="table_title"><em>Section B:</em> Beds, Baths, & Zoning</div>
<table class="table_b table">
    <tr>
        <td>Bedrooms</td>
        <td><?php echo $titlePointDetails[0]['property_bedroom']; ?></td>
        <td>Property Type:</td>
        <td><?php echo $orderDetails['transaction_type']; ?></td>
    </tr>
    <tr>
        <td>Bathrooms</td>
        <td><?php echo $titlePointDetails[0]['property_bathroom']; ?></td>
        <td>Zoning:</td>
        <td><?php echo $titlePointDetails[0]['property_zoning']; ?></td>
    </tr>
    <tr>
        <td>Square Feet</td>
        <td><?php echo $titlePointDetails[0]['property_squarefeet']; ?></td>
        <td>ADU:</td>
        <td>Eligible</td>
    </tr>
</table>
```

#### Section D: Tax Information
```html
<div class="table_title"><em>Section D:</em> Property Taxes</div>
<table class="table_b table">
    <tr>
        <td colspan="2" class="text_center f900">1st Installment</td>
        <td colspan="2" class="text_center f900">2nd Installment</td>
    </tr>
    <tr>
        <td>Balance:</td>
        <td>$<?php echo $firstInstallment['Balance']; ?></td>
        <td>Balance:</td>
        <td>$<?php echo $secondInstallment['Balance']; ?></td>
    </tr>
    <!-- Additional tax installment details -->
</table>
```

---

## 📐 PDF Layout & Margin System

### Page Structure

#### Page Size Definitions
```css
.size_a4 { width: 8.3in; height: 11.7in; }
.size_letter { width: 8.5in; height: 11in; }
.size_executive { width: 7.25in; height: 10.5in; }
```

#### Three-Zone Layout Architecture

**1. PDF Header Zone**
```css
.pdf_header {
    position: absolute;
    top: 0;
    height: .8in;
    left: 0;
    right: 0;
}
```
- **Height**: 0.8 inches from top
- **Content**: Logo and company address

**2. PDF Body Zone (Main Content Area)**
```css
.pdf_body {
    position: absolute;
    top: 1in;
    bottom: 1.2in;
    left: 0;
    right: 0;
}
```
- **Top Margin**: 1 inch (creates 0.2in buffer below header)
- **Bottom Margin**: 1.2 inches (leaves space for footer)
- **Content Area**: Dynamic height based on page content

**3. PDF Footer Zone**
```css
.pdf_footer {
    position: absolute;
    bottom: 0;
    height: .5in;
    left: 0;
    right: 0;
    padding-top: 10px;
    border-top: 4px solid #333;
}
```
- **Height**: 0.5 inches from bottom
- **Border**: 4px solid black line separator

### Layout Measurements Summary

| Element | Top | Bottom | Left | Right | Height |
|---------|-----|--------|------|-------|---------|
| **Page Header** | 0 | - | 0 | 0 | 0.8in |
| **Page Body** | 1in | 1.2in | 0 | 0 | Dynamic |
| **Page Footer** | - | 0 | 0 | 0 | 0.5in |

### Header Layout Structure

```css
.logo_container {
    float: left;
}
.logo_container img {
    width: 320px;
}
.header_address {
    float: right;
    text-align: right;
    font-size: 16px;
    line-height: 19px;
}
```

### Table Structure & Spacing

```css
.table_title {
    font-weight: 900;
    background-color: #f2f3f4;
    border: 1px solid #e8e9ea;
    padding: 5px 8px;
    font-size: 16px;
    margin-top: 21px;
}

.table {
    border: 1px solid #e8e9ea;
    border-top: 0;
    width: 100%;
    border-collapse: collapse;
}

.table td {
    padding: 5px 8px;
}
```

### Column Width Specifications

```css
/* Two-column tables */
.table_a td:first-child { width: 20%; }
.table_b td:nth-of-type(odd) { width: 20%; }
.table_b td:nth-of-type(even) { width: 30%; }

/* Complex tables (Sections G, H, I) */
.table_g td:first-child { width: 5%; }
.table_g td:nth-child(2) { width: 20%; }
.table_g td:nth-child(3) { width: 12%; }
.table_g td:nth-child(4) { width: 39%; }
.table_g td:nth-child(5) { width: 14%; }
.table_g td:nth-child(6) { width: 10%; }
```

### Typography System

```css
body {
    font-family: 'Montserrat', sans-serif;
    margin: 0;
    padding: 0;
}

.body_text {
    font-family: 'Lato', sans-serif;
    line-height: 30px;
    font-size: 16px;
}

.main_title {
    font-size: 36px;
}
```

### PDF Generation Configuration

```php
$this->CI->load->library('snappy_pdf');
$this->CI->snappy_pdf->pdf->setOption('zoom', '1.15');
$this->CI->snappy_pdf->pdf->generateFromHtml($html, $pdfFilePath);
```
- **Library**: Snappy PDF (wkhtmltopdf wrapper)
- **Zoom Level**: 115% scaling for optimal readability

---

## 🔗 Data Sources & Integration

### 1. TitlePoint API Data
- **Property details**: Bedrooms, bathrooms, square footage, zoning
- **Legal description**: Detailed property legal descriptions
- **Vesting information**: Property ownership details
- **Tax information**: First and second installment data
- **Title instruments**: Deeds, liens, notices

### 2. Order Management System
- **Customer information**: Name, address, company details
- **Property address**: Full address and APN
- **Order details**: File number, escrow number, dates
- **Sales representative**: Assigned agent information

### 3. Document Classification System

```php
// Instruments are categorized into sections
$sectionGRecord = array_filter($titlePointInstrumentDetails, function ($v) {
    return ($v['display_in_section'] == 'G');
});
$sectionHRecord = array_filter($titlePointInstrumentDetails, function ($v) {
    return ($v['display_in_section'] == 'H');
});
$sectionIRecord = array_filter($titlePointInstrumentDetails, function ($v) {
    return ($v['display_in_section'] == 'I');
});
```

**Section Classifications**:
- **Section G**: Open Deeds of Trust
- **Section H**: Foreclosure Activity
- **Section I**: Liens, Notices, and Violations

---

## 🏗️ Document Generation Pipeline

### 1. Data Collection Phase
```php
$titlePointDetails = $this->CI->titlePointData->gettitlePointDetails($condition);
$file_id = $titlePointDetails[0]['file_id'];
$orderDetails = $this->get_order_details($file_id);
```

### 2. Geographic Document Generation
```php
if (!$regerateGeoDoc) {
    $this->CI->titlepoint->generateGeoDoc($postData);
}
```

### 3. Template Processing
```php
$instrumentRecordDetails['orderDetails'] = $orderDetails;
$instrumentRecordDetails['titlePointDetails'] = $titlePointDetails;
$instrumentRecordDetails['sectionGRecord'] = array_values($sectionGRecord);
$instrumentRecordDetails['sectionHRecord'] = array_values($sectionHRecord);
$instrumentRecordDetails['sectionIRecord'] = array_values($sectionIRecord);

$html = $this->CI->load->view('report/instrument_report', $instrumentRecordDetails, true);
```

### 4. PDF Generation
```php
$this->CI->load->library('snappy_pdf');
$this->CI->snappy_pdf->pdf->setOption('zoom', '1.15');

if (!is_dir('uploads/pre-listing-doc')) {
    mkdir('./uploads/pre-listing-doc', 0777, true);
}

$pdfFilePath = FCPATH . '/uploads/pre-listing-doc/' . $document_name;
$this->CI->snappy_pdf->pdf->generateFromHtml($html, $pdfFilePath);
```

### 5. Cloud Storage & Database Recording
```php
$this->uploadDocumentOnAwsS3($document_name, 'pre-listing-doc');
$this->insertRecord($document_name, $file_id, $orderDetails);
```

### 6. Background Processing Integration
```php
try {
    $command = "php " . FCPATH . "index.php frontend/order/cron generatealldocumentfromtitlepoint $fileNumber > /dev/null &";
    exec($command);
} catch (\Throwable $th) {
    // Error handling
}
```

---

## 🖥️ Admin Management Interface

### Document Listing Interface
**File**: `pacificcosttitile-pct-orders-4aee9c3edffd/application/modules/admin/views/order/home/pre_listing_document.php`

```html
<div class="card-header">
    <i class="fas fa-table"></i>
    Pre Listing Documents
</div>
<div class="card-body">
    <div class="table-responsive">
        <table class="table table-bordered" id="tbl-pre-listing-documents-listing">
            <thead>
                <tr>
                    <th>Sr No</th>
                    <th>File Number</th>
                    <th>Document Name</th>
                    <th>Created At</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>
</div>
```

### Controller Functions
```php
// File: pacificcosttitile-pct-orders-4aee9c3edffd/application/modules/admin/controllers/order/Home.php

public function pre_listing_document()
{
    $data = array();
    $data['title'] = 'PCT Order: Pre Listing Documents';
    $this->admintemplate->show("order/home", "pre_listing_document", $data);
}

public function get_pre_listing_document_list()
{
    $params = array();
    // DataTables parameters processing
    $pre_listing_document_lists = $this->home_model->get_pre_listing_document_list($params);
    // Return JSON response for DataTables
}
```

### Download Functionality
```javascript
function downloadDocumentFromAws(url, documentType) {
    $('#page-preloader').css('display', 'block');
    var filename = url.substr(url.lastIndexOf("/") + 1);
    
    $.ajax({
        url: base_url + "download-aws-document-admin",
        type: "post",
        data: { url: url },
        success: function (response) {
            if (response) {
                var csvURL = 'data:application/octet-stream;base64,' + response;
                var element = document.createElement('a');
                element.setAttribute('href', csvURL);
                element.setAttribute('download', documentType + "_" + filename);
                element.click();
            }
        }
    });
}
```

---

## ⚡ Performance & Security

### Performance Optimizations

#### Background Processing
- Long-running reports executed asynchronously via `exec()` calls
- Prevents web request timeouts for complex property research

#### Caching Strategy
- TitlePoint data cached to avoid redundant API calls
- Geographic documents reused when available

#### Template Optimization
- Efficient HTML rendering for PDF generation
- Minimal CSS for faster processing

#### Storage Management
- Organized S3 folder structure: `pre-listing-doc/`
- Local temporary files cleaned up after S3 upload

### Security Considerations

#### File Access Control
- Documents stored in secured AWS S3 buckets
- Access controlled through application authentication

#### Data Validation
- Input sanitization for all user-provided data
- SQL injection prevention through prepared statements

#### API Security
- TitlePoint API credentials managed through environment variables
- Rate limiting and error handling for external API calls

---

## 🛠️ Development Guidelines

### Code Organization

#### File Structure
```
application/
├── libraries/order/
│   └── Order.php                 # Core report generation logic
├── modules/frontend/
│   ├── controllers/order/
│   │   └── Home.php             # Order processing controller
│   └── views/report/
│       └── instrument_report.php # PDF template
└── modules/admin/
    ├── controllers/order/
    │   └── Home.php             # Admin management
    └── views/order/home/
        └── pre_listing_document.php # Admin interface
```

#### Database Schema
```sql
-- Order table with LP file number
ALTER TABLE pct_order_details ADD COLUMN lp_file_number VARCHAR(255);

-- Document tracking
ALTER TABLE pct_order_documents ADD COLUMN is_pre_listing_report_doc TINYINT(1);
```

### Extension Points

#### Adding New Sections
1. Update `instrument_report.php` template
2. Add section filtering logic in `Order.php`
3. Extend CSS styles for new section formatting

#### Customizing Layout
1. Modify CSS classes in template header
2. Adjust margin measurements for print requirements
3. Update PDF generation options as needed

#### API Integration
1. Add new data sources in data collection phase
2. Extend template variables for new data
3. Update background processing as needed

### Testing Considerations

#### PDF Generation Testing
- Test across different property types and data scenarios
- Verify page breaks and content flow
- Validate PDF rendering across different browsers/systems

#### Performance Testing
- Monitor background job execution times
- Test with large datasets and complex property histories
- Validate AWS S3 upload/download performance

#### Data Integrity Testing
- Verify TitlePoint API data accuracy
- Test error handling for missing or incomplete data
- Validate template rendering with edge cases

---

## 🔄 Maintenance & Troubleshooting

### Common Issues

#### PDF Generation Failures
- **Symptom**: Empty or corrupted PDF files
- **Cause**: Missing wkhtmltopdf dependencies or memory limits
- **Solution**: Check server configuration and increase memory limits

#### Missing Data in Reports
- **Symptom**: Blank sections or "No data found" messages
- **Cause**: TitlePoint API connectivity or data classification issues
- **Solution**: Verify API credentials and section mapping logic

#### Template Rendering Issues
- **Symptom**: Broken layouts or missing styling
- **Cause**: CSS conflicts or missing font resources
- **Solution**: Review CSS inheritance and font loading

### Monitoring

#### Log Files
- Check `application/logs/` for PDF generation errors
- Monitor TitlePoint API response logs
- Review AWS S3 upload/download logs

#### Performance Metrics
- Track average report generation time
- Monitor TitlePoint API response times
- Measure AWS S3 storage usage

### Updates and Maintenance

#### Regular Maintenance Tasks
- Clean up temporary PDF files in `uploads/pre-listing-doc/`
- Archive old reports based on retention policies
- Update TitlePoint API integration as needed

#### Version Control
- Tag releases with version numbers
- Document template changes and their business impact
- Maintain backward compatibility for existing reports

---

## 📞 Support & Resources

### Technical Contacts
- **PDF Generation Issues**: Review Snappy PDF documentation
- **TitlePoint Integration**: Check TitlePoint API documentation
- **AWS S3 Storage**: Verify bucket permissions and access keys

### Documentation Links
- [TitlePoint API Documentation](docs/api-integration-guide.md)
- [Order Management Workflow](docs/order-management-workflow.md)
- [AWS S3 Configuration](docs/launch-setup-guide.md)

### Development Resources
- **Template Files**: `application/modules/frontend/views/report/`
- **Core Logic**: `application/libraries/order/Order.php`
- **Admin Interface**: `application/modules/admin/`

---

*This document provides comprehensive coverage of the Pre-Listing Report system, from business requirements through technical implementation details. It serves as both a reference guide for developers and a specification document for stakeholders.*
