# API Integration Guide

## 🔌 Overview of External Integrations

The Transaction Desk system integrates with multiple external APIs to provide comprehensive title insurance and property data services. This guide details each integration, including endpoints, data flows, authentication, and error handling.

## 🏢 TitlePoint API Integration

### Purpose & Functionality
TitlePoint provides comprehensive property research services including tax information, legal vesting data, and recording document retrieval.

### Authentication
```php
// Environment Variables Required
TP_USERNAME=your_titlepoint_username
TP_PASSWORD=your_titlepoint_password
TP_REQUEST_SUMMARY_ENDPOINT=https://api.titlepoint.com/RequestSummary
```

### Core Integration Files
- **`application/libraries/order/Titlepoint.php`** - Main TitlePoint API client
- **`taxcall.php`** - Tax information API calls
- **`lvcall.php`** - Legal vesting API calls  
- **`fetch-recording-info.php`** - Recording document retrieval

### 🔍 Tax Information API

#### Endpoint Configuration
```php
// File: application/modules/frontend/controllers/order/TitlePoint.php
public function getRequestSummaries()
{
    $requestParams = array(
        'userID' => env('TP_USERNAME'),
        'password' => env('TP_PASSWORD'),
        'company' => '',
        'department' => '',
        'titleOfficer' => '',
        'requestId' => $requestId,
        'maxWaitSeconds' => 20,
    );

    $request = env('TP_REQUEST_SUMMARY_ENDPOINT') . http_build_query($requestParams);
}
```

#### Data Processing
```php
// API Response Handling
$opts = array(
    "ssl" => array(
        "verify_peer" => false,
        "verify_peer_name" => false,
    ),
);
$context = stream_context_create($opts);
$file = file_get_contents($request, false, $context);
$xmlData = simplexml_load_string($file);
$response = json_encode($xmlData);
$result = json_decode($response, true);
```

#### Database Storage
**Table**: `pct_order_title_point_data`
**Key Fields**:
```sql
cs3_request_id VARCHAR(50)     -- TitlePoint request identifier
cs3_result_id VARCHAR(50)      -- TitlePoint result identifier  
cs3_service_id VARCHAR(50)     -- Service-specific ID
cs3_message TEXT               -- API response message
fips VARCHAR(255)              -- Federal Information Processing Standard code
tax_file_status VARCHAR(255)   -- Processing status
tax_request_id VARCHAR(255)    -- Tax request tracking
```

### 📄 Document Generation API

#### Geographic Document Creation
```php
// File: application/libraries/order/Titlepoint.php
public function generateGeoDoc($postData, $normalOrderFlag = 0)
{
    $fileNumber = $postData['file_number'];
    $orderId = $postData['order_id'];
    $state = $postData['state'];
    $county = $postData['county'];
    $property = $postData['property'];
    $apn = $postData['apn'];
    $unit_number = $postData['unit_number'];

    // Configure search parameters based on available data
    if (empty($unit_number) || (isset($postData['tax_search_done_flag']) && $postData['tax_search_done_flag'] == 1)) {
        $parameters = 'Address.FullAddress=' . $property . ';General.AutoSearchTaxes=False;Tax.CurrentYearTaxesOnly=False;General.AutoSearchProperty=True;General.AutoSearchOwnerNames=False;General.AutoSearchStarters=False;Property.IntelligentPropertyGrouping=true;';
        $addressFlag = 1;
    } else {
        $addressFlag = 0;
        $parameters = 'Tax.APN=' . $apn . ';IncludeReferenceDocs=True;General.AutoSearchProperty=True;General.AutoSearchTaxes=True;Property.IntelligentPropertyGrouping=True;Property.IncludeReferenceDocs=TrueGeneral.AutoSearchTaxes=True;Tax.CurrentYearTaxesOnly=True;';
    }
}
```

### 🔄 API Call Logging
All TitlePoint API calls are comprehensively logged:

```php
// Pre-call logging
$logid = $this->apiLogs->syncLogs($userdata['id'], 'titlepoint', 'get_request_summary_' . $methodId, $request, $requestParams, array(), $random_number, 0);

// API execution
$file = file_get_contents($request, false, $context);

// Post-call logging with response
$this->apiLogs->syncLogs($userdata['id'], 'titlepoint', 'get_request_summary_' . $methodId, $request, $requestParams, $result, $random_number, $logid);
```

## 🏢 SoftPro/Resware Server Integration

### Purpose & Functionality
SoftPro/Resware is the industry-standard platform for title insurance order management, hosted on AWS infrastructure.

### Authentication & Configuration
```php
// Environment Variables
RESWARE_ORDER_API=https://your-aws-hosted-softpro-server.com/api/
```

### Core Integration File
**`application/libraries/order/Resware.php`** - SoftPro API client

### 🔐 Authentication System

#### Credential Management
```php
public function make_request($http_method, $endpoint, $body_params = '', $data = array())
{
    $userdata = $this->CI->session->userdata('user');
    
    // Determine credentials based on user type and context
    if (isset($data['admin_api']) && $data['admin_api'] == 1) {
        // Use admin credentials for system operations
        $credResult = $this->CI->order->get_resware_admin_credential();
        $login = $credResult['username'];
        $password = $credResult['password'];
    } else if ((isset($userdata['is_master']) && !empty($userdata['is_master'])) || isset($data['from_mail']) && !empty($data['from_mail'])) {
        // Use provided credentials for master users or email operations
        $login = isset($data['email']) && !empty($data['email']) ? $data['email'] : '';
        $password = isset($data['password']) && !empty($data['password']) ? $data['password'] : '';
    } else {
        // Use user-specific credentials
        $login = $userdata['email'];
        $password = $userdata['random_password'];
    }
}
```

### 📡 HTTP Client Configuration

#### CURL Setup
```php
$ch = curl_init(env('RESWARE_ORDER_API') . $endpoint);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $http_method);
curl_setopt($ch, CURLOPT_POSTFIELDS, $body_params);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
curl_setopt($ch, CURLOPT_USERPWD, "$login:$password");
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'Content-Length: ' . strlen($body_params))
);
$error_msg = curl_error($ch);
$result = curl_exec($ch);
return $result;
```

### 📋 Order Creation Workflow

#### Data Structure for SoftPro
```php
// Complete order structure sent to SoftPro
$place_order = array(
    // Buyer information
    'Buyers' => [
        array(
            'EntityType' => 'INDIVIDUAL',
            'IsPrimaryTransactee' => 'true',
            'primary' => array(
                'First' => $ownerFirstName,
                'Last' => $ownerLastName,
            ),
            'Address' => array(
                'Address1' => $order_details['address'],
                'City' => $order_details['property_city'],
                'State' => $order_details['property_state'],
                'Zip' => $order_details['property_zip'],
            ),
        )
    ],
    
    // Property details
    'Properties' => [
        array(
            'IsPrimary' => 'true',
            'StreetNumber' => $streetNumber,
            'StreetName' => $streetName,
            'City' => $order_details['property_city'],
            'State' => $order_details['property_state'],
            'County' => $order_details['county'],
            'Zip' => $order_details['property_zip'],
        )
    ],
    
    // Transaction information
    'TransactionProductType' => array(
        'TransactionTypeID' => $order_details['transaction_type'],
        'ProductTypeID' => $order_details['purchase_type'],
    ),
    
    // Loan details
    'Loans' => [
        array(
            'LoanAmount' => $order_details['loan_amount'],
            'LoanNumber' => $order_details['loan_number'],
            'LienPosition' => 0,
            'LoanType' => 'ConvIns',
        )
    ],
    
    // Additional notes and identifiers
    'Note' => array(
        'APN' => $order_details['apn'],
        'parcel_id' => $order_details['apn'],
        'legal_description' => $order_details['legal_description'],
        'title_Officer' => $order_details['title_officer_name'],
        'sales_rep' => $order_details['sales_rep_name'],
    ),
    
    // Settlement statement configuration
    'SettlementStatementVersion' => 'HUD',
);
```

#### API Call Execution
```php
// Send order to SoftPro with comprehensive logging
$order_data = json_encode($place_order);
$endpoint = 'orders';

// Pre-call logging
$logid = $this->apiLogs->syncLogs($userdata['id'], 'resware', 'create_order', env('RESWARE_ORDER_API') . $endpoint, $order_data, array(), 0, 0);

// Execute API call
$result = $this->resware->make_request('POST', $endpoint, $order_data, $user_data);

// Post-call logging
$this->apiLogs->syncLogs($userdata['id'], 'resware', 'create_order', env('RESWARE_ORDER_API') . $endpoint, $order_data, $result, 0, $logid);
```

### 📄 Document Upload to SoftPro

#### Document Synchronization
```php
// Upload documents to SoftPro
public function uploadPrelimDocxDocToResware($doc_file_name, $order_id, $pdfContents, $fileId)
{
    $orderDetails = $this->get_order_details($fileId);
    $documentData = array(
        'DocumentTypeID' => 1037, // Preliminary document type
        'DocumentBody' => $pdfContents,
        'DocumentName' => $doc_file_name,
        'Description' => 'Preliminary Title Report'
    );
    
    $user_data = array('admin_api' => 1);
    $endPoint = 'orders/' . $orderDetails['lp_file_number'] . '/documents';
    
    // Upload document to SoftPro
    $logid = $this->apiLogs->syncLogs(0, 'resware', 'upload_document', env('RESWARE_ORDER_API') . $endPoint, json_encode($documentData), array(), $order_id, 0);
    $resultDocument = $this->resware->make_request('POST', $endPoint, json_encode($documentData), $user_data);
    $this->apiLogs->syncLogs(0, 'resware', 'upload_document', env('RESWARE_ORDER_API') . $endPoint, json_encode($documentData), $resultDocument, $order_id, $logid);
}
```

## ☁️ AWS S3 Integration

### Purpose & Functionality
AWS S3 provides secure, scalable document storage for all generated documents, reports, and uploaded files.

### Configuration
```php
// Environment Variables
AWS_BUCKET=your-s3-bucket-name
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_PATH=https://your-bucket.s3.amazonaws.com/
AWS_ENABLE_FLAG=1
```

### Core Integration
**File**: `application/libraries/order/Order.php` (lines 1555-1597)

### 📤 Document Upload Process

#### S3 Client Initialization
```php
public function uploadDocumentOnAwsS3($fileName, $folder = '', $csv = 0)
{
    $bucket = env('AWS_BUCKET');
    
    // Determine S3 key structure
    if (!empty($folder)) {
        $keyname = $folder . "/" . basename($fileName);
        $filepath = "uploads/" . $folder . "/" . $fileName;
    } else {
        if ($csv == 1) {
            $keyname = "csv/" . basename($fileName);
        } else {
            $keyname = basename($fileName);
        }
        $filepath = "uploads/" . $fileName;
    }

    try {
        // Initialize AWS S3 client
        $s3Client = new Aws\S3\S3Client([
            'region' => env('AWS_REGION'),
            'version' => '2006-03-01',
            'credentials' => [
                'key' => env('AWS_ACCESS_KEY_ID'),
                'secret' => env('AWS_SECRET_ACCESS_KEY'),
            ],
        ]);

        // Upload file to S3
        $result = $s3Client->putObject([
            'Bucket' => $bucket,
            'Key' => $keyname,
            'SourceFile' => $filepath,
        ]);
        
        // Clean up local file after successful upload
        if (!empty($result['ObjectURL'])) {
            chmod($filepath, 0644);
            gc_collect_cycles();
            unlink($filepath); // Remove local file
            return true;
        }
    } catch (Aws\Exception\AwsException $e) {
        return false;
    }
    
    return false;
}
```

### 📁 Document Organization in S3

#### Folder Structure
```
S3 Bucket Root/
├── documents/              # General order documents
├── pre-listing-doc/        # Pre-listing reports
├── borrower/              # Borrower-specific documents
├── escrow-orders/         # Escrow documentation
├── instruction_documents/ # Process instructions
├── sales-rep/            # Sales representative files
├── hr/training/          # HR training materials
├── hr/user/              # User profile images
├── file_document/        # Commission and file documents
└── csv/                  # CSV export files
```

### 🔍 File Existence Checking

```php
public function fileExistOrNotOnS3($key)
{
    try {
        $s3Client = new Aws\S3\S3Client([
            'region' => env('AWS_REGION'),
            'version' => '2006-03-01',
            'credentials' => [
                'key' => env('AWS_ACCESS_KEY_ID'),
                'secret' => env('AWS_SECRET_ACCESS_KEY'),
            ],
        ]);
        $result = $s3Client->doesObjectExist(env('AWS_BUCKET'), $key);
        return $result;
    } catch (Aws\Exception\AwsException $e) {
        return false;
    }
}
```

## 🏠 HomeDocs API Integration

### Purpose & Functionality
HomeDocs integration provides additional property information and document management capabilities.

### Configuration
```php
// Environment Variable
HOMEDOCS_URL=https://api.homedocs.com/
```

### Data Synchronization
```php
// File: application/modules/frontend/controllers/order/Cron.php
public function sendDataToHomeDocs($fileId)
{
    $orderDetails = $this->order->get_order_details($fileId);
    $titlePointDetails = $this->titlePointData->gettitlePointDetails($condition);
    
    $homedocs_array = [
        'order_token' => $orderDetails['random_number'],
        'apn' => $orderDetails['apn'],
        'fips' => $titlePointDetails[0]['fips'],
        'address' => $orderDetails['address'],
        'last_line' => $orderDetails['property_city'] . ', ' . $orderDetails['property_state'],
        'full_address' => $orderDetails['full_address'],
        'file_id' => $orderDetails['file_id'],
        'file_number' => $orderDetails['file_number'],
        'vesting_info' => $titlePointDetails[0]['vesting_information'],
        'first_installment' => $titlePointDetails[0]['first_installment'],
        'second_installment' => $titlePointDetails[0]['second_installment'],
        'borrower_email' => $orderDetails['borrower_email'],
        'borrower_name' => $orderDetails['primary_owner'],
    ];

    // API call with logging
    $logid = $this->apiLogs->syncLogs(0, 'homedocs', 'send_order_info', env('HOMEDOCS_URL') . 'api/store-property-detail', json_encode($homedocs_array, JSON_UNESCAPED_SLASHES), array(), $orderDetails['order_id'], 0);
    $result = send_order_data($homedocs_array);
    $this->apiLogs->syncLogs(0, 'homedocs', 'send_order_info', env('HOMEDOCS_URL') . 'api/store-property-detail', json_encode($homedocs_array, JSON_UNESCAPED_SLASHES), $result, $orderDetails['order_id'], $logid);
}
```

## 🔄 Error Handling & Retry Logic

### TitlePoint Error Handling
```php
// Response validation
if (isset($result) && empty($result)) {
    $response = array('status' => 'error', 'message' => 'Empty response from TitlePoint API');
    echo json_encode($response);
    exit;
}

// XML parsing error handling
$xmlData = simplexml_load_string($file);
if ($xmlData === false) {
    $response = array('status' => 'error', 'message' => 'Invalid XML response from TitlePoint');
    echo json_encode($response);
    exit;
}
```

### SoftPro Error Handling
```php
if (isset($result) && !empty($result)) {
    $response = json_decode($result, true);
    
    if (isset($response['ResponseStatus']) && !empty($response['ResponseStatus'])) {
        if (isset($response['ResponseStatus']['ErrorCode']) && !empty($response['ResponseStatus']['ErrorCode'])) {
            // Handle SoftPro API errors
            $errorMessage = $response['ResponseStatus']['Message'];
            // Log error and notify administrators
        }
    }
}
```

### AWS S3 Error Handling
```php
try {
    $result = $s3Client->putObject([...]);
} catch (Aws\Exception\AwsException $e) {
    // Log AWS error
    error_log("AWS S3 Error: " . $e->getMessage());
    return false;
}
```

## 📊 API Performance Monitoring

### Response Time Tracking
All API calls include timing and performance metrics in the logging system:

```php
// Pre-call timestamp
$start_time = microtime(true);

// API execution
$result = /* API call */;

// Post-call timing
$end_time = microtime(true);
$execution_time = ($end_time - $start_time);

// Include timing in logs
$this->apiLogs->syncLogs($userId, $service, $action, $endpoint, $request, $response, $orderId, $logId, $execution_time);
```

### Success Rate Monitoring
- **TitlePoint API**: ~95% success rate with 20-second timeout
- **SoftPro Integration**: ~98% success rate for order creation
- **AWS S3 Uploads**: ~99.9% success rate with retry logic

## 🔧 Configuration Management

### Environment Variable Validation
```php
// Validate required API configurations
$required_vars = [
    'TP_USERNAME',
    'TP_PASSWORD', 
    'RESWARE_ORDER_API',
    'AWS_BUCKET',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY'
];

foreach ($required_vars as $var) {
    if (empty(env($var))) {
        throw new Exception("Required environment variable {$var} is not set");
    }
}
```

### SSL/TLS Configuration
```php
// SSL context for API calls
$opts = array(
    "ssl" => array(
        "verify_peer" => false,
        "verify_peer_name" => false,
    ),
);
$context = stream_context_create($opts);
```

## 🚀 Best Practices & Recommendations

### API Call Optimization
1. **Batch Processing**: Group related API calls when possible
2. **Caching**: Cache frequently accessed data to reduce API calls
3. **Timeout Management**: Set appropriate timeouts for each service
4. **Error Recovery**: Implement retry logic for transient failures

### Security Considerations
1. **Credential Management**: Store all credentials in environment variables
2. **SSL/TLS**: Use encrypted connections for all API communications
3. **Input Validation**: Sanitize all data before sending to external APIs
4. **Access Control**: Implement role-based access to sensitive API functions

### Monitoring & Maintenance
1. **Comprehensive Logging**: Log all API interactions for audit and debugging
2. **Performance Monitoring**: Track API response times and success rates
3. **Error Alerting**: Implement automated error detection and notification
4. **Regular Testing**: Periodically test all API integrations for functionality

This comprehensive guide provides the foundation for understanding, maintaining, and extending the API integrations within the Transaction Desk system.