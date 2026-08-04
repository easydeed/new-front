# TitlePoint Title Searching Reference

- Source: https://qa2.titlepoint.biz/TitlePointDocs/index.html
- Captured: 2026-08-04T21:03:36.688Z
- Pages: 53 of 53

## How to use this reference

Ask questions using TitlePoint terminology when possible, such as a method name, service type, parameter, county, or search type. Answers should cite the source filename and URL and should not invent behavior that is not documented.

## introduction.html

- Navigation: Title Searching > Introduction > Title Services Overview
- Navigation: Title Searching > Introduction > Tax Results Disclaimer and Interims
- Navigation: Title Searching > Concepts > Error Handling Basics
- Navigation: Title Searching > Concepts > Property Tax Direct

### Introduction

TitlePoint Services is a Web Service based title searching system. TitlePoint Services provides title searching and order creation services via HTTP and SOAP industry accepted standards.

### Client Requirements

In order to use the TpsService web service, clients must be capable of creating, at a minimum, a SOAP 1.1 message with transport security using TLS 1.2.

### TitlePoint Service Endpoints

The TitlePoint XML Web Services for orders and searches can be found at the following endpoints:
Production
Testing/Dev
Testing/Stage
Testing/QA1
Testing/QA2
Testing/DemoQA
Testing/DR

### XML Schema for Output

The XML schema for the search results will depend on the search being performed. The most current version of the XML schema can be found in the following WSDL file:
WSDL file

### Client Proxy

You may use the WSDL for the web services to generate client proxies.

### Tax Results Disclaimer

Liability limits under the terms of this agreement apply when tax data is rendered only in the form of a report titled "Property Tax Sheet-Full Tax"
and is extended exclusively to the contracted client.

### Tax Interim Processing

Interim processing is the period of time between the end of the tax year and the time that the new tax data from the assessor is received and loaded.
During this time you will see the “IsInterim” element set to “True”. You will also see a message that states “INTERIM PROCESSING ON”.
This indicator will be available in the following CA counties at this time: Los Angeles, Orange, Ventura, Riverside, Santa Barbara, San Bernardino,
San Diego, Kern, Fresno, Tulare, and Santa Clara. Other tax counties will indicate false at all times until they are updated (scheduled to be completed in 2013).
Notification will be sent out to customers indicating the start and end of interim processing for all counties.

### Property Tax Direct

A nationwide, comprehensive real estate tax search product that reports all tax elements, including amount-to-pay and instructions for current and delinquent taxes.
This product yields a complete uninsured tax report that includes all the information title companies need to close an order. In some cases, “fully automated” data can be returned without manual research.
One or two tax result deliveries will be made (on-screen or via XML), as follows:
Preliminary Tax Report, which includes all the preliminary information PTD currently has available that can be delivered to the user (such as current year taxes and taxing bodies with contact information). This report will be delivered if all the information required for the Full Tax Report is not yet available, along with a message indicating its incompleteness.
Full Tax Report includes all the information a title company needs to close an order. In some cases (in AZ, CA, FL, TX, and some NC counties), as already stated, a “fully automated” Full Tax Report will be available immediately.
Property Tax Direct can be requested with the new General.AutoSearchPTD parameter as part of the following service types - TitlePoint.Geo.Address, TitlePoint.Geo.Owner, TitlePoint.Geo.Tax, and TitlePoint.Geo.Document. In counties that currently offer Title tax, one of tax products needs to be specified by either General.AutoSearchTaxes or GeneralAutoSearchPTD. Provided both parameters will yield error.
Property Tax Direct can also be requested thru Ownership and Encumbrance (xpress) search with new parameter OEIncludePTD. Both tax image and Property Tax Direct can be searched simultaneously.
New service type TitlePoint.PropertyTaxDirect is added for counties with no property lookup (by TitlePoint or IDM). Address will be used to submit to PTD directly without any validation. Please see appendix AAA for list of counties that need to use this new service type.

### Error Handling Basics

The TitlePoint web services will return search submission errors in the response message. When an error occurs, ReturnStatus = “Failed”. Severity will indicate “Low”, “Medium” or “High”. ErrorDescription will contain a description of the error.
Example response with an error message below:
<
CreateAsynchServicesReturn xmlns="http://www.TitlePoint.com" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
<
ReturnStatus>Failed
<
/
ReturnStatus>
<
ReturnErrors>
<
ReturnError>
<
ErrorType>ServiceFailed
<
/
ErrorType>
<
ErrorDescription> Password cannot be null or empty
<
/
ErrorDescription>
<
Severity>Low
<
/
Severity>
<
/
ReturnError>
<
/
ReturnErrors>
<
ReturnMessages
/
>
<
RequestID>0
<
/
RequestID>
<
OrderID>0
<
/
OrderID>
<
/
CreateAsynchServicesReturn>
1. “Fully-automated” is a term that indicates a tax request can be made and immediately fulfilled with the available data. However, in many cases, some information will be missing, thus requiring manual research.
Potential Errors:
Invalid username/password
Disabled user account
Invalid company/department/title officer
Access denied errors
Invalid state/county
Invalid serviceType
Invalid customerRef format

## GeneralWorkflow.html

- Navigation: Title Searching > Concepts > General Workflow

### General Workflow

All title searches submitted via TitlePoint Services are asynchronous. The following diagram describes the process of submitting a search and retrieving the resulting data.
The following steps are required when running a search:
Call the CreateService method that pertains to the type of search that you are performing .
Create Service method descriptions.
CreateService will return a request Id and an order Id. The request Id represents the search request and the order Id represents the order the search has been associated to.
On subsequent requests to CreateService, pass the order Id in the “orderNo” field to add searches to the order.
Use the request Id returned from CreateService to call the GetRequestSummaries method.
Since the CreateService call is asynchronous, GetRequestSummaries may return a status indicating that the request is not complete.
The search request made in the CreateService call may take seconds or minutes depending on the amount of data being searched and\or returned.
If the search is not complete, call GetRequestSummaries again to check the status and repeat as necessary.
If the request is complete, a summary of the searches that were performed will be returned .
GetRequestSummaries method descriptions
. Multiple searches may result from a single CreateService call; hence the need to see a summary of what was completed before proceeding.
Using the data returned by GetRequestSummaries,
call the GetResultById method that pertains to the type of search that you are performing .
GetResultById method descriptions
. You will make this call for each search contained in the request summary for which you would like to retrieve results.

## titleplantscounty.html

- Navigation: Title Searching > Concepts > Title Plants

### Title Plants

TitlePoint has two styles of title plants. Modern TitlePoint plants and thin or hybrid TPX plants. Each plant style has different searching requirements and will return different result formats. These are described below.

### TitlePoint Plants

The TitlePoint plants are our modern and most detailed plants. TitlePoint plants are full geographic and contain robust cross references with Address, Owner, and APN information and in many cases tax data.
List of TitlePoint plant counties
List of TitlePoint plant counties with taxes
TitlePoint plant map types

### TPX plants

The TPX plants are made up of hybrid Geo counties (TPX Geo) and Grantor\Grantee (GG) counties. TPX Geo counties can be searched by name and legal information while GG counties can be searched by name.
List of TPX Geo counties
List of TPX GG counties

### Hybrid  plants

The Hybrid plants available through the TP XML services are composed of Grantor/Grantee (GG) data with additional property postings.
These enhancements enable users to search by name, legal information, APNs, and utilize address cross‑references.
List of Hybrid counties

## ExplanationofServiceTypes.html

- Navigation: Title Searching > Concepts > Explanation of Service Types

### Shared

TitlePoint.LegalAndVesting2
for Legal & Vesting Report, Name Postings, Property Postings, or Property Tax Status.
TitlePoint.OwnershipAndEncumbrance
for Ownership & Encumbrences Report, Name Postings, Property Postings, Property Tax Status, or Starters.
TitlePoint.Starters3
for Prior Title File "Starter".

### TitlePoint Plant

TitlePoint.Geo.Address
for Cross Reference, Property Postings, or Tax Status.
TitlePoint.Geo.Owner
for Cross Reference, Property Postings, or Tax Status.
TitlePoint.Geo.Document
for any document Posting.
TitlePoint.Geo.Name
for Name Postings (General Index).
TitlePoint.Geo.Property
for Property Postings (Geographic).
TitlePoint.Geo.GrantorGrantee
for Property Postings (Grantor/Grantee).
TitlePoint.Geo.Subdivision
for List of Subdivisions.
TitlePoint.Geo.SubdivisionDetail
for Subdivision Details.
TitlePoint.Geo.Notary
for Notary Details.
TitlePoint.Geo.NotaryList
for List of Notaries.
TitlePoint.Geo.BusinessEntity
for Business Entity Details.
TitlePoint.Geo.BusinessEntityList
for List of Business Entities.
TitlePoint.Geo.Tax
for Property Tax Status.
TitlePoint.PropertyTaxDirect
for Property Tax Reports.
TitlePoint.FullTax
for Property Tax Status (Cook County IL only).

### TPX Plant

TitlePoint.InstrumentSearch
for any Posting.
TitlePoint.GINameSearchDocument
for Name Postings (General Index).
TitlePoint.GINameSearch
for List of Names used on Name Postings.
TitlePoint.LegalSearcherDocument
for Property Postings (Geographic).
TitlePoint.NameSearcherDocument
for Property Postings (Grantor/Grantee).
TitlePoint.NameSearcher
for List of Names used on Property Postings.
TitlePoint.JudgmentSearch
for Court Postings (Maryland only).

### Hybrid Plant

TitlePoint.Geo.Address - for Cross Reference Property Postings by Address
DataVault.Property - for Property Postings
DataVault.GrantorGrantee - for Property and Name Postings
DataVault.Instrument - for Document Postings

## References.html

- Navigation: Title Searching > Samples > Address APN or Owner Name Searching
- Navigation: Title Searching > Samples > Property Searching
- Navigation: Title Searching > Samples > Name Searching
- Navigation: Title Searching > Samples > Tax Searching
- Navigation: Title Searching > Samples > Starter Search
- Navigation: Title Searching > Samples > Instrument Search
- Navigation: Title Searching > Samples > Notary and Business Entity Search

### Tax Searching

The following are example parameters for performing a tax search with property auto-run in Maricopa, AZ.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.Tax
parameters
Tax.APN=142-01-372;General.AutoSearchProperty=True;General.AutoSearchTaxes=True
parameters(PTD)
Tax.APN=142-01-372;General.AutoSearchProperty=True;General.AutoSearchPTD=True
parameters(TaxPoint)
Tax.APN=142-01-372;General.AutoSearchProperty=True;General.AutoSearchTaxPoint=True
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
AZ
county
Maricopa

### Full Tax Searching (IL – Cook only)

The following are example parameters for performing a Full Tax search with in Cook, IL
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.FullTax
parameters
Tax.FullTaxApns=01-06-200-026-0000;Tax.RequestFullTax=True;
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
IL
county
Cook

### Counties to be used with TitlePoint.PropertyTaxDirect

AK Prince Of Wales-Outer Ketchikan
AK Cape Nome
AK Kotzebue
AK Skagway-Hoonah-Angoon
AK Wade Hampton
AK Wrangell-Petersburg
AK Aleutian Islands
AK Cordova
AK Chitina
AK Homer
AK Kvichak
AK Palmer
AK Seldovia
AK Seward
AK Iliamna
AK Talkeetna
AK Kuskokwim
AK Mount McKinley
AK Manley Hot Springs
AK Barrow
AK Nenana
AK Nulato
AK Rampart
AK Fort Gibbon
HI Kalawao
MD US Courts (Maryland)
SD Shannon
VA Bedford City
VA Clifton Forge City
VA South Boston City

### Property Tax Direct Searching (Counties with no lookup)

The following are example parameters for performing a Property Tax Direct search in Bedford City, VA
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.PropertyTaxDirect
parameters
Address2=1252 Ashland Cir;Zip=24523;PTDLookup=Address
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
VA
county
Bedford City

### Instrument Searching

The following are example parameters for performing an instrument search with property auto-run in Los Angeles, CA.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.Document
parameters
Document.SearchType=Instrument;Document.RecordDate=12/27/1996;
Document.InstrumentNumber=2088303;General.AutoSearchProperty=True
parameters(PTD)
Document.SearchType=Instrument;Document.RecordDate=12/27/1996;
Document.InstrumentNumber=2088303;General.AutoSearchProperty=True;General.AutoSearchPTD=true
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
CA
county
Los Angeles

### Instrument Searching Hybrid County

The following are example parameters for performing an instrument search with property auto-run in Anderson, TN.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
DataVault.Instrument
parameters
Document.SearchType=Instrument;Document.BookType=CN;
Document.RecordDate=10/2/1989;Document.InstrumentNumber=89Q17383
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
TN
county
Anderson

### Address Searching

The following are example parameters for performing an address search with tax and property auto-runs in Orange, CA.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.Address
parameters
Address.FullAddress=64 Agostino;
General.AutoSearchTaxes=True;General.AutoSearchProperty=True
parameters(PTD)
Address.FullAddress=64 Agostino;
General.AutoSearchPTD=True;General.AutoSearchProperty=True
parameters(TaxPoint)
Address.FullAddress=64 Agostino;
General.AutoSearchTaxPoint=True;General.AutoSearchProperty=True
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
CA
county
Orange

### Address Searching Hybrid County

The following are example parameters for performing an address search with Tax, GG and property auto-runs in Anderson, TN.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.Address
parameters(TaxPoint)
Address.FullAddress=LYNWOOD;Address.City=OAK RIDGE;
General.AutoSearchTaxPoint=True;General.VaultGGAutoRun=True;General.VaultPropertyAutoRun=True
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
TN
county
Anderson

### Owner Searching

The following are example parameters for performing an owner search in San Francisco, CA.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.Owner
parameters
Names.FullNames=Maxwell, Steven;
parameters (title tax)
Names.FullNames=Maxwell, Steven;General.AutoSearchTaxes=True
parameters (PTD)
Names.FullNames=Maxwell, Steven;General.AutoSearchPTD=True
parameters (TaxPoint)
Names.FullNames=Maxwell, Steven;General.AutoSearchTaxPoint=True
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
CA
county
San Francisco

### Owner Searching Hybrid County

The following are example parameters for performing an owner search with Tax, GG and property auto-runs in Anderson, TN.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.Owner
parameters (TaxPoint)
Names.FullNames=Maxwell, Steven;
General.AutoSearchTaxPoint=True;General.VaultGGAutoRun=True;General.VaultPropertyAutoRun=True
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
TN
county
Anderson

### Property Searching

The following are example parameters for performing a property search in Alameda, CA
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.Property
parameters
Property.MapCode=B/P;Property.MajorLegalName=PARCEL MAPS;
Property.Lot=1;Property.Book=288;Property.Page=5
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
CA
county
Alameda

### Property Searching Hybrid County

The following are example parameters for performing a property search in Anderson, TN.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
DataVault.Property
parameters
Tax.APN=105A C 04000
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
TN
county
Anderson

### Subdivision Lookup

The following are example parameters for performing a subdivision lookup in Merced, CA. This search returns any subdivision with a name containing “Valley”.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.Subdivision
parameters
Property.TractRemarks=Valley
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
CA
county
Merced

### Subdivision Detail Lookup

The following are example parameters for performing a subdivision detail lookup in Merced, CA. The parameters needed are provided by the subdivision lookup result.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.SubdivisionDetail
parameters
Property.MapCode=B/P;Property.MajorLegalName=MAPS;Property.MajorLegalValue=37!48;
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
CA
county
Merced

### Name Searching (General index, not Grantor / Grantee)

The following are example parameters for performing a name search in Los Angeles, CA.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.Name
parameters
Names.FullNames=patterson,tom;Names.Matching=075
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
CA
county
Los Angeles

### Grantor\Grantee Searching

This grantor\grantee type search is only available in the TitlePoint Plant (“TPP”) counties:
The following are example parameters for performing a grantor\grantee search in Hillsborough, FL.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.GrantorGrantee
parameters
CorporateName=Bloom, David;Names.Matching=90;PropertyDocsOnly=True; Enhanced=True;
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
AZ
county
Mohave

### Grantor\Grantee Searching Hybrid County

The following are example parameters for performing a grantor\grantee search in Anderson, TN.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
DataVault.GrantorGrantee
parameters
Names.FullNames=Stookbury, Barbara;Names.Matching=90;IncludeNickNames=True
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
TN
county
Anderson

### Starter Searching

The following are example parameters for performing starter searches in Los Angeles, CA. When retrieving a starter search result using GetResultByID3, pass false for the requestingTPXML parameter.

### Search by APN (PIN)

UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Starters3
parameters
Tax.APN=2060-001-007
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
CA
county
Los Angeles

### Search by Address

UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Starters3
parameters
Address.StreetName=Lakeview;Address.UnitType=Dr;Address.StreetNumberAlpha=615;
City=Palmdale;Zip=93551
serviceType
TitlePoint.Starters3
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
CA
county
Los Angeles

### Search by Policy Number

UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Starters3
parameters
Starter.StarterPolicyNumber=31049610
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
CA
county
Los Angeles

### Notary/Business Entity Searches

NOTE: Notary/Business Entity searches are state wide searches, but a valid county name must be specified.

### Notary Searches

The following are example parameters for performing a Notary picklist.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.NotaryList
parameters
CorpPartnerNotary.Name=miller steve;
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
CA
county
Merced
The following are example parameters for performing a Notary detail.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.Notary
parameters
CorpPartnerNotary.IDNumber=1130457;
(where the IDNumber is the Id value.)
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
CA
county
Merced

### Business Entity Searches

The following are example parameters for performing a Business Entity picklist.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.BusinessEntityList
parameters
CorpPartnerNotary.Name=ninja star productions llc;
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
CA
county
Merced
The following are example parameters for performing a Business Entity detail.
UserID
<Your user name>
password
<Your password>
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Geo.BusinessEntity
parameters
CorpPartnerNotary.IDNumber=1130457;
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
state
CA
county
Merced

## TitlePointXMLSearch.html

- Navigation: Title Searching > Samples > Xpress Search

### Xpress Search (includes Xpress Starters and Tax)

Below is an example parameter for performing a Property search in Clark, NV.
UserID
<Your user name>
password
<Your password>
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.OwnershipAndEncumbrance
parameters
Lookup by Address:
Address1=1163 Founders Ct; City= Henderson; IncludePlatMap=True;
PropertyAutoRun=True; IncludeTax=True; IncludeReference=True;
OEIncludePTD=True;LvLookup=Address;
Address1=3313 Jamaica Princess Pl; UnitNumber=3; City=North Las Vegas;
IncludePlatMap=True; PropertyAutoRun=True; IncludeTax=True;
OEIncludePTD=True;LvLookup=Address;
Lookup by Owner Name:
FirstName=Judith; LastName=Elwell; ncludePlatMap=True; PropertyAutoRun=True;
IncludeTax=True; IncludeReference=True; OEIncludePTD=True;
LvLookup=AssessedOwner;
Lookup by Property ID:
Pin=178-10-311-043; IncludePlatMap=True; PropertyAutoRun=True;
IncludeTax=True; IncludeReference=True; OEIncludePTD=True;
LvLookup=PropertyID;
Pin=178-10-311-043; IncludePlatMap=True; PropertyAutoRun=True;IncludeTax=True;IncludeReference=True;OEIncludeTaxPoint=True
state
NV
county
Clark

## AddlServicesCreateService.html

- Navigation: Title Searching > Reference > Create Service Methods

### CreateService

This method has been deprecated. Please do not use

### CreateService2

This method has been deprecated. Please do not use

### CreateService3

CreateService is used to asynchronously submit a search and create a new order or add to an existing order. The type of searches available through CreateService3 are:
Name
Property
Party Property
Tax
Instrument
Address
Owner
Subdivision
Subdivision Detail
Starters
Property Tax Direct
Parameters (see the parameter reference in Appendices A and C for additional information not listed here)
userID – Username used for authentication
password – Password associated to userID
orderNo – The order Id of which to add a search to. Only required if adding to an existing order.
customerRef – Customer order number. Order numbers should be formatted as follows:
up to 15 characters
this is required if running General.AutoSearchPTD or TitlePoint.PropertyTaxDirect
serviceType – The type of search to be performed
TitlePoint.Geo.Name (General index, not Grantor\Grantee)
TitlePoint.Geo.Property
TitlePoint.Geo.PropertyByPartyName
TitlePoint.Geo.Tax
TitlePoint.Geo.Document
TitlePoint.Geo.Address
TitlePoint.Geo.Subdivision
TitlePoint.Geo.SubdivisionDetail
TitlePoint.PropertyReport
TitlePoint.StartersFull
TitlePoint.Geo.Owner
TitlePoint.PropertyTaxDirect
parameters – A Semi-colon delimited list of parameters defined in Legal Formats
company – The company reference code. This will be provided by a Property Insight account manager.The company represented in its numeric form and not its textual equivalent.
department – The department reference code. This will be provided by a Property Insight account manager.The department represented in its numeric form and not its textual equivalent.
titleOfficer – The name of the Title Officer (also known as Title Unit) associated to the provided company and department. This will be provided by a Property Insight account manager.
The title officer represented in its textual form.
state – Two character state abbreviation (i.e. CA for California)
county – County Name (i.e. San Diego)
orderComment – Comment added to the order if creating a new order. Does nothing if adding to an existing order
starterRemarks – Comment added to the order which will be included on plant order postings. Added when creating a new order only.
Return Value
CreateService3 returns a CreateService3Response containing status messages, a request Id and an order Id. The format of the response is as follows:
<CreateService3Response xmlns="http://www.TitlePoint.com">
<CreateService3Result>
<ReturnStatus>Success, Undefined or Failed</ReturnStatus>
<ReturnErrors /> (Low, Medium, High or Critical)
<ReturnMessages /> (Type: Information or Message, and descriptive messages)
<RequestID>
int
</RequestID>
<OrderID>
int
</OrderID>
</CreateService3Result>
</CreateService3Response>

### CreateService4

This method is identical to CreateService3, except for the use of a fips code instead of state and county name as input parameters. This alleviates issues caused by discrepancies in the manner in which county names are spelled.
Parameters (see the parameter reference in Appendices A and C for additional information not listed here)
userID – Username used for authentication
password – Password associated to userID
orderNo – The order Id of which to add a search to. Only required if adding to an existing order.
customerRef – Customer order number. Order numbers should be formatted as follows:
San Diego and Imperial counties – up to 11 alphanumeric characters.
Los Angeles – up to 9 numeric characters
All other counties alphanumeric up to 15 characters
this is required if running General.AutoSearchPTD or TitlePoint.PropertyTaxDirect
serviceType – The type of search to be performed (See CreateService3)
parameters – A Semi-colon delimited list of parameters defined in Legal Formats
company – The company reference code. This will be provided by a Property Insight account manager.The company represented in its numeric form and not its textual equivalent.
department – The department reference code. This will be provided by a Property Insight account manager.The department represented in its numeric form and not its textual equivalent.
titleOfficer – The name of the Title Officer (also known as Title Unit) associated to the provided company and department. This will be provided by a Property Insight account manager.
The title officer represented in its textual form.
fipsCode – FIPS (Federal Information Processing Standard) code for county.
orderComment – Comment added to the order if creating a new order. Does nothing if adding to an existing order
starterRemarks – Comment added to the order which will be included on plant order postings. Added when creating a new order only.
Return Value
CreateService4 returns a CreateService4Response containing status messages, a request Id and an order Id. The format of the response is as follows
<CreateService4Response xmlns="http://www.TitlePoint.com">
<CreateService4Result>
<ReturnStatus>Success, Undefined or Failed</ReturnStatus>
<ReturnErrors /> (Low, Medium, High or Critical)
<ReturnMessages /> (Type: Information or Message, and descriptive messages)
<RequestID>
int
</RequestID>
<OrderID>
int
</OrderID>
</CreateService4Result>
</CreateService4Response>

### CreateServices

This method is similar to CreateService3, except you can pass up to 5 sets of search parameters. This alleviates issues caused by discrepancies in the manner in which county names are spelled.
Parameters (see the parameter reference in Appendices A and C for additional information not listed here)
userID – Username used for authentication
password – Password associated to userID
orderNo – The order Id of which to add a search to. Only required if adding to an existing order.
customerRef – Customer order number. Order numbers should be formatted as follows:
San Diego and Imperial counties – up to 11 alphanumeric characters.
Los Angeles – up to 9 numeric characters
All other counties alphanumeric up to 15 characters
this is required if running General.AutoSearchPTD or TitlePoint.PropertyTaxDirect
serviceType – The type of search to be performed (See CreateService3)
parameters (1-5) – A Semi-colon delimited list of parameters defined in Legal Formats
company – The company reference code. This will be provided by a Property Insight account manager.The company represented in its numeric form and not its textual equivalent.
department – The department reference code. This will be provided by a Property Insight account manager.
The department represented in its numeric form and not its textual equivalent.
titleOfficer – The name of the Title Officer (also known as Title Unit) associated to the provided company and department. This will be provided by a Property Insight account manager.
The title officer represented in its textual form.
state – Two character state abbreviation (i.e. CA for California)
county – County Name (i.e. San Diego)
orderComment – Comment added to the order if creating a new order. Does nothing if adding to an existing order
starterRemarks – Comment added to the order which will be included on plant order postings. Added when creating a new order only.
mergeServices – Passing true will create a merged result set of all the searches provided the parameters result in multiple property requests. Examples included multiple property searches or a range of properties. The serviceType must be TitlePoint.Geo.Property, otherwise the parameter is ignored.
runAlternateNameCombinations – Passing true along with a serviceType of TitlePoint.Geo.Name will result in other permutations of the name to be searched as well as the name provided.
Return Value
CreateServices returns a CreateServicesResponse containing status messages, and an array request Ids and an order Ids. The format of the response is as follows:
<CreateServicesResponse xmlns="http://www.TitlePoint.com">
<CreateServicesResult>
<CreateAsynchServicesReturn>
<RequestID>
int
</RequestID>
<OrderID>
int
</OrderID>
</CreateAsynchServicesReturn>
<CreateAsynchServicesReturn>
<RequestID>
int
</RequestID>
<OrderID>
int
</OrderID>
</CreateAsynchServicesReturn>
</CreateServicesResult>
</CreateServicesResponse>

### CreateServiceWithLegalValidation

This method is identical to CreateService3 and CreateService4, except for Legal validation is performed for TitlePoint.LegalSearcherDocument and TitlePoint.Geo.Property serviceTypes.
This method also allows searches to be submitted by either specifying either the fips, or specifying the state and county.
Parameters (see the parameter reference in Appendices A and C for additional information not listed here)
userID – Username used for authentication
password – Password associated to userID
orderNo – The order Id of which to add a search to. Only required if adding to an existing order.
customerRef – Customer order number. Order numbers should be formatted as follows:
San Diego and Imperial counties – up to 11 alphanumeric characters.
Los Angeles – up to 9 numeric characters
All other counties alphanumeric up to 15 characters
this is required if running General.AutoSearchPTD or TitlePoint.PropertyTaxDirect
serviceType – The type of search to be performed (See CreateService3)
parameters – A Semi-colon delimited list of parameters defined in Legal Formats
company – The company reference code. This will be provided by a Property Insight account manager.The company represented in its numeric form and not its textual equivalent.
department – The department reference code. This will be provided by a Property Insight account manager.The department represented in its numeric form and not its textual equivalent.
titleOfficer – The name of the Title Officer (also known as Title Unit) associated to the provided company and department. This will be provided by a Property Insight account manager. The title officer represented in its textual form.
state – Two character state abbreviation (i.e. CA for California) (Only need to specify either fips or state and county, not all three. If state, county and fips are all specified, they must map to a single county.)
county – County Name (i.e. San Diego) (Only need to specify either fips or state and county, not all three. If state, county and fips are all specified, they must map to a single county.)
fipsCode – FIPS (Federal Information Processing Standard) code for county. (Only need to specify either fips or state and county, not all three. If state, county and fips are all specified, they must map to a single county.)
orderComment – Comment added to the order if creating a new order. Does nothing if adding to an existing order
starterRemarks – Comment added to the order which will be included on plant order postings. Added when creating a new order only.
overrideValidationFailure – If true, specifies the search should still be submitted, even if legal validation fails.
Return Value
CreateServiceWithLegalValidation returns a CreateAsynchServicesReturn containing status messages, a request Id and an order Id. The format of the response is as follows:
<CreateAsynchServicesReturn xmlns="http://www.TitlePoint.com">
<ReturnStatus>Success, Undefined or Failed</ReturnStatus>
<ReturnErrors /> (Low, Medium, High or Critical)
<ReturnMessages /> (Type: Information or Message, and descriptive messages)
<RequestID>
long
</RequestID>
<OrderID>
long
</OrderID>
</CreateAsynchServicesReturn>

## AdditionalServices.html

- Navigation: Title Searching > Reference > Get Request Summaries
- Navigation: Title Searching > Reference > Merge Services
- Navigation: Title Searching > Reference > Resolve Properties
- Navigation: Title Searching > Reference > Get Order Summary
- Navigation: Title Searching > Reference > Get Related Order
- Navigation: Title Searching > Reference > Get Request Statuses By UserId and Range

### DatedownOrder

This method asynchrounously performs a date-down operation against the specified
TitlePoint order
:
username - Required user identifier for of the user performing the request
password - Required password for the specified user
company - Required company represented in its numeric form and not its textual equivalent
department - Required department represented in its numeric form and not its textual equivalent
titleOfficer - Required title officer represented in its textual form.
customerRef - Required customer reference (order) number identifying the order to be dated down
dateDownType - The date-down type, which is required to be one of 'SPECIFIC', 'PRIOR', or 'INITIAL'
specificDate - The specific date from which to perform the date-down operation. This parameter is required to be specified when parameter, dateDownType, is specified 'SPECIFIC' and it is ignored otherwise.
Notification – allows requestor to be notified of completion
Return Value - This method returns a list of instances of type, CreateAsynchServicesReturn, which names order and request identifiers corresponding to pending search requests resulting from initiating the date-down operation. The order and request identifiers are intended to be used to retrieve the operation results.

### DatedownOrder2

This method asynchrounously performs a date-down operation against the specified
TitlePoint search
:
username - Required user identifier for of the user performing the request
password - Required password for the specified user
company - Required company represented in its numeric form and not its textual equivalent.
department - Required department represented in its numeric form and not its textual equivalent.
titleOfficer - Required title officer represented in its textual form.
serviceId - Required service identifier corresponding to the service to be dated down.dateDownType - The date-down type, which is required to be one of 'SPECIFIC', 'PRIOR', or 'INITIAL'.
specificDate - The specific date from which to perform the date-down operation. This parameter is required to be specified when parameter, dateDownType, is specified 'SPECIFIC' and it is ignored otherwise.
Notification – allows requestor to be notified of completion
Return Value - This method returns a list of instances of type, CreateAsynchServicesReturn, which names order and request identifiers corresponding to pending search requests resulting from initiating the date-down operation. The order and request identifiers are intended to be used to retrieve the operation results.

### DatedownOrder3

This method asynchrounously performs a date-down operation against the specified
TPX order
:
username - Required user identifier for of the user performing the request
password - Required password for the specified user
company - Required company represented in its numeric form and not its textual equivalent
department - Required department represented in its numeric form and not its textual equivalent
titleOfficer - Required title officer represented in its textual form.
customerRef - Required customer reference (order) number identifying the order to be dated down
dateDownType - The date-down type, which is required to be one of 'SPECIFIC', 'PRIOR', or 'INITIAL'
specificDate - The specific date from which to perform the date-down operation. This parameter is required to be specified when parameter, dateDownType, is specified 'SPECIFIC' and it is ignored otherwise.
Notification – allows requestor to be notified of completion
Return Value - This method returns a list of instances of type, CreateAsynchServicesReturn, which names order and request identifiers corresponding to pending search requests resulting from initiating the date-down operation. The order and request identifiers are intended to be used to retrieve the operation results.

### DeleteItem

This method deletes a specific item from a search using the serviceID
Parameters
userID – Username used for authentication (required)
password – Password associated to userID (required)
company – The company represented in its numeric form and not its textual equivalent. (required)
department - The department represented in its numeric form and not its textual equivalent. (required)
titleOfficer – The title officer represented in its textual form. (required)
serviceID – serviceID (in numeric form) to be deleted. (required)
Return value – DeleteItem response containing errors and messages as well as the serviceID and orderID of the deleted service.

### GetRequestSummaries

GetRequestSummaries is used to retrieve information about what was performed based on the search request submitted through CreateService. The request summary contains information about the searches run as well as the results returned. Additional information returned includes plant dates, name variations, search parameters, and search date and time. It does not contain the result data.
Parameters
userID – Username used for authentication
password – Password associated to userID
company – The company represented in its numeric form and not its textual equivalent.
department - The department represented in its numeric form and not its textual equivalent.
titleOfficer – The title officer represented in its textual form.
requestId – The request Id returned from CreateService
maxWaitSeconds – The amount of time the web service will wait for the request submitted through CreateService to complete before returning. Maximum wait time allowed is 20 seconds.
Return value
GetRequestSummaries returns a GetRequestSummariesResponse containing the request status as well as order, search, and result information.
GetRequestSummaries
<GetRequestSummariesResponse xmlns="http://www.TitlePoint.com">
<GetRequestSummariesResult>
<RequestSummaries>
<RequestSummary>
<Status>
Cancelled
or
New
or
Processing
or
Complete
or
Failed
or
FailedComplete
or
TimedOut
</Status>
<Order xsi:nil="true" />
</RequestSummary>
<RequestSummary>
<Status>
Cancelled
or
New
or
Processing
or
Complete
or
Failed
or
FailedComplete
or
TimedOut
</Status>
<Order xsi:nil="true" />
</RequestSummary>
</RequestSummaries>
</GetRequestSummariesResult>
</GetRequestSummariesResponse>
The xml snippet below shows various data returned from GetRequestSummaries. Items of particular concern are the Service and ResultThumbnail elements. A Service element represents a search and a ResultThumbnail represents a description of the data returned from the search.
The Service element contains a TypeId attribute identifying the type of search. These are similar to the ServiceType submitted with the call to CreateService. The Service elements also contains a collection of ServiceParameter elements. These sevice parameters are the parameters submitted through CreateService and used to run the search.
The ResultThumbnail element is a “thumbnail” view of the result. The ResultThumbnail child element of most interest is ID. The value of ID will be used to retrieve the data in the next step of the workflow, the call to GetResultById.
GetRequestSummaries
<GetRequestSummariesReturn xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="http://www.TitlePoint.com">
<RequestSummaries>
<RequestSummary>
<Status>Complete</Status>
<Order>
<ID>4814713</ID>
<CreatingUserID>2916</CreatingUserID>
<TitleUnitId>291</TitleUnitId>
<CustomerReference />
<TitleOfficer />
<DateTimeCreated>2007-04-18T17:18:08.987</DateTimeCreated>
<OrderState>2</OrderState>
<LastStateChange>2007-04-18T17:18:09.063</LastStateChange>
<ConcurrencyToken>AAAAAAN5Ztc=</ConcurrencyToken>
<Comment />
<Requests />
<Services>
<Service>
<ID>14077844</ID>
<Name>PI2 Services</Name>
<TypeID>PI2.Services.Address</TypeID>
<UserId>2916</UserId>
<TitleUnitId>9</TitleUnitId>
<ProcessingMode>Unknown</ProcessingMode>
<Parameters>
<ServiceParameter>
<Fields>
<string>Address</string>
</Fields>
<ServiceParameterType>General.RequestType</ServiceParameterType>
</ServiceParameter>
</Parameters>
<Status>Complete</Status>
<CompletionStatus>100</CompletionStatus>
<TimeOrdered>2007-04-18T17:18:08.973</TimeOrdered>
<StatusDescription />
<InfoOnly>false</InfoOnly>
<ConcurrencyToken>AAAAAAN5Zu0=</ConcurrencyToken>
<RequestId>914040</RequestId>
<ThumbNails>
<ResultThumbNail>
<Highlights>
<string>RunDate=4/18/2007 5:18 PM</string>
<string>Status=Success</string>
<string>LineCount=1</string>
<string>RequestTrigger=PrimarySearch</string>
<string>PrimaryRequestValue=726 E 118th Street</string>
<string>State=CA</string>
<string>County=037</string>
<string>Address=726 E 118th Street</string>
</Highlights>
<ResultType>PI2Result</ResultType>
<ID>2136897</ID>
</ResultThumbNail>
</ThumbNails>

### MergeServices

This method allows existing property searches to be merged together.
Parameters (see the parameter reference in Appendices A and C for additional information not listed here)
userID – Username used for authentication
password – Password associated to userID
company – The company represented in its numeric form and not its textual equivalent.
department - The department represented in its numeric form and not its textual equivalent.
titleOfficer – The title officer represented in its textual form.
customerRef – Customer order number. Order numbers should be formatted as follows:
Los Angeles – up to 9 numeric characters
All other counties alphanumeric up to 15 characters
orderID – The order in which the merged service should be created. If merging non-order searches, any order id from any of the searches being merged is sufficient.
serviceIds – semicolon delimited list of services to be merged.
Return value – Merged services response containing errors and messages as well as the serviceId and resultId of the resulting merged service

### ResetPassword

ResetPassword is used to request a password reset. A temporary password will be sent via email. Once the email with a temporary password has been received, a ChangePassword request can be submitted with the temporary password to set a new password.
Parameters
username – Username used for authentication
company – The company represented in its numeric form and not its textual equivalent.
department – The department represented in its numeric form and not its textual equivalent.

### ResolveProperties

This method provides a facility for verifying and resolving underlying properties to first tier overlying properties. TitlePoint does not support searching underlying properties in pin-based counties such as Cook County, Illinois. This method offers a means to resolve underlying properties to top tier properties that can then be submitted to Web method, CreateService3. The parameters passed this Web method are the same as those passed Web method, CreateService3. Although, order related parameters are not passed this Web method because this method does not support an optional order create behavior. The service type is not passed this Web method, because this method is germane to property requests, which are always of type, TitlePoint.Geo.Property. Because this method is meant to facilitate calling Web method, CreateService3, see Appendices A and C, CreateService3, for additional information not listed here related to calling CreateService3.
Parameters
userID – Username used for authentication
password – Password associated to userID
company – The company represented in its numeric form and not its textual equivalent.
department - The department represented in its numeric form and not its textual equivalent.
titleOfficer – The title officer represented in its textual form.
state – Two character state abbreviation (i.e. CA for California)
county – County Name (i.e. San Diego)
listParameterSet - A Semi-colon delimited list of parameters defined in Legal Formats
Return Value
returns an instance of type, PropertyResolutionReturn, which contains a list of type, PropertyResolutionItem, which describes an overlying property corresponding to a search-match property. Many overlying properties may correspond to a give search-match property and therefore many instances of type, PropertyResolutionItem, are returned for a given search-match.
The formats for the invocation and response are as follows:
<ResolveProperties xmlns="http://www.TitlePoint.com">
<userId>
string
</userId>
<password>
string
</password>
<company>
string
</company>
<department>
string
</department>
<titleOfficer>
string
</titleOfficer>
<state>
string
</state>
<county>
string
</county>
<listParameterSet>
<string>
string
</string>
<string>
string
</string>
</listParameterSet>
</ResolveProperties>
<ResolvePropertiesResponse xmlns="http://www.TitlePoint.com">
<ResolvePropertiesResult>
<PropertyResolutionItems>
<PropertyResolutionItem>
<SearchMatchProperty>
string
</SearchMatchProperty>
<OverlyingProperty>
string
</OverlyingProperty>
<IsUnderlying>
boolean
</IsUnderlying>
<ResidesOn>
boolean
</ResidesOn>
<Map xsi:nil="true" />
</PropertyResolutionItem>
<PropertyResolutionItem>
<SearchMatchProperty>
string
</SearchMatchProperty>
<OverlyingProperty>
string
</OverlyingProperty>
<IsUnderlying>
boolean
</IsUnderlying>
<ResidesOn>
boolean
</ResidesOn>
<Map xsi:nil="true" />
</PropertyResolutionItem>
</PropertyResolutionItems>
</ResolvePropertiesResult>
</ResolvePropertiesResponse>
This Web method takes a collection of search parameter strings where each parameter string is represented as a semi-colon delimited set of name-value pairs, each name-value pair delimited by the equal sign. This is the same notation used when calling Web method, CreateService3, except that the method supports specifying many search parameter strings at once, each parameter string representing one property to be verified or resolved to its corresponding overlying properties.
This Web method performs a property verification step for each property search string specified, and returns a collection of property resolution items, each identifying one overlying property. The property resolution item type, PropertyResolutionItem, has property IsUnderlying, which indicates whether the corresponding overlying property is itself underlying to another property, and when this property is false this indicates the overlying property top tier top tier. Property, OverlyingProperty, identifies one overlying property, and SearchMatchProperty, identifies the search match property. Properties OverlyingProperty and SearchMatchProperty are represented as search parameter strings so that the caller may use these to call Web method, CreateService3. The search parameter string made available by property, SearchMatchProperty, will match one of the search parameter strings specified Web method, ResolveProperties, in that it will identify the same property. The search parameter string offered by property, SearchMatchProperty, may not be string equivalent with the search parameter string specified Web method, ResolveProperties, because the name-value pairs may be in a different order. Type, PropertyResolutionItem, has property, ResidesOn, which indicates whether the overlying property exists in a resides-on relationship. Finally, type, PropertyResolutionItem, has property Map, which offers an instance of type, MapInformation. Type, MapInformation, has the following properties identifying map or area information for the overlying property: TractRemarks, TractAmendments, PlatDocumentNumber, MapName, MapDate, and LegalNarrative. These properties offer what the property name indicates in each instance. Property, LegalNarrative, is the narrative given for the map or area. When this method is called for non-pin-based counties, property, Resides-On, will be false for each overlying property, and the map information will identify the tract for the overlying property. This method returns one instance of type, PropertyResolutionItem, for each overlying property corresponding to a given search match. This means the caller will receive many instances of type, PropertyResolutionItem, each identifying the same search match property.
Following the call to Web method, ResolveProperties, the caller may iterate over the collection of property resolution items and for each underlying property choose to make another call to Web method, ResolveProperties, and for each first tier property make a call to CreateService3. Web method, ResolveProperties, returns one level overlying properties per method invocation.

### GetOrderSummary

This method returns an order summary, which includes the service collection on the order.
Parameters
userID - Required user identifier for of the user performing the request.
password - Required password for the specified user.
customerRef - Required customer reference number for the order. Leading zeroes are trimmed.
company - Required company represented in its numeric form and not its textual equivalent.
department - Required department represented in its numeric form and not its textual equivalent.
titleOfficer - Required title officer represented in its textual form.
returns - This method returns an order summary, which includes the service collection on the order.

### GetRelatedOrder

This method searches and returns orders using specified parameters as search filters.
With the exception of parameters userID and password, which authenticate the
caller, and parameters orderState and orderCreatedDate, each method parameter is
applied using logical-or. Parameters orderState and orderCreatedDate are applied
using logical-and. Specify null or empty string for unspecified optional
parameters. Date parameter, orderCreatedDate, is validated as a valid short
date string value, and when this validation fails the parameter is ignored.
Parameters userID, password, and orderState are required and the rest are optional.
However, of the optional parameters at least one is required to be specified.
Parameters
userID - Required user identifier for of the user performing the request.
password - Required password for the specified user.
company - Required company represented in its numeric form and not its textual equivalent.
department - Required department represented in its numeric form and not its textual equivalent.
titleOfficer - Required title officer represented in its textual form.
orderState - Required order state to be used as a logical-and filter. This parameter is required.
When OrderState.Undefined is specified, the order state is not applied as a search filter,
which means all orders that match are returned regardless the state of the order.
Valid order state values: Open, Close, Delete, Cancel, or Undefined.
When specifying the order state avoid leading or trailing whitespace.
Finally, when specifying the order state the value is case sensitive.
orderCreatedDate - Optional date (short representation - MM/DD/YY) the order was created to be used
as a logical-and filter. This parameter is optional.
pin - Optional tax pin number to be used as a logical-or filter. This parameter is optional.
address - Optional address to be used as a logical-or filter. This parameter is optional.
name - Optional name to be used as a logical-or filter. This parameter is optional.
returns - This method returns an instance of type, GetRelatedOrderReturn, which contains a
collection of summarized orders that match specified search criteria.

### GetRequestStatusesByUserIdAndRange

This method returns order status for orders created by a usersname within a datetime range.The method signature:
GetRequestStatusesByUserIdAndRange
public GetRequestInfoReturn GetRequestStatusesByUserIdAndRange
(
string userIdCSV,
DateTime start,
DateTime end
)

## AddlServiceGetResultByID.html

- Navigation: Title Searching > Reference > Get Result Methods

### GetResultByID

This method has been deprecated. Please do not use.

### GetResultByID2

This method has been deprecated. Please do not use.

### GetResultByID3

GetResultByID3 is used in conjunction with a search submitted via CreateService3. GetResultByID3 retrieves the data returned by the search.
Parameters
userID – Username used for authentication
password – Password associated to userID
company – The company represented in its numeric form and not its textual equivalent.
department - The department represented in its numeric form and not its textual equivalent.
titleOfficer – The title officer represented in its textual form.
resultID – The result Id retrieved from the result summary
requestingTPXML – Determines the type of result returned. Set to true for the following service type names, false otherwise.
TitlePoint.Geo.Name (General index, not Grantor\Grantee)
TitlePoint.Geo.Property
TitlePoint.Geo.GrantorGrantee
TitlePoint.Geo.Tax
TitlePoint.Geo.Document
TitlePoint.Geo.Address
TitlePoint.Geo.Owner
TitlePoint.Geo.Subdivision
TitlePoint.Geo.SubdivisionDetail

### GetResultByRequestID

This method has been deprecated. Please do not use.

### GetResultByRequestID2

This method has been deprecated. Please do not use.

### GetResultByRequestID3

GetResultByRequestID3 is used in conjunction with a search submitted via CreateService3 and retrieves the data returned by the first search executed by CreateService3. GetResultByRequestID3 can only be used when it is known that the CreateService3 call will only return a single result. This may not be able to be determined beforehand; therefore, using GetRequestSummaries is the preferred approach. In addition, the request summaries contain other pertinent information such as plant dates, name variations, search parameters, and search date and time that will be missed by skipping the step of retrieving the request summary.
Parameters
userID – Username used for authentication
password – Password associated to userID
company – The company represented in its numeric form and not its textual equivalent.
department - The department represented in its numeric form and not its textual equivalent.
titleOfficer – The title officer represented in its textual form.
resultID – The request Id retrieved from the call to CreateService
maxWaitSeconds – The amount of time the web service will wait for the request submitted through CreateService to complete before returning. Maximum wait time allowed is 20 seconds.
requestingTPXML – Determines the type of result returned. Set to true for the following service type names, false otherwise.
Return value
GetResultByRequestID3 returns a result of various formats depending on the type of search. See Doc Type Categories for sample output and descriptions.

### GetFilteredResultByID

This method returns a result identified by result identifier. This method supports returning both TitlePoint and TitlePoint Express (TPX) service results.
Parameters
userID – Username used for authentication
password – Password associated to userID
company – The company represented in its numeric form and not its textual equivalent.
department - The department represented in its numeric form and not its textual equivalent.
titleOfficer – The title officer represented in its textual form.
resultID
filterParams –
OpenEncumbrances – Use this flag to return filtered Open Encumbrances document chain along with the original document chain.
OpenEncumbrancesOnly – Use this flag to return only the filtered Open Encumbrances document chain and exclude the original document chain. This filter has as its effect to reduce the size of the resulting payload.
Deedchain – This filter option allows users to only return conveyances back to the last Full Value Deed (FVD) associated with their From Date
in XML Property Search results. This applies to both the TitlePoint (TP) and Searcher plants. Essentially, this option will tell the system to apply the following two filters:
From Date :
The system will find the oldest FVD using the From Date and return all conveyances from the last FVD. The "last FVD" must have a date equal to or older than the From Date.
For example, if one types a From Date of 1/1/2011 and the last FVD is dated 2/1/2011, then the system must go back to the next oldest FVD (even if before 1/1/2011) and return all conveyances between the last FVD forward.
Only return document types that belong in the Conveyances and Full Value Deeds categories.
DeedchainOnly – This filter option will return only the filtered Deed Chain results and exclude the original document chain. If truncateDocumentParties is used in conjunction with this filter, it will also apply to returned results.
This filter has as its effect to reduce the size of the resulting payload.
truncateDocumentParties – Use this flag as true to truncate party names for each party position (Party1, Party2 and so on).

## SearchParameters.html

- Navigation: Title Searching > Reference > TitlePoint Xpress Search Parameter > Instrument Search Parameters

### Instrument Search

Below is an example parameter for performing an Instrument Search in Brevard, FL.
UserID
<Your user name>
password
<Your password>
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.InstrumentSearch
parameters
Recorded by Clerk File Number:
BookType=CN;Book=201300006557;IncludeReference=True;IncludeProperties=True
Recorded by Book and Page:
Book=390;Page=247;IncludeReference=True;IncludeProperties=True
state
FL
county
Baker

### Instrument Search Input Parameters

Below is the list of Instrument Search input parameters.
Parameter:
BookType
Description:
This parameter is used to search record(s) by Clerk File Number (CN) or by Book/Page (BP).
Possible Values:
CN, BP
Default Value:
N/A
Required For:
TitlePoint.InstrumentSearch
Parameter:
Book
Description:
This parameter is used to search record(s) by Clerk File Number or Book and Page.
Possible Values:
Alpha-Numeric Book
Default Value:
N/A
Required For:
Clerk File Number or Book and Page search
Parameter:
Page
Description:
This parameter is used to search record(s) by Book and Page.
Possible Values:
Alpha-Numeric Page
Default Value:
N/A
Required For:
Book and Page search
Parameter:
IncludeReference
Description:
True will return all secondary records related to the record searched.
Possible Values:
True / False
Default Value:
False
Required For:
Not required
Parameter:
IncludeProperties
Description:
This parameter will return all legal descriptions available for the record(s) searched.
Possible Values:
True / False
Default Value:
False
Required For:
Not required

## GGandNamePickListSearchParameters.html

- Navigation: Title Searching > Reference > TitlePoint Xpress Search Parameter > Grantor Grantee and Name Pick List Search Parameters

### Grantor/Grantee (and Name) Pick List Search

Below are example parameters for performing a Grantor/Grantee and Name Pick List Search in Clark, NV.
UserID
<Your user name>
password
<Your password>
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
Grantor/Grantee: TitlePoint.NameSearcher
Name: TitlePoint.GINameSearch
parameters
CorporateName=Elwell, Richard;Names.Matching=90;
state
NV
county
Clark

### Grantor/Grantee (and Name) Pick List Search Input Parameters

Below is the list of Grantor/Grantee and Name Pick List Search input parameters.
Parameter:
CorporateName
Description:
The individual or business name for searching Grantor/Grantee or Geographic counties.
Possible Values:
Business Name or Individual (Last, First Middle)
Default Value:
N/A
Required For:
TitlePoint.NameSearcher
Parameter:
IncludeNickNames
Description:
When running a name search pick list, you can optionally Include Nicknames to have the name search algorithm consider first name nicknames (such as Katie and Kate for Katherine).
Possible Values:
True/False
Default Value:
True
Required For:
Not Required
Parameter:
Names.Matching
Description:
When running a name search, you are required to include a specific matching percentage for each name. The system uses multiple name search algorithms to return results based on the percentage match to the searched name.
Possible Values:
50 = 50-100%
60 = 60-100%
70 = 70-100%
80 = 80-100%
90 = 90-100%
200 = 100%
201 = Exact Match
Default Value:
N/A
Required For:
TitlePoint.NameSearcher
Parameter:
Permutate
Description:
When running a name search, you can optionally run alternate combinations to search all of the possible permutations of a name.
Possible Values:
True/False
Default Value:
False
Required For:
Not Required
Parameter:
SearchFromDate
Description:
Date to start Search from
Possible Values:
Any valid date formatted as mm/dd/yyyy.
Default Value:
Null
Required For:
Not Required
Parameter:
SearchToDate
Description:
Date to search to
Possible Values:
Any valid date greater than the plant date, and greater than SearchFromDate, if present and formatted as mm/dd/yyyy.
Default Value:
Null
Required For:
Not Required

## GGandNameSearch.html

- Navigation: Title Searching > Reference > TitlePoint Xpress Search Parameter > Grantor Grantee and Name Search Parameters

### Grantor/Grantee (and Name) Search

Below are example parameters for performing a Grantor/Grantee and Name Search in Clark, NV.
UserID
<Your user name>
password
<Your password>
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
Grantor/Grantee: TitlePoint.NameSearcherDocument
Name: TitlePoint.GINameSearchDocument
parameters
CorporateName=Elwell, Richard;Names.Matching=90;
state
NV
county
Clark

### Grantor/Grantee (and Name) Search Input Parameters

Below is the list of Grantor/Grantee and Name Search input parameters.
Parameter:
CorporateName
Description:
The individual or business name for searching Grantor/Grantee or Geographic counties.
Possible Values:
Business Name or Individual (Last, First Middle)
Default Value:
N/A
Required For:
TitlePoint.NameSearcherDocument
Parameter:
DocumentTypeCategory
Description:
When running a name search, you can optionally filter documents based on specific document type categories using a comma delimited list.
Possible Values:
1=Conveyance
2=Mortgage
4=Judgment & Lien
6=Property Easements
7=Property Restrictions
8=Property Leases
9=Miscellaneous
All=Record applies to all Document Type Categories
Default Value:
N/A
Required For:
Not required
Parameter:
IncludeFilters
Description:
Required parameter when filtering results by document type.
Possible Values:
True/False
Default Value:
N/A
Required For:
DocumentTypeCategory
Parameter:
IncludeNickNames
Description:
When running a name search pick list, you can optionally Include Nicknames to have the name search algorithm consider first name nicknames (such as Katie and Kate for Katherine).
Possible Values:
True/False
Default Value:
True
Required For:
Not Required
Parameter:
IncludeProperties
Description:
This parameter will return all legal descriptions available for the record(s) searched in Geographic counties.
Possible Values:
True/False
Default Value:
False
Required For:
Not Required
Parameter:
IncludeReference
Description:
This parameter will return all secondary reference documents that are associated with the search.
Possible Values:
True/False
Default Value:
False
Required For:
Not Required
Parameter:
Names.Matching
Description:
When running a name search, you are required to include a specific matching percentage for each name. The system uses multiple name search algorithms to return results based on the percentage match to the searched name.
Possible Values:
50 = 50-100%
60 = 60-100%
70 = 70-100%
80 = 80-100%
90 = 90-100%
200 = 100%
201 = Exact Match
Default Value:
N/A
Required For:
TitlePoint.NameSearcherDocument
Parameter:
Names.PartyType
Description:
When running a name search, you can optionally filter documents based on a specific party position.
Possible Values:
0=All Parties
1=Grantor
2=Grantee
Default Value:
N/A
Required For:
Not Required
Parameter:
Permutate
Description:
When running a name search, you can optionally run alternate combinations to search all of the possible permutations of a name.
Possible Values:
True/False
Default Value:
False
Required For:
Not Required
Parameter:
SearchFromDate
Description:
Date to start Search from
Possible Values:
Any valid date formatted as mm/dd/yyyy.
Default Value:
Null
Required For:
Not Required
Parameter:
SearchToDate
Description:
Date to start Search to
Possible Values:
Any valid date greater than the plant date, and greater than SearchFromDate, if present and formatted as mm/dd/yyyy.
Default Value:
Null
Required For:
Not Required
Parameter:
General.OandEresultIDforNameSearch
Description:
This parameter generates the <OeRatings> value for each document returned in the O&E name Search results
Possible Values:
<ID> value from the initial Xpress Search results
Default Value:
Null
Required For:
Not Required , applies to Xpress (f.k.a. OandE) Gtr/Gte Search
Parameter:
General.OEFullValueDeed
Description:
The “From Full Value” view is applied when a qualified Deed and Mortgage are recorded on the same day.
Possible Values:
True / False
Default Value:
False
Required For:
Not Required, applies to Xpress (f.k.a. OandE) Gtr/Gte Search
Parameter:
General.OEQualifiedSale
Description:
The “From Qualified Sale” view is applied when a qualified Deed (i.e., not a Quit Claim or Intrafamily Transfer Deed type) is found in the ownership history, but a Mortgage document could not be identified with the current business logic and data sources.
Possible Values:
True / False
Default Value:
False
Required For:
Not Required, applies to Xpress (f.k.a. OandE) Gtr/Gte Search
Parameter:
General.OEDeed
Description:
The “From Deed” view is applied when the business logic and data sources cannot determine the Deed type found in the ownership history.
Possible Values:
True / False
Default Value:
False
Required For:
Not Required, applies to Xpress (f.k.a. OandE) Name Search

## LVSearchParameters.html

- Navigation: Title Searching > Reference > TitlePoint Xpress Search Parameter > Legal and Vesting Search Parameters

### Legal and Vesting Search

Below is an example parameter for performing a Legal and Vesting Search in Orange, FL.
UserID
<Your user name>
password
<Your password>
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.LegalAndVesting2
parameters
Lookup by Address:
Address1=8350 Sandberry Blvd; City=Orlando
;LvLookup=Address;LvLookupValue=8350 Sandberry Blvd,
Orlando;LvReportFormat=LV;IncludeTaxAssessor=false
Address1=784 E Michigan St; UnitNumber=40; City=Orlando
;LvLookup=Address;LvLookupValue=784 E Michigan St, UnitNumber 40,
Orlando;LvReportFormat=LV;IncludeTaxAssessor=false
Lookup by Owner Name:
FirstName=Sharon;LastName=McWhite;LvLookup=AssessedOwner;
LvLookupValue=McWhite, Sharon;LvReportFormat=LV;IncludeTaxAssessor=false
Lookup by Property ID:
Pin=22-23-28-7832-08-170;LvLookup=PropertyID;LvLookupValue=22-23-28-7832-
08-170;LvReportFormat=LV;IncludeTaxAssessor=false
state
FL
county
Orange

## PropertySearchParameters.html

- Navigation: Title Searching > Reference > TitlePoint Xpress Search Parameter > Property Search Parameters

### Property Search

Below is an example parameter for performing a Property Search in Brevard, FL.
UserID
<Your user name>
password
<Your password>
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.LegalSearcherDocument
parameters
Book=OR143;Page=160;Block=27B;Lot=202;IncludeOrigin=True;
IncludeReference=True;IncludeFilters=True;DocumentTypeCategory=All,1,2,4,6,7,8,9;
state
FL
county
Flagler

### Property Search Input Parameters

Below is the list of Property Search input parameters.
Parameter:
Block
Description:
The Block or Building value for a legal description.
Possible Values:
Alpha-Numeric
Default Value:
N/A
Required For:
Not required
Parameter:
Book
Description:
The Map/Plat or OR book value for a legal description.
Possible Values:
Alpha-Numeric
Default Value:
N/A
Required For:
Platted Land and Gov’t Lot searches
Parameter:
DocumentTypeCategory
Description:
When running a property search, you can optionally filter documents based on specific document type categories using a comma delimited list.
Possible Values:
1=Conveyance
2=Mortgage
4=Judgment & Lien
6=Property Easements
7=Property Restrictions
8=Property Leases
9=Miscellaneous
All=Record applies to all Document Type Categories
Default Value:
No filter applied
Required For:
Required, DocumentTypeCategory=All,1,2,4,6,7,8,9
Parameter:
IncludeInstrumentType
Description:
When running a property search, you can optionally filter documents based on specific document types using a comma delimited list.
Possible Values:
See Universal Document List
Default Value:
N/A
Required For:
Not Required.
Parameter:
IncludeFilters
Description:
Includes filters used by the front end application.
Possible Values:
True/False
Default Value:
N/A
Required For:
Required, IncludeReference=True
Parameter:
IncludeReference
Description:
Return all secondary reference documents that are associated with the search.
Possible Values:
True/False
Default Value:
N/A
Required For:
Required. IncludeReference=True
Parameter:
IncludeOrigin
Description:
Return all records posted to the tract level for the search (i.e. Book/Page or Section, Township, Range records).
Possible Values:
True/False
Default Value:
False
Required For:
Not Required
Parameter:
Lot
Description:
The Lot or Unit value for a legal description.
Possible Values:
Alpha-Numeric
Default Value:
N/A
Required For:
Not Required
Parameter:
LotTo
Description:
The last lot in a range to search. Search will run lots from the “Lot” value through the “LotTo” value, inclusive
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Page
Description:
The Map/Plat or OR page value for a legal description.
Possible Values:
Alpha-Numeric
Default Value:
N/A
Required For:
Platted Land and Gov’t Lot searches
Parameter:
Quarter
Description:
The Quarter call value(s) for the legal description.
Possible Values:
Up to four Quarters can be searched: 1=NE, 2=NW, 3=SE, 4=SW
Default Value:
N/A
Required For:
Not required
Parameter:
Range
Description:
The Range value for the legal description with directional indicator.
Possible Values:
3 character alpha-numeric
Default Value:
N/A
Required For:
Section and Grant Land searches
Parameter:
SearchFromDate
Description:
Date to start Search from
Possible Values:
Any valid date formatted as mm/dd/yyyy.
Default Value:
Null
Required For:
Not Required
Parameter:
SearchToDate
Description:
Date to search to
Possible Values:
Any valid date greater than the plant date, and greater than SearchFromDate, if present and formatted as mm/dd/yyyy.
Default Value:
Null
Required For:
Not Required
Parameter:
Section
Description:
The Section value for the legal description.
Possible Values:
Numeric values: 01-36
Default Value:
N/A
Required For:
Section and Grant Land searches
Parameter:
Township
Description:
The Township value for the legal description with directional indicator.
Possible Values:
3 character alpha-numeric
Default Value:
N/A
Required For:
Section and Grant Land searches

## StarterSearch.html

- Navigation: Title Searching > Reference > TitlePoint Xpress Search Parameter > Starter Search Parameters

### Starter Search

Below is an example for performing a Starter Search in Orange, CA.
UserID
<Your user name>
password
<Your password>
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.Starters3
parameters
Tax.APN=019-484-25
state
CA
county
Orange

### Starter Search Input Parameters

Below is the list of Starter Search input parameters.
Parameter:
Address.StreetName
Description:
The street name of the property address.
Possible Values:
Alpha-numeric street name, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Address.StreetNumberAlpha
Description:
The street number of the property address.
Possible Values:
Alpha-numeric street name, supports wildcard
Default Value:
N/A
Required For:
Address.StreetName
Parameter:
Address.UnitType
Description:
The street type for the property address.
Possible Values:
Alpha street type
Default Value:
N/A
Required For:
Address.StreetName
Parameter:
Block
Description:
The block or building reference for the property.
Possible Values:
Alpha-numeric street name, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Book
Description:
The map book reference for the property.
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
City
Description:
The city of the property.
Possible Values:
Alpha city name, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Lot
Description:
The lot reference for the property.
Possible Values:
Alpha-numeric , supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Page
Description:
The map book page reference for the property.
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Starter.StarterPolicyNumber
Description:
The policy number for the transaction.
Possible Values:
Alpha-numeric, supports wildcard with three consecutive character minimum
Default Value:
N/A
Required For:
N/A
Parameter:
Property.Range
Description:
The Range reference for the property.
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Property.Township
Description:
The Township reference for the property.
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Property.TractRemarks
Description:
The Subdivision name for the property.
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Section
Description:
The Section reference for the property.
Possible Values:
Numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Starter.AppID
Description:
This parameter is used to generate a raw XML search result which mimics the format of the StarterSearch.com web service response.
Possible Values:
4
Default Value:
N/A
Required For:
Not required
Parameter:
Starter.IncludeExceptionInfo
Description:
This parameter is used to include text based Exceptions, if available.
Possible Values:
True/False
Default Value:
True
Required For:
Not required
Parameter:
Starter.ResultSize
Description:
This parameter is used to limit the amount of records returned.
Possible Values:
Only one value allowed per request, current limit is 100 records.
Value
Description
0
ALL DATA
10
Top 10
25
Top 25
50
Top 50
100
Top 100
150
Top 500
Default Value:
0
Required For:
N/A
Parameter:
Starter.ResultType
Description:
This parameter is used to limit the specific data elements for each record.
Possible Values:
Only one value allowed per request.
Value
Description
100
Return ALL data for each result
210
Return Legal and Vesting descriptions only
220
Return Parcel Address only
230
Return Legal and Vesting descriptions WITH parcel address only
Default Value:
100
Required For:
N/A
Parameter:
Starter.StarterAcreageFrom
Description:
The number of acres for the property.
Possible Values:
Numeric
Default Value:
N/A
Required For:
Tract Number or Section or Township or Range
Parameter:
Starter.StarterAcreageTo
Description:
The number of acres for the property.
Possible Values:
Numeric
Default Value:
N/A
Required For:
Acreage From and greater than Acreage From value
Parameter:
Starter.StarterBuyerName
Description:
The Buyer name on policy
Possible Values:
Alpha-numeric, supports wildcard with three consecutive character minimum
Default Value:
N/A
Required For:
N/A
Parameter:
Starter.StarterInsuredName
Description:
The Insured name on policy
Possible Values:
Alpha-numeric, supports wildcard with three consecutive character minimum
Default Value:
N/A
Required For:
N/A
Parameter:
Starter.StarterLoanNumber
Description:
The loan number for the transaction
Possible Values:
Alpha-numeric, supports wildcard with three consecutive character minimum
Default Value:
N/A
Required For:
N/A
Parameter:
Starter.StarterOrderNumber
Description:
The customer identifier for the transaction
Possible Values:
Alpha-numeric, supports wildcard with three consecutive character minimum
Default Value:
N/A
Required For:
N/A
Parameter:
Starter.StarterProductCat
Description:
This parameter is used to limit the records returned by document type.
Possible Values:
Only one value allowed per request
Value
Description
301
Search lender policies only
302
Search owner policies only
303
Search “other” policies only
304
Search ALL policies
305
Search ALL preliminary reports
306
Search ALL commitment reports
307
Search ALL policies, preliminary and commitment reports, and additional types
Default Value:
307
Required For:
N/A
Parameter:
Tax.APN
Description:
The APN/ Tax ID/ Parcel # for the property.
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Tract
Description:
The Tract Number reference for the property..
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Zip
Description:
The postal code of the property,
Possible Values:
Numeric 0-9 only, max length 5
Default Value:
N/A
Required For:
Address.StreetName
Parameter:
LVData
Description:
Include data-only LV records in Starter Search requests. (No image is associated with these records)
Possible Values:
True/False
Default Value:
False
Required For:
N/A

## GeneralInputParameters.html

- Navigation: Title Searching > Reference > TitlePoint Input Parameter Definitions > General Input Parameters

### General Input Parameters

Below is the list of general input parameters. General input parameters are used with all search types.
Parameter:
General.FromDate
Description:
Date to start Search from
Possible Values:
Any valid date formatted as mm/dd/yyyy.
Default Value:
None
Required For:
Not required
Parameter:
General.ThruDate
Description:
Date to search to
Possible Values:
Any valid date greater than the plant date, and greater than General.FromDate, if present and formatted as mm/dd/yyyy.
Default Value:
None
Required For:
Not required
Parameter:
General.FromMaintDate
Description:
Maintenance date to start Search from. This is used to perform a “datedown” type search. The system will delimit the search to just those records that have a maintenance date greater than or equal to the specified date. In other words, records that have been changed since the specified date. Typical usage, to date down a previous search, is to provide the date on which that previous search was run.
Possible Values:
Any valid date greater than the plant date formatted as mm/dd/yyyy.
Default Value:
None
Required For:
Not required
Parameter:
General.DocList
Description:
List of doc types to filter by. Used in conjunction with General.ExcludeDocList.
Possible Values:
This is a comma delimited list of doctypes in which each doctype has one of the following formats:
DOC.SUB – matches an explicit doctype and subtype
DOC. – matches an explicit doctype and blank subtype
DOC – matches an explicit doctype and any subtype
Example: “ILS.REL, TDD, DED.” will match all docs with type ILS and subtype REL, all docs with type TDD, and all docs with type DED and no subtype
Default Value:
None
Required For:
Not required
Parameter:
General.ExcludeDocList
Description:
Determines whether the General.DocList is excluded on include only.
Possible Values:
True if General.DocList matches are to be excluded. False if General.DocList matches are include only.
Default Value:
False
Required For:
Not required
Parameter:
General.DocTypeCategoryList
Description:
Comma delimited list of doctype categories to filter by.
Possible Values:
Category Name
Description
Conveyances
Conveyances
CourtRelated
Court Related
Delinquencies
Delinquency, Default & Related Sales Documents
FVD
Full Value Deeds
IME
Involuntary Monetary Encumbrances
Miscellaneous
Miscellaneous
NME
Non-Monetary Encumbrances
VME
Voluntary Monetary Encumbrances
Example: “Conveyances,FVD,NME” will match all Conveyance, Full value deeds, and non-monetary encumbrances
See Appendix G for DocTypes contained in each category.
Default Value:
None
Required For:
Not required
Parameter:
General.ExcludeDocTypeCategoryList
Description:
Determines whether the General.DocTypeCategoryList is excluded or include only.
Possible Values:
True if General.DocTypeCategoryList matches are to be excluded. False if General.DocTypeCategoryList matches are include only.
Default Value:
False
Required For:
Not required
Parameter:
General.ClientRequestKey
Description:
Data for the client’s use. This is round-tripped with the results.
Possible Values:
Any string under 256 characters
Default Value:
None
Required For:
Not required
Parameter:
General.AutoSearchProperty
Description:
Whether or not to trigger an automatic property search when performing a search of type Tax, Document, Address, Owner.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
General.AutoSearchTaxes
Description:
Whether or not to trigger an automatic tax search when performing a search of type Document, Address, Owner. Not available for Document type searches in the following Security OnLine (“SOL”) counties: Los Angeles.
Cannot simultaneously request with General.AutoSearchPTD
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
General.AutoSearchPTD
Description:
Whether or not to trigger an Property Tax Direct search when performing a search of type Tax, Address, Owner.
Cannot simultaneously request with General.AutoSearchTaxes
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
General.AutoSearchTaxPoint
Description:
Whether or not to trigger an TaxPoint search when performing a search of type Tax, Address, Owner.
Cannot simultaneously request with General.AutoSearchTaxes
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
General.AutoSearchOwnerNames
Description:
Whether or not to trigger an automatic name search or searches for names appearing on the tax role when performing a search of type ProSight.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
General.AutoSearchStarters
Description:
Whether or not to trigger an automatic name search Starters when performing a search of type ProSight.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
General.AutoSearchRelatedParcels
Description:
Whether or not to trigger an automatic related parcel search when performing a search of type Tax.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
General.AutoSearchUnderlyingParcels
Description:
Whether or not to trigger an automatic underlying parcel search when performing a search of type Tax.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
General.AutoSearchFutureParcels
Description:
Whether or not to trigger an automatic future parcels search when performing a search of type Tax.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
General.ExcludeCurrentPlant
Description:
Whether or not to exclude the current plant when Search Los Angeles properties. Used in conjunction with General.IncludeBackPlant. The current plant contains records from 6/1/63 forward.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
General.IncludeBackPlant
Description:
Whether or not to include the Los Angeles back plant in a Los Angeles property search. Used in conjunction with General.ExcludeCurrentPlant. The back plant includes records from 5/4/47 through 5/31/63.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
General.EnableOrderMonitoring
Description:
Enables order monitoring for a search
Possible Values:
True or False
Default Value:
False
Required For:
Not required

## AddressParameters.html

- Navigation: Title Searching > Reference > TitlePoint Input Parameter Definitions > Address Parameters

### Address Parameters

Parameter:
Address.FullAddress
Description:
The full address. Number, street, direction, street type
Possible Values:
1111 S Mayberry Way
Default Value:
None
Required For:
Address Search
Parameter:
Address.ExactStreetNameOnly
Description:
Whether or not to only match on the exact street name only
Possible Values:
True or False
Default Value:
False
Required For:
Not required

## DocumentParameters.html

- Navigation: Title Searching > Reference > TitlePoint Input Parameter Definitions > Document Parameters

### Document Parameters

Parameter:
Document.SearchType
Description:
Type of document search to perform
Possible Values:
BookPage, Case, Instrument, Unknown
Default Value:
Unknown
Required For:
Document search
Parameter:
Document.RecordDate
Description:
Recording Year or Date of document that is being searched
Possible Values:
Any valid date or year. Formatted as mm/dd/yyyy or yyyy.
Default Value:
None
Required For:
Document searches of type Instrument
Parameter:
Document.InstrumentNumber
Description:
Instrument number of the document that is being searched
Possible Values:
Any valid instrument number
Default Value:
None
Required For:
Document searches of type instrument
Parameter:
Document.Book
Description:
Book number of the document being searched
Possible Values:
Any valid book number
Default Value:
None
Required For:
Required for document searches of type BookPage
Parameter:
Document.Page
Description:
Page number of the document being searched
Possible Values:
Any valid page number
Default Value:
None
Required For:
Required for document searches of type BookPage
Parameter:
Document.FiledDate
Description:
Filed date of the document being searched
Possible Values:
Any valid date formatted as mm/dd/yyyy.
Default Value:
None
Required For:
Document searches of type Case
Parameter:
Document.Court
Description:
Court type of the case document being searched
Possible Values:
Ex., SC (superior court), MC (municipal court).
Default Value:
None
Required For:
Not required
Parameter:
Document.CourtCase
Description:
Case number of the case document being searched
Possible Values:
Default Value:
None
Required For:
Document searches of type Case
Parameter:
Document.IncludeReferences
Description:
Whether or not to include document references in the search result
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Document.ReferencesOnly
Description:
Whether or not to include only document references in the search result. This is useful when the user knows of a primary document, and is only interested in finding secondary documents that apply to it. The primary document itself is not returned in the results.
Possible Values:
True or False
Default Value:
False
Required For:
Not required

## NameParameters.html

- Navigation: Title Searching > Reference > TitlePoint Input Parameter Definitions > Name Parameters

### Name Parameters

Parameter:
Names.FullNames
Description:
Full name to be searched
Possible Values:
Name formatted as Last Name, First Name
Default Value:
None
Required For:
Required for name searches
Parameter:
Names.NameType
Description:
Business, Individual, Unknown
Possible Values:
“B” (Business), “I” (Individual), “U” (Unknown)
Default Value:
“U”
Required For:
Not required
Parameter:
Names.Matching
Description:
Matching level used to search name index
Possible Values:
100 (100% - tightest), 90 (90-100%), 75 (75-100%), 50 (50-100%), 0 (0-100% - loosest)
Default Value:
75
Required For:
Not required
Parameter:
Names.Grantor
Description:
Grantor name to search by when doing a property search (Used in San Diego and Imperial only). Specify as Last Name, First Name.
Possible Values:
Any name
Default Value:
None
Required For:
Not required
Parameter:
Names.GrantorMatching
Description:
Matching level for the grantor in Names.Grantor (Used in San Diego and Imperial only)
Possible Values:
See Names.Matching
Default Value:
75
Required For:
Not required
Parameter:
Names.Grantee
Description:
Grantee name to search by when doing a property search (Used in San Diego and Imperial only). Specify as Last Name, First Name.
Possible Values:
Any name
Default Value:
None
Required For:
Not required
Parameter:
Names.GranteeMatching
Description:
Matching level for the grantee in Names.Grantee (Used in San Diego and Imperial only)
Possible Values:
See Names.Matching
Default Value:
75
Required For:
Not required
Parameter:
Names.Parties
Description:
Array of grantor\grantee party names to search. This must be used in conjunction with Names.PartyMatching and Names.PartyRole. (Used in Los Angeles and the TitlePoint Plant (“TPP”) counties of Alameda, Contra Costa, Sacramento, San Francisco, Merced, Solano, Stanislaus, San Joaquin, and all of Arizona.)
Possible Values:
Any names
Default Value:
None
Required For:
Not required
Parameter:
Names.PartyMatching
Description:
Array of matching levels that must correspond with the parties in Names.Parties. (Used in Los Angeles and the TitlePoint Plant (“TPP”) counties of Alameda, Contra Costa, Sacramento, San Francisco, Merced, Solano, Stanislaus, San Joaquin, and all of Arizona.)
Possible Values:
See Names.Matching
Default Value:
75
Required For:
Not required
Parameter:
Names.PartyRole
Description:
Array of party roles that must correspond with the parties in Names.Parties. (Used in Los Angeles and the TitlePoint Plant (“TPP”) counties of Alameda, Contra Costa, Sacramento, San Francisco, Merced, Solano, Stanislaus, San Joaquin, and all of Arizona.)
Possible Values:
(Unknown),
(Grantor),
(Grantee),
(Both)
Default Value:
None
Required For:
Not required
Parameter:
Names.IncludeBankruptcy
Description:
Runs bankruptcy-only searches in adjacent counties. Used when the bankruptcies for residents of the searched county are filed in a court that is in another county. This will return multiple chains.
Bankruptcies are run in the following Security OnLine (“SOL”), Next Generation Title Plant (“NGTP”), and Washington counties when this value is set to true:
• Imperial, CA, to also run bankruptcies in San Diego, CA.
• Riverside, CA, to also run bankruptcies in San Bernardino, CA.
• San Bernardino, CA, to also run bankruptcies in Riverside, CA.
• San Joaquin, CA, to also run bankruptcies in Stanislaus, CA.
• Santa Barbara, CA, to also run bankruptcies in Los Angeles, CA.
• Ventura, CA to also run bankruptcies in Los Angeles, CA, and Santa Barbara, CA.
• Kern, CA, to also run bankruptcies in Fresno, CA.
• Tulare, CA, to also run bankruptcies in Fresno, CA.
• La Porte, IN to also run bankruptcies in Lake, IN.
• Porter, IN, to also run bankruptcies in Lake, IN.
• Adams, WA, to also run bankruptcies in Spokane, WA.
• Benton, WA, to also run bankruptcies in Spokane, WA.
• Franklin, WA, to also run bankruptcies in Spokane, WA.
• Grant, WA, to also run bankruptcies in Spokane, WA.
• Okanogan, WA, to also run bankruptcies in Spokane, WA.
• Clark, WA, to also run bankruptcies in Cowlitz, WA.
• Cowlitz, WA, to also run bankruptcies in Clark, WA.
• Island, WA, to also run bankruptcies in San Juan, Skagit, Snohomish, and Kitsap, WA.
• Kitsap, WA, to also run bankruptcies in Island, Snohomish, King, and Pierce, WA.
• San Juan, WA, to also run bankruptcies in Whatcom, Skagit, and Island, WA.
• Skagit, WA, to also run bankruptcies in Whatcom, Spokane, Snohomish, Island, and San Juan, WA.
• Whatcom, WA, to also run bankruptcies in Spokane, Skagit, and San Juan, WA.
• King, WA, to also run bankruptcies in Pierce, Snohomish, and Thurston, WA.
• Pierce, WA, to also run bankruptcies in King, Snohomish, and Thurston, WA.
• Snohomish, WA, to also run bankruptcies in King, Pierce, and Thurston, WA.
• Thurston, WA, to also run bankruptcies in King, Pierce, and Snohomish, WA.
• Adams, WI, to also run bankruptcies in Dane, WI.
• Columbia, WI, to also run bankruptcies in Dane, WI.
• Iowa, WI, to also run bankruptcies in Dane, WI.
• Juneau, WI, to also run bankruptcies in Dane, WI.
• Richland, WI, to also run bankruptcies in Dane, WI.
• Sauk, WI, to also run bankruptcies in Dane, WI.
• Fond Du Lac, WI, to also run bankruptcies in Milwaukee, WI.
• Green Lake, WI, to also run bankruptcies in Milwaukee, WI.
• Walworth, WI, to also run bankruptcies in Milwaukee, WI.
• Waukesha, WI, to also run bankruptcies in Milwaukee, WI.
• Clackamas, OR, to also run bankruptcies in Multnomah and Washington, OR.
• Multnomah, OR, to also run bankruptcies in Clackamas and Washington, OR.
• Washington, OR, to also run bankruptcies in Clackamas and Multnomah, OR.
• McLean, IL, to also run bankruptcies in Sagamon, IL.
• Berrien, MI, to also run bankruptcies in Kalamazoo, MI.
• Calhoun, MI, to also run bankruptcies in Kalamazoo, MI.
• Cass, MI, to also run bankruptcies in Kalamazoo, MI.
• St. Joseph, MI, to also run bankruptcies in Kalamazoo, MI.
• Van Buren, MI, to also run bankruptcies in Kalamazoo, MI.
• Barry, MI, to also run bankruptcies in Kent, MI.
• Mecosta, MI, to also run bankruptcies in Kent, MI.
• Oceana, MI, to also run bankruptcies in Kent, MI.
• Genesee, MI, to also run bankruptices in Wayne, MI.
• Livingston, MI, to also run bankruptices in Wayne, MI.
• Macomb, MI, to also run bankruptices in Wayne, MI.
• Monroe, MI, to also run bankruptices in Wayne, MI.
• Oakland, MI, to also run bankrupticies in Wayne, MI.
• Saginaw, MI, to also run bankruptices in Wayne, MI.
• Saint Clair, MI, to also run bankruptices in Wayne, MI.
• Sanilac, MI, to also run bankruptices in Wayne, MI.
• Shiawassee, MI, to also run bankruptices in Wayne, MI.
• Washtenaw, MI, to also run bankruptices in Wayne, MI.
• Lake, OH, to also run bankruptcies in Cuyahoga, OH.
Possible Values:
True or false
Default Value:
False
Required For:
Not required

## GrantorGranteeParameters.html

- Navigation: Title Searching > Reference > TitlePoint Input Parameter Definitions > Grantor Grantee Parameters

### Grantor Grantee Parameters

Parameter:
Enhanced
Description:
Use enhanced data source for search, if available
Possible Values:
True or False
Default Value:
True
Required For:
Not required
Parameter:
PropertyDocsOnly
Description:
Enables a ‘Party Property’ type search in GG, in Enhanced data sources
Possible Values:
True or False
Default Value:
False
Required For:
Not required

## PropertyParameters.html

- Navigation: Title Searching > Reference > TitlePoint Input Parameter Definitions > Property Parameters

### Property Parameters

Parameter:
Property.MapCode
Description:
Map code of the property being searched
Possible Values:
See Appendix D
Default Value:
None
Required For:
Property searches
Parameter:
Property.MajorLegalName
Description:
Named version of the map code
Possible Values:
See Appendix D
Default Value:
None
Required For:
Property searches in TitlePoint Plant (“TPP”) counties of California (Alameda, Contra Costa, Sacramento, San Francisco, Merced, Solano, Stanislaus, San Joaquin) and all counties of Arizona and Washington.
Parameter:
Property.GuaranteeNumber
Description:
Guarantee number of the property\tract being searched
Possible Values:
Any string
Default Value:
None
Required For:
Not required
Parameter:
Property.Book
Description:
Map book number of the property being searched
Possible Values:
Any valid book number
Default Value:
None
Required For:
Not required
Parameter:
Property.Page
Description:
Map page number of the property being searched
Possible Values:
Any valid page number
Default Value:
None
Required For:
Not required
Parameter:
Property.ThruPage
Description:
Used with Property.Page to search a range of pages
Possible Values:
Any valid page greater than Property.Page
Default Value:
None
Required For:
Not required
Parameter:
Property.MapDate
Description:
Map date of the property being searched
Possible Values:
Any valid map date
Default Value:
None
Required For:
Not required
Parameter:
Property.MapName
Description:
Map name of the property being searched
Possible Values:
Any map name
Default Value:
None
Required For:
Not required
Parameter:
Property.MapNumber
Description:
Map number of the property being searched
Possible Values:
Any map number
Default Value:
None
Required For:
Not required
Parameter:
Property.PlantName
Description:
Plant name for the map of the property being searched
Possible Values:
Any plant name
Default Value:
None
Required For:
Not required
Parameter:
Property.Tract
Description:
Tract number of the property being searched
Possible Values:
Any tract number
Default Value:
None
Required For:
Not required
Parameter:
Property.Phase
Description:
Phase number of the property being searched
Possible Values:
Any phase number
Default Value:
None
Required For:
Not required
Parameter:
Property.CaseNumber
Description:
Case number of the property being searched
Possible Values:
ny case number
Default Value:
None
Required For:
Not required
Parameter:
Property.Meridian
Description:
Meridian of the property being searched
Possible Values:
Any meridian
Default Value:
None
Required For:
Not required
Parameter:
Property.Section
Description:
Section of the sectional property being searched
Possible Values:
Any valid section
Default Value:
None
Required For:
Not required
Parameter:
Property.Township
Description:
Township of the sectional property being searched
Possible Values:
Any valid township
<township> := <twn_number>[(<space>|-)1/2][<space>][(N|S)]
The township number, optionally followed by a space or dash and the string “1/2”, optionally followed by a space, optionally followed by a single character directional. The directional is required if it cannot be inferred definitively in the given county/meridian. Valid directionals for township are ‘N’ and ‘S’.
Default Value:
None
Required For:
Not required
Parameter:
Property.Range
Description:
Range of the sectional property being searched
Possible Values:
Any valid range
<range> := <rng_number>[(<space>|-)1/2][<space>][(E|W)]
The range number, optionally followed by a space or dash and the string “1/2”, optionally followed by a space, optionally followed by a single character directional. The directional is required if it cannot be inferred definitively in the given county/meridian. Valid directionals for range are ‘E’ and ‘W’.
Default Value:
None
Required For:
Not required
Parameter:
Property.GovernmentTract
Description:
Government tract of the property being searched
Possible Values:
Any valid government tract
Default Value:
None
Required For:
Not required
Parameter:
Property.BoroughName
Description:
Borough name of the property being searched
Possible Values:
Any valid borough name
Default Value:
None
Required For:
Not required
Parameter:
Property.TownName
Description:
Town name of the property being searched
Possible Values:
Any valid town name
Default Value:
None
Required For:
Not required
Parameter:
Property.DistrictName
Description:
District name of the property being searched
Possible Values:
Any valid district name
Default Value:
None
Required For:
Not required
Parameter:
Property.CondoPlanDate
Description:
Condo plan date of the property being searched
Possible Values:
Any valid condo plan date
Default Value:
None
Required For:
Not required
Parameter:
Property.CondoPlanNumber
Description:
Condo plan number of the property being searched
Possible Values:
Any valid condo plan number
Default Value:
None
Required For:
Not required
Parameter:
Property.CondoPlanBook
Description:
Condo plan book of the property being searched
Possible Values:
ny valid condo plan book
Default Value:
None
Required For:
Not required
Parameter:
Property.CondoPlanPage
Description:
Condo plan page of the property being searched
Possible Values:
Any valid condo page number
Default Value:
None
Required For:
Not required
Parameter:
Property.CondoPlanThruPage
Description:
Condo plan thru page used with Property.CondoPlanPage in order to run a range
Possible Values:
Any valid condo plan number higher than Property.CondoPlanPage
Default Value:
None
Required For:
Not required
Parameter:
Property.ArbTract
Description:
Arbitrary tract identifier. For Arb identifiers of the form book-page-parcel-subparcel[-unit], the ArbTract is book-page.
Possible Values:
Any valid arb tract
Default Value:
None
Required For:
Not required
Parameter:
Property.Quarters
Description:
Quarters of the property being searched
Possible Values:
Any valid quarters value
Default Value:
None
Required For:
Not required
Parameter:
Property.LittleEndianQuarters
Description:
Quarters of the property being searched, in “little-endian” format.
<qqqq> := (<qval
1
>|<qval
2
>[/]<qval
1
>|<qval
3
>[/]<qval
2
>[/]<qval
1
>|<qval
4
>[/]<qval
3
>[/] <qval
2
>[/]<qval
1
>)<qval> := (<qval_half>|<qval_qtr>)<qval_half> := (N|S|E|W)H<qval_qtr> := (N|S)(E|W)
Each <qval
n
> is a quarter or half designator, where larger values of n indicate lower significance. So, <qval
1
> is the most significant, and so on. (I.e., entries are “little-endian.”)
Callers may provide a slash between qvals if they prefer, as is consistent with the display format, but this is not required.
Possible Values:
Any valid little endian quarters
Default Value:
None
Required For:
Not required
Parameter:
Property.Block
Description:
Block of property being searched
Possible Values:
Any block value
Default Value:
None
Required For:
Not required
Parameter:
Property.Lot
Description:
Lot of property being searched
Possible Values:
Any lot value
Default Value:
None
Required For:
Not required
Parameter:
Property.Parcel
Description:
Parcel of property being searched
Possible Values:
Any parcel value
Default Value:
None
Required For:
Not required
Parameter:
Property.Subparcel
Description:
Subparcel of the property being searched
Possible Values:
Any sub parcel value
Default Value:
None
Required For:
Not required
Parameter:
Property.TractParcel
Description:
Property level tract number of the property being searched. Labeled “Tract Number” in the TitlePoint web site.
Possible Values:
Any sub parcel value
Default Value:
None
Required For:
Not required
Parameter:
Property.CommonLot
Description:
CommonLot of the property being searched
Possible Values:
Any common lot value
Default Value:
None
Required For:
Not required
Parameter:
Property.Building
Description:
Building of the property being searched
Possible Values:
Any building value
Default Value:
None
Required For:
Not required
Parameter:
Property.Unit
Description:
Unit of the property being searched
Possible Values:
Any unit value
Default Value:
None
Required For:
Not required
Parameter:
Property.Share
Description:
Share of the property being searched
Possible Values:
Any share value
Default Value:
None
Required For:
Not required
Parameter:
Property.Other
Description:
Other value of the property being searched
Possible Values:
Any other value
Default Value:
None
Required For:
Not required
Parameter:
Property.PALQQ
Description:
Possible Values:
Default Value:
None
Required For:
Not required
Parameter:
Property.ParkingSpaceGarage
Description:
Parking space or garage value of the property being searched
Possible Values:
Any parking space or garage value
Default Value:
None
Required For:
Not required
Parameter:
Property.Arb
Description:
Arb value of the property being searched
Possible Values:
Any arb value
Default Value:
None
Required For:
Not required
Parameter:
Property.Account
Description:
Account value of the property being searched
Possible Values:
Any account value
Default Value:
None
Required For:
Not required
Parameter:
Property.TractNumber
Description:
TractNumber value of the property being searched
Possible Values:
Any TractNumber value
Default Value:
None
Required For:
Not required
Parameter:
Property.TractRemarks
Description:
Tract remarks of the property being searched. Used for subdivision lookup.
Possible Values:
Any tract remarks
Default Value:
None
Required For:
Not required
Parameter:
Property.IncludeUnderlying
Description:
Whether or not to include underlying properties in the search. Also needed when running additional underlying options. See Property.IncludeAllUnderlying and Property.StopAtNonArb.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.IncludeAllUnderlying
Description:
Whether or not to include all underlying properties in the search. This is different from Property.IncludeUnderlying in that it will go more than one level deep. Property.IncludeUnderlying must also be set to true for this option to work correctly.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.IncludeAdjacentStarters
Description:
Whether or not to include starters from adjacent properties in the search
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.IncludeSplits
Description:
Whether or not to include splits. This can be used to “wildcard” a search. All fields that are less significant than the least significant supplied field will be wild carded.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.IncludeAllTract
Description:
Whether or not to include the all-tract postings in the search. This includes all “general” postings, such as all-block, and so on.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.EntireTract
Description:
Whether or not to include the entire tract in the search. This effectively wildcards everything below the subdivision level. It is not restricted to numbered tract searches.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.IncludeAllBlock
Description:
Whether or not to include all properties that match the search criteria except for the block
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.IncludeNoBlock
Description:
Whether or not to include properties that match the search criteria, but are missing the block
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.IncludeOtherLegals
Description:
Whether or not to include other properties that the documents are posted to. If False, then documents that are posted to multiple legals will show only the legal(s) that caused them to be included in the current search results.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.IncludeReferenceDocs
Description:
Whether or not to include document references, such as secondary A&R documents.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.StopAtWithin
Description:
Used in correlation with IncludeAllUnderlyings. Stops going back in the property history once a property cross reference type of “within” is encountered.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.StopAtNonArb
Description:
Must be used with Property.IncludeUnderlying. Stops going back in the property history once a subdivision or plat is encountered. Corresponds to “Stop at first sub\plat” property search option in TitlePoint.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.IncludeFullHistory
Description:
Whether or not to include the full property history. Does not return postings on properties in the history. Use underlying and new arb options for postings on properties in the history.
Possible Values:
True or False
Default Value:
/td>
False
Required For:
Not required
Parameter:
Property.IncludeAllBlockOnUnderlying
Description:
Whether or not to include all properties that match the search criteria except for the block when looking up underlying properties
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.IncludeOverlappingQuarters
Description:
Whether or not to include documents posted to sectional quarters that overlap the quarter searched.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.IncludeNewArbs
Description:
Whether or not to include postings to overlying arb properties one level forward. This is the Include Overlyings option in TitlePoint.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.IncludeAllNewArbs
Description:
Whether or not to include postings to overlying arb properties all levels forward up to the first subdivision. This is the “Include Overlyings up to 1
st
plat\sub” option in TitlePoint. Must be used in conjunction with Property.IncludeNewArbs to work properly.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Parameter:
Property.IntelligentPropertyGrouping
Description:
Whether or not to run the search with Intelligent Property Grouping enabled. This option requires “Property.IncludeFullHistory” be set to True. This is equivalent to the “Recommended” property option setting within TitlePoint. This option is not available for all counties.
Available in the following counties:
AZ - La Paz, Maricopa, Mohave, Pinal, Yavapai
CA - Alameda, Butte, Contra Costa, El Dorado, Fresno, Humboldt, Imperial, Kern, Kings, Lassen, Los Angeles, Madera, Mendocino, Merced, Napa, Nevada, Orange, Placer, Plumas, Riverside, Sacramento, San Benito, San Bernardino, San Diego, San Francisco, San Joaquin, Santa Barbara, Santa Clara, Shasta, Solano, Stanislaus, Sutter, Tehama, Tulare, Ventura, Yolo, Yuba
FL - Brevard, Broward, Hillsborough, Miami-Dade, Orange, Palm Beach, Pasco, Pinellas, Polk, Seminole, Volusia
MI - Allegan, Clinton, Eaton, Genesee, Ingham, Kalamazoo, Kent, Livingston, Monroe, Muskegon, Ottawa, Saginaw, St Clair, Sanilac, Washtenaw
MT - Cascade, Lewis and Clark
OR - Clackamas, Multnomah, Washington
WA - King, Pierce, Snohomish, Thurston
WI - Milwaukee, Walworth, Waukesha
Please check with your account manager for an up to date list of counties that support this option.
Possible Values:
True or False
Default Value:
False
Required For:
Not required
Below is an example property search parameter for using Intelligent Property Grouping for Alameda, CA.
UserID
<Your user name>
password
<Your password>
company
Your company ID (provided by your account manager)
department
Your department ID (provided by your account manager)
titleOfficer
Your title officer name (provided by your account manager)
orderNo
OrderID if adding to an existing order
customerRef
Order Number (customer defined)
serviceType
TitlePoint.LegalSearcherDocument
parameters
Property.MapCode=ARB;Property.MajorLegalName=APN ARBS;Property.Book=16;Property.Page=1390;Property.Parcel=7;
Property.Subparcel=1;Property.IntelligentPropertyGrouping=true
state
CA
county
Alameda
This describes the PropertyGroup codes that are returned in the XML output.
<GetResultReturn xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="http://www.TitlePoint.com">
<ReturnStatus>Success</ReturnStatus>
<ReturnErrors/>
<ReturnMessages/>
<Result xsi:type="DocumentListResult">
<ResultType>Titlepoint.DocumentListResult</ResultType>
<ID>1698396</ID>
<RequestId>0</RequestId>
<DocumentList>
<Images>...</Images>
<Parcels>...</Parcels>
<Parties>...</Parties>
<DocumentIdentifications>...</DocumentIdentifications>
<FormParcels>...</FormParcels>
<ToParcels/>
<Addressess/>
<Items>...</Items>
<TaxParcels/>
<Filters/>
<LegalInformation>...</LegalInformation>
<LineCount>16</LineCount>
<FipsCode>06013</FipsCode>
<Status>Success</Status>
<PremarkedItems>1,16</PremarkedItems>
<PropertyGroups>Platted_General</PropertyGroups>
<PlantDates>...</PlantDates>
<PropertyImages>...</PropertyImages>
<PropertyImagesTypes>...</PropertyImagesTypes>
<DocumentList/>
<ResultPagingStatus>Unknown</ResultPagingStatus>
</Result>
</GetResultReturn>
All Steps
Abbreviated Text (Search Params)
XML Text
1.
Underlying: No
NoLineage
2
Underlying: Yes
Is PIQ a Subdivision: Yes
Is Property a Condo: No
Underlying not Searched
Underlying [LEGAL] not Searched
PIQ is a Subdivision
Note:
LEGAL is included in case multiple underlying legals exist.
Platted_General
3
Underlying: Yes
Is PIQ a Subdivision: Yes
Is PIQ a Condo: Yes
Underlying Searched
Underlying [LEGAL] Searched
PIQ is a Condo
Platted_Condo
4
Underlying: Yes
Is PIQ a Subdivision: No
Is Underlying a Redescribes: Yes
Underlying searched as a PIQ (repeat rules on underlying redescribes)
Note:
If a PIQ is determined to be a Redescribes property, the system will simply return the top-level Redescribes property as-is, and search the underlying Redescribes property with the Property Grouping logic (as demonstrated in Figure 11 on page 8). Thus, text displaying in Search Parameters will emulate any of the other scenarios since the underlying Redescribes will be assessed as a PIQ for its own underlyings. See Table 5 on page 17 for some examples.
A user will be able to search either the top-most Redescribes property or the underlying Redescribes to get the same results. Regardless of which Redescribes property searched, the logic rules will always display based on the underlying; however, the PIQ will differ depending on the property actually searched. See TFS#65857 for details.
NonPlatted_Redescribed
5
Underlying: Yes
Is PIQ a Subdivision: No
Is Underlying a Subdivision: Yes
Underlying Searched
Underlying [LEGAL] Searched
PIQ is not a Subdivision
Underlying is a Subdivision
Platted_Split
5a.
Underlying: Yes
Is PIQ a Subdivision: No
Is Underlying a Subdivision: No
Is Underlying a Rancho/STR: No
Does Underlying Have Underlying Sub: Yes
Underlying and Underlying of Underlying Searched
Underlying [LEGAL1] Searched
Underlying [LEGAL2] of Underlying [LEGAL1] Searched
PIQ is not a Subdivision
Underlying is Arbed
Underlying’s underlying is a Subdivision
Platted_SplitLot_Arbed
6
Underlying: Yes
Is PIQ a Subdivision: No
Is Underlying a Subdivision: No
Is Underlying a Rancho/STR: Yes
Does Underlying Rancho/STR contain Arb: No
Is CountyID on List: Yes
Underlying not Searched
Underlying [LEGAL] not Searched
PIQ is not a Subdivision
Underlying is a Rancho (or STR)
Note:
The system will display either “Underlying is a Rancho” or “Underlying is an STR,” depending on the property.
Rancho/STR_Split_A
6a
Underlying: Yes
Is PIQ a Subdivision: No
Is Underlying a Subdivision: No
Is Underlying a Rancho/STR: Yes
Does Underlying Rancho/STR contain Arb: No
Is CountyID on List: No
Does PIQ have Deed: Yes
Underlying not Searched
Underlying [LEGAL] not Searched
PIQ is not a Subdivision
Underlying is a Rancho (or STR)
Note:
The system will display either “Underlying is a Rancho” or “Underlying is an STR,” depending on the property.
Deed found on PIQ
Rancho/STR_Split_B_WithOwnershipChange
6b
Underlying: Yes
Is PIQ a Subdivision: No
Is Underlying a Subdivision: No
Is Underlying a Rancho/STR: Yes
Does Underlying Rancho/STR contain Arb: No
Is CountyID on List: No
Does PIQ have Deed: No
Underlying Searched
Underlying [LEGAL] Searched
PIQ is not a Subdivision
Underlying is a Rancho (or STR)
Note:
The system will display either “Underlying is a Rancho” or “Underlying is an STR,” depending on the property.
Deed not found on PIQ
Rancho/STR_Split_B_NoOwnershipChange
7
Underlying: Yes
Is PIQ a Subdivision: No
Is Underlying a Subdivision: No
Is Underlying a Rancho/STR: No
Note:
If an underlying is not a subdivision, rancho, or STR, then it is arbed.
Does Underlying Have Underlying Sub: No
Does PIQ have Deed: Yes
Underlying not Searched
Underlying [LEGAL] not Searched
PIQ is not a Subdivision
Deed found on PIQ
Underlying is Arbed
Acreage/Arbed_A_WithOwnershipChange
8
Underlying: Yes
Is PIQ a Subdivision: No
Is Underlying a Subdivision: No
Is Underlying a Rancho/STR: No
Does Underlying Have Underlying Sub: No
Does PIQ have Deed: No
Does Underlying have Deed: Yes
Underlying Searched
Underlying [LEGAL] Searched
PIQ is not a Subdivision
No deed on PIQ
Underlying is Arbed
Deed found on Underlying
Acreage/Arbed_A _UnderlyingOwnershipChange
9
Underlying: Yes
Is PIQ a Subdivision: No
Is Underlying a Subdivision: No
Is Underlying a Rancho/STR: No
Does Underlying Have Underlying Sub: No
Does PIQ have Deed: No
Does Underlying have Deed: No
Does Underlying have Underlying: Yes
Is Underlying’s Underlying a Rancho/STR: No
Underlying and Underlying of Underlying Searched
Underlying [LEGAL1] Searched
Underlying [LEGAL2] of Underlying [LEGAL1] Searched
PIQ is not a Subdivision
No deed on PIQ
Underlying is Arbed
No deed on Underlying
Acreage/Arbed_B_LongLineage
10
Underlying: Yes
Is PIQ a Subdivision: No
Is Underlying a Subdivision: No
Is Underlying a Rancho/STR: No
Does Underlying Have Underlying Sub: No
Does PIQ have Deed: No
Does Underlying have Deed: No
Does Underlying have Underlying: No
Underlying Searched
Underlying [LEGAL] Searched
PIQ is not a Subdivision
No deed on PIQ
Underlying is Arbed
No deed on Underlying
No Underlying of Underlying
Acreage/Arbed_B_ShortLineage
11
Underlying: Yes
Is PIQ a Subdivision: No
Is Underlying a Subdivision: No
Is Underlying a Rancho/STR: No
Does Underlying Have Underlying Sub: No
Does PIQ have Deed: No
Does Underlying have Deed: No
Does Underlying have Underlying: Yes
Is Underlying’s Underlying a Rancho/STR: Yes
Does Underlying Rancho/STR contain Arb: No
Is CountyID on List: Yes
Underlying Searched
Underlying [LEGAL1] not Searched
Underlying [LEGAL2] of Underlying [LEGAL1] not Searched
PIQ is not a Subdivision
No deed on PIQ
Underlying is Arbed
No deed on Underlying
Underlying’s underlying is a Rancho (or STR)
Note:
Multiple second level underlyings might be present and need to all be assessed accordingly.
Acreage/Arbed_ Rancho/STR_Split_A
11a
Underlying: Yes
Is PIQ a Subdivision: No
Is Underlying a Subdivision: No
Is Underlying a Rancho/STR: No
Does Underlying Have Underlying Sub: No
Does PIQ have Deed: No
Does Underlying have Deed: No
Does Underlying have Underlying: Yes
Is Underlying’s Underlying a Rancho/STR: Yes
Does Underlying Rancho/STR contain Arb: No
Is CountyID on List: No
Underlying Searched
Underlying [LEGAL1] Searched
Underlying [LEGAL2] of Underlying [LEGAL1] not Searched
PIQ is not a Subdivision
No deed on PIQ
Underlying is Arbed
No deed on Underlying
Underlying’s underlying is a Rancho (or STR)
Note:
Multiple second level underlyings might be present and need to all be assessed accordingly.
Acreage/Arbed_ Rancho/STR_Split_B1
12
IMPORTANT:
Scenario 12 was removed (per TFS#74830). I’m leaving it here as a placeholder, so spec reviewers know we now intentionally no longer have a Step 12.
13
Underlying: Yes
Is PIQ a Subdivision: No
Is Underlying a Subdivision: No
Is Underlying a Rancho/STR: No
Does Underlying Have Underlying Sub: No
Does PIQ have Deed: No
Does Underlying have Deed: No
Does Underlying have Underlying: Yes
Is Underlying’s Underlying a Rancho/STR: Yes
Does Underlying Rancho/STR contain Arb: Yes
Underlying and Underlying of Underlying Searched
Underlying [LEGAL1] Searched
Underlying [LEGAL2] of Underlying [LEGAL1] Searched
PIQ is not a Subdivision
No deed on PIQ
Underlying is Arbed
No deed on Underlying
Underlying’s underlying is a Rancho Arb (or STR Arb)
Note:
Multiple second level underlyings might be present and need to all be assessed accordingly.
Acreage/Arbed_ Rancho/STR_Split_B2

## TaxParameters.html

- Navigation: Title Searching > Reference > TitlePoint Input Parameter Definitions > Tax Parameters

### Tax Parameters

Parameter:
Tax.APN
Description:
APN to search (ex., “410-121-18”)
Possible Values:
Any valid APN
Default Value:
N/A
Required For:
Not required

## FullTaxParameters.html

- Navigation: Title Searching > Reference > TitlePoint Input Parameter Definitions > Full Tax Parameters

### Full Tax Parameters

Parameter:
Tax.FullTaxApns
Description:
APN to search (ex., “01-06-2000-026-0000”)
Possible Values:
Any valid APN
Default Value:
N/A
Required For:
Full Tax searches
Parameter:
Tax.RequestFullTax
Description:
Whether or not to request Full Taxes for the APN specified
Possible Values:
True or False
Default Value:
False
Required For:
Full Tax searches

## StarterSearchParameters.html

- Navigation: Title Searching > Reference > TitlePoint Input Parameter Definitions > Starter Search Parameters

### Starter Search Parameters

Parameter:
Address.StreetName
Description:
The street name of the property address.
Possible Values:
Alpha-numeric street name, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Address.StreetNumberAlpha
Description:
The street number of the property address.
Possible Values:
Alpha-numeric street name, supports wildcard
Default Value:
N/A
Required For:
Address.StreetName
Parameter:
Address.UnitType
Description:
The street type for the property address.
Possible Values:
Alpha street type
Default Value:
N/A
Required For:
Address.StreetName
Parameter:
Block
Description:
The block or building reference for the property.
Possible Values:
Alpha-numeric street name, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Book
Description:
The map book reference for the property.
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
City
Description:
The city of the property.
Possible Values:
Alpha city name, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Lot
Description:
The lot reference for the property.
Possible Values:
Alpha-numeric , supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Page
Description:
The map book page reference for the property.
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Starter.StarterPolicyNumber
Description:
The policy number for the transaction.
Possible Values:
Alpha-numeric, supports wildcard with three consecutive character minimum
Default Value:
N/A
Required For:
N/A
Parameter:
Property.Range
Description:
The Range reference for the property.
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Property.Township
Description:
The Township reference for the property.
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Property.TractRemarks
Description:
The Subdivision name for the property.
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Section
Description:
The Section reference for the property.
Possible Values:
Numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Starter.AppID
Description:
This parameter is used to generate a raw XML search result which mimics the format of the StarterSearch.com web service response.
Possible Values:
4
Default Value:
N/A
Required For:
Not required
Parameter:
Starter.IncludeExceptionInfo
Description:
This parameter is used to include text based Exceptions, if available.
Possible Values:
True/False
Default Value:
True
Required For:
Not required
Parameter:
Starter.ResultSize
Description:
This parameter is used to limit the amount of records returned.
Possible Values:
Only one value allowed per request, current limit is 100 records.
Value
Description
0
ALL DATA
10
Top 10
25
Top 25
50
Top 50
100
Top 100
500
Top 500
Default Value:
0
Required For:
N/A
Parameter:
Starter.ResultType
Description:
This parameter is used to limit the specific data elements for each record.
Possible Values:
Only one value allowed per request.
Value
Description
100
Return ALL data for each result
210
Return Legal and Vesting descriptions only
220
Return Parcel Address only
230
Return Legal and Vesting descriptions WITH parcel address only
Default Value:
100
Required For:
N/A
Parameter:
Starter.StarterAcreageFrom
Description:
The number of acres for the property.
Possible Values:
Numeric
Default Value:
N/A
Required For:
Tract Number or Section or Township or Range
Parameter:
Starter.StarterAcreageTo
Description:
The number of acres for the property.
Possible Values:
Numeric
Default Value:
N/A
Required For:
Acreage From and greater than Acreage From value
Parameter:
Starter.StarterBuyerName
Description:
The Buyer name on policy
Possible Values:
Alpha-numeric, supports wildcard with three consecutive character minimum
Default Value:
N/A
Required For:
N/A
Parameter:
Starter.StarterInsuredName
Description:
The Insured name on policy
Possible Values:
Alpha-numeric, supports wildcard with three consecutive character minimum
Default Value:
N/A
Required For:
N/A
Parameter:
Starter.StarterLoanNumber
Description:
The loan number for the transaction
Possible Values:
Alpha-numeric, supports wildcard with three consecutive character minimum
Default Value:
N/A
Required For:
N/A
Parameter:
Starter.StarterOrderNumber
Description:
The customer identifier for the transaction
Possible Values:
Alpha-numeric, supports wildcard with three consecutive character minimum
Default Value:
N/A
Required For:
N/A
Parameter:
Starter.StarterProductCat
Description:
This parameter is used to limit the records returned by document type.
Possible Values:
Only one value allowed per request
Value
Description
301
Search lender policies only
302
Search owner policies only
303
Search “other” policies only
304
Search ALL policies
305
Search ALL preliminary reports
306
Search ALL commitment reports
307
Search ALL policies, preliminary and commitment reports, and additional types
Default Value:
307
Required For:
N/A
Parameter:
Tax.APN
Description:
The APN/ Tax ID/ Parcel # for the property.
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Tract
Description:
The Tract Number reference for the property.
Possible Values:
Alpha-numeric, supports wildcard
Default Value:
N/A
Required For:
N/A
Parameter:
Zip
Description:
The postal code of the property,
Possible Values:
Numeric 0-9 only, max length 5
Default Value:
N/A
Required For:
Address.StreetName
Parameter:
LVData
Description:
Include data-only LV records in Starter Search requests. (No image is associated with these records)
Possible Values:
True/False
Default Value:
False
Required For:
N/A

## LVSearchInputParameters.html

- Navigation: Title Searching > Reference > TitlePoint Input Parameter Definitions > Legal and Vesting Search Input Parameters

### Legal and Vesting Search Input Parameters

Below is the list of Legal and Vesting Search input parameters.
Parameter:
LvLookup:
Description:
This parameter is used to define how the property will be searched.
Possible Values:
PropertyID or Address or AssessedOwner
Default Value:
N/A
Required For:
Required
Parameter:
Pin
Description:
This parameter is used to search a property by APN.
Possible Values:
Pin=APN, PIN, Property ID# of the property.
Default Value:
N/A
Required For:
Required, when LvLookup=PropertyID
Parameter:
Address1
Description:
This parameter is used to search a property by Address.
Possible Values:
Address=Property_Address; City=Property_City.
Default Value:
N/A
Required For:
Required, when LvLookup=Address
Parameter:
AssessedOwner
Description:
This parameter is used to search a property by Assessed Owner.
Possible Values:
FirstName=FirstName; LastName=LastName
Default Value:
N/A
Required For:
Required, when LvLookup= AssessedOwner
Parameter:
LvLookupValue:
Description:
This parameter is used in conjunction with how the property is searched.
Possible Values:
Lookup by Address=Address1,City
Lookup by AssessedOwner= FirstName=FirstName, LastName=LastName
Lookup by PropertyID=Pin
Default Value:
N/A
Required For:
Required
Parameter:
LvReportFormat
Description:
This parameter defines whether a Full or Quick L&V search is requested.
Possible Values:
LV or QuickLV
Default Value:
N/A
Required For:
Not required
Parameter:
IncludeTaxAssessor
Description:
This parameter defines whether Tax Information is requested.
Possible Values:
True/False
Default Value:
N/A
Required For:
Required
Parameter:
UnitNumber
Description:
This parameter is used for a property address that includes a Unit or Apartment Number.
Possible Values:
Unit or Apartment #.
Default Value:
N/A
Required For:
Optional

## HybridGeneralInputParameters.html

- Navigation: Title Searching > Reference > Hybrid Input Parameter Definitions > Hybrid General Input Parameters

### General Input Parameters

Parameter:
General.FromDate
Description:
Date to start Search from
Possible Values:
Any valid date formatted as mm/dd/yyyy.
Default Value:
None
Required For:
Not required
Parameter:
General.ThruDate
Description:
Date to search to
Possible Values:
Any valid date greater than the plant date, and greater than General.FromDate, if present and formatted as mm/dd/yyyy.
Default Value:
None
Required For:
Not required
Parameter:
General.VaultPropertyAutoRun
Description:
Whether or not to trigger an automatic property search when performing a search of type Tax, Document, Address, Owner.
Possible Values:
True/False
Default Value:
False
Required For:
Not required
Parameter:
General.VaultGGAutoRun
Description:
Whether or not to trigger an automatic gg search or searches for names appearing on the tax role when performing a search of type ProSight.
Possible Values:
True/False
Default Value:
False
Required For:
Not required
Parameter:
General.AutoSearchTaxPoint
Description:
Whether or not to trigger an TaxPoint search when performing a search of type Tax, Address, Owner.
Cannot simultaneously request with General.AutoSearchTaxes
Possible Values:
True/False
Default Value:
False
Required For:
Not required

## HybridAddressParameters.html

- Navigation: Title Searching > Reference > Hybrid Input Parameter Definitions > Hybrid Address Parameters

### Address Parameters

Parameter:
Address.FullAddress
Description:
The full address. Number, street, direction, street type
Possible Values:
LYNWOOD
Default Value:
None
Required For:
Address Search
Parameter:
Address.City
Description:
City name
Possible Values:
OAK RIDGE
Default Value:
None
Required For:
Address Search

## HybridDocumentParameters.html

- Navigation: Title Searching > Reference > Hybrid Input Parameter Definitions > Hybrid Document Parameters

### Document Parameters

Parameter:
Document.SearchType
Description:
Type of document search to perform
Possible Values:
Instrument/BookPage
Default Value:
Unknown
Required For:
Document search
Parameter:
Document.BookType
Description:
Possible Values:
CN/BP
Default Value:
None
Required For:
Document search
Parameter:
Document.RecordDate
Description:
Recording Year or Date of document that is being searched
Possible Values:
Any valid date or year. Formatted as mm/dd/yyyy or yyyy.
Default Value:
None
Required For:
Document searches of type Instrument
Parameter:
Document.InstrumentNumber
Description:
Instrument number of the document that is being searched
Possible Values:
Any valid instrument number
Default Value:
None
Required For:
Document searches of type instrument
Parameter:
Document.Book
Description:
Book number of the document being searched
Possible Values:
Any valid book number
Default Value:
None
Required For:
Required for document searches of type BookPage
Parameter:
Document.Page
Description:
Page number of the document being searched
Possible Values:
Any valid page number
Default Value:
None
Required For:
Required for document searches of type BookPage
Parameter:
Document.IncludeReferences
Description:
Whether or not to include document references in the search result
Possible Values:
True/False
Default Value:
False
Required For:
Not required

## HybridGrantorGranteeParameters.html

- Navigation: Title Searching > Reference > Hybrid Input Parameter Definitions > Hybrid Grantor Grantee Parameters

### Grantor Grantee Parameters

Parameter:
Names.FullNames
Description:
Full name to be searched
Possible Values:
Name formatted as Last Name, First Name
Default Value:
None
Required For:
Required for name searches
Parameter:
Names.NameType
Description:
Business, Individual
Possible Values:
"B" (for Business) or "I" (for Individual)
Default Value:
I
Required For:
Required for Entity Name searches in Hybrid counties. Can be omitted for Individual Name searches
Parameter:
Names.Matching
Description:
Matching level used to search name index
Possible Values:
100 (100% - tightest), 90 (90-100%), 80 (80-100%)
Default Value:
80
Required For:
Not required
Parameter:
NameSearchMode
Description:
When running a gg search, you can optionally filter documents based on a specific party position.
Possible Values:
NAMESEARCHMODEGRANTORORGRANTEE/NAMESEARCHMODEGRANTOR/NAMESEARCHMODEGRANTEE
Default Value:
NAMESEARCHMODEGRANTORORGRANTEE
Required For:
Not required
Parameter:
Names.PartyType
Description:
When running a gg search, you can optionally filter documents based on a specific party position.
Possible Values:
0=Grantor/Grantee
1=Grantor
2=Grantee
Default Value:
N/A
Required For:
Not Required
Parameter:
IncludeNickNames
Description:
When running a gg search pick list, you can optionally Include Nicknames to have the gg search algorithm consider first name nicknames (such as Katie and Kate for Katherine).
Possible Values:
True/False
Default Value:
False
Required For:
Not required
Parameter:
Permutate
Description:
When running a gg search, you can optionally run alternate combinations to search all of the possible permutations of a name.
Possible Values:
True/False
Default Value:
False
Required For:
Not required
Parameter:
General.DVFirstLetterMustMatch
Description:
Possible Values:
True/False
Default Value:
True
Required For:
Not required
Parameter:
General.DVNameDocumentsOnly
Description:
Possible Values:
True/False
Default Value:
False
Required For:
Not required
Parameter:
IncludeProperties
Description:
Possible Values:
True/False
Default Value:
False
Required For:
Not required

## HybridPropertyParameters.html

- Navigation: Title Searching > Reference > Hybrid Input Parameter Definitions > Hybrid Property Parameters

### Property Parameters

Parameter:
Property.FromDate
Description:
Date to start Search from
Possible Values:
Any valid date formatted as mm/dd/yyyy.
Default Value:
None
Required For:
Not required
Parameter:
Property.ThruDate
Description:
Date to search to
Possible Values:
Any valid date greater than the Property.FromDate, if present and formatted as mm/dd/yyyy.
Default Value:
None
Required For:
Not required
Parameter:
Property.MajorLegalName
Description:
Named version of the map code
Possible Values:
APN ARBS/LARGE LOT SUBDIVISION/MAPS/CONDOMINIUMS
Default Value:
None
Required For:
Parameter:
Property.ArbTract
Description:
Arbitrary tract identifier. For Arb identifiers of the form book-page-parcel-subparcel[-unit], the ArbTract is book-page.
Possible Values:
Any valid arb tract
Default Value:
None
Required For:
required
Parameter:
Property.Lot
Description:
Lot of property being searched
Possible Values:
Any lot value
Default Value:
None
Required For:
Not required
Parameter:
Property.Block
Description:
Block of property being searched
Possible Values:
Any block value
Default Value:
None
Required For:
Not required
Parameter:
Property.Book
Description:
Map book number of the property being searched
Possible Values:
Any valid book number
Default Value:
None
Required For:
required
Parameter:
Property.Page
Description:
Map page number of the property being searched
Possible Values:
Any valid book number
Default Value:
None
Required For:
required
Parameter:
Property.PlatDocument
Description:
Possible Values:
Default Value:
None
Required For:
required
Parameter:
Property.Unit
Description:
Unit of the property being searched
Possible Values:
Any unit value
Default Value:
None
Required For:
Not required
Parameter:
Property.Building
Description:
Building of the property being searched
Possible Values:
Any building value
Default Value:
None
Required For:
Not required
Parameter:
Property.CommonLot
Description:
CommonLot of the property being searched
Possible Values:
Any common lot value
Default Value:
None
Required For:
Not required
Parameter:
Property.ParkingSpaceGarage
Description:
Parking space or garage value of the property being searched
Possible Values:
Any parking space or garage value
Default Value:
None
Required For:
Not required
Parameter:
Property.SubdivisionName
Description:
Possible Values:
Default Value:
None
Required For:
required

## HybridTaxParameters.html

- Navigation: Title Searching > Reference > Hybrid Input Parameter Definitions > Hybrid Tax Parameters

### Tax Parameters

Parameter:
Tax.APN
Description:
APN to search (ex., “410-121-18”)
Possible Values:
Any valid APN
Default Value:
None
Required For:
Not required

## LegalFormats.html

- Navigation: Title Searching > Reference > Legal Formats > Legal Formats of TP

### Legal Formats and Associated Fields

TitlePoint searches properties using a combination of map type and major legal name to identify a particular type of legal. Both of these are required in a property search and correspond to the Property.MapCode and Property.MajorLegalName parameters. The fields’ column represents other property legal parameters.
TitlePoint plant map types :
Arizona
California
Florida
Idaho
Illinois
Indiana
Michigan
Missouri
Montana
Ohio
Oregon
Utah
Washington
Wisconsin

## AZ.html

- Navigation: Title Searching > Reference > Legal Formats > Arizona

### Overview

State
County
Name
MapCode
MajorLegalName
Fields
Required
AZ
La Paz
Document Numbers
DOC
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
PlatDocument
Yes
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Unit
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Sectional Plant Arbs
ARB
SEC PLANT ARBS
Book
Yes
Page
Yes
Parcel
Arb
Subdivision Plant Arbs
ARB
SUB PLANT ARBS
Book
Yes
Temporary Tax ID Numbers
ARB
TEMP APN ARBS
Book
Yes
Page
Yes
Parcel
Sectional/Acreage
SEC
GILA AND SALT RIVER
GovernmentTract
Section
Yes
Township
Yes
Range
Quarters
Lot
Arb
AZ
Maricopa
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Building
CommonLot
Unit
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Unit
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Sectional Plant Arbs
ARB
SEC PLANT ARBS
Book
Yes
Page
Yes
Parcel
Arb
Subdivision Plant Arbs
ARB
SEC PLANT ARBS
Book
Yes
Page
Yes
Parcel
Temporary Tax ID Numbers
ARB
TEMP APN ARBS
Book
Yes
Page
Yes
Parcel
Sectional/Acreage
SEC
GILA AND SALT RIVER
Section
Yes
Township
Yes
Range
Yes
Quarters
Arb
AZ
Mohave
Document Numbers
DOC
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
PlatDocument
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Unit
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Parcel Plats
B/P
PARCEL PLATS
Parcel
Lot
Block
Book
Yes
Page
Yes
Sectional Plant Arbs
ARB
SEC PLANT ARBS
Book
Yes
Page
Yes
Parcel
Arb
Subdivision Plant Arbs
ARB
SUB PLANT ARBS
Book
Yes
Page
Yes
Parcel
Sectional/Acreage
SEC
GILA AND SALT RIVER
Section
Yes
Township
Yes
Range
Yes
Quarters
Arb
Named Plant
NAM
Lot
Block
PlantName
Yes
AZ
Pinal
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Building
CommonLot
Unit
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Document Numbers
DOC
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
PlatDocument
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Unit
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Sectional Plant Arbs
ARB
SEC PLANT ARBS
Book
Yes
Page
Yes
Parcel
Arb
Subdivision Plant Arbs
ARB
SUB PLANT ARBS
Book
Yes
Page
Yes
Parcel
Temporary Tax ID Numbers
ARB
TEMP APN ARBS
Book
Yes
Page
Yes
Parcel
Sectional/Acreage
SEC
GILA AND SALT RIVER
Section
Yes
Township
Yes
Range
Yes
Quarters
Arb
AZ
Yavapai
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Building
CommonLot
Unit
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Unit
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Sectional Plant Arbs
ARB
SEC PLANT ARBS
Book
Yes
Page
Yes
Parcel
Arb
Subdivision Plant Arbs
ARB
SUB PLANT ARBS
Book
Yes
Page
Yes
Parcel
Sectional/Acreage
SEC
GILA AND SALT RIVER
Section
Yes
Township
Yes
Range
Yes
Quarters
Arb
Named Accounts
NAM
Lot
Block
PlantName
Yes

## CA.html

- Navigation: Title Searching > Reference > Legal Formats > California

### Overview

State
County
Name
MapCode
MajorLegalName
Fields
Required
CA
Alameda
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Subparcel
Unit
Maps
B/P
MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tract
Records of Survey
B/P
RECORDS OF SURVEY
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Ranchos
B/P
RANCHOS
Lot
Block
Book
Yes
Page
Yes
Grantor/Grantee Arbs
ARB
GRANTOR or GRANTEE
Book
(Always set to MISC)
Yes
Arb
Page
Yes
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Arb
CA
Butte
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Contra Costa
Maps
B/P
MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tract
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Parcel Maps
B/P
MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Official Maps
B/P
OFFICIAL MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Grantor/Grantee Arbs
ARB
GRANTOR or GRANTEE
Book
(Always set to MISC)
Yes
Arb
Page
Yes
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Arb
CA
El Dorado
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Parcel Maps
B/P
PARCEL MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Lot
Block
Book
Yes
Page
Yes
Named Accounts
NAM
Lot
Block
PlantName
Yes
Sectional/Acreage
SEC
MT DIABLO
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Fresno
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Plant Arbs
ARB
PLANT ARBS
Book
Yes
Page
Yes
Block
Parcel
Arb
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tract
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Miscellaneous Maps
B/P
MISCELLANEOUS MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Humboldt
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Sectional/Acreage
SEC
HUMBOLDT
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Imperial
Tracts
TCT
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Tract
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Parcel
Final Maps
B/P
FINAL MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Licensed Surveys
B/P
LICENSED SURVEYS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Official Maps
B/P
OFFICIAL MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Mineral Surveys
MAP
MINERAL SURVEYS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
If range directional=E then use “SAN BERNARDINO”.
If range directional=W then use “GILA AND SALT RIVER”.
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Named Plant
NAM
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
PlantName
Yes
CA
Kern
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Plant Arbs
ARB
PLANT ARBS
Book
Yes
Page
Yes
Block
Parcel
Arb
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tract
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
If township directional=N and range directional=W then use “SAN BERNARDINO”
If township directional=S and range directional=E then use “MT DIABLO”
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Kings
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Parcel Maps
B/P
PARCEL MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Unit
Building
CommonLot
Lot
Block
Book
Page
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
SubParcel
Arb
Plant Arbs
ARB
PLANT ARBS
Book
Yes
Page
Yes
Parcel
SubParcel
Arb
Sectional/ Acreage
SEC
MT DIABLO
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Lake
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Lassen
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Los Angeles
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Maps
B/P
MAPS
Unit
Building
CommonLot
ParkingSpaceGarage
Lot
Block
Book
Yes
Page
Yes
Tract
Parcel Maps
B/P
PARCEL MAPS
Unit
Building
CommonLot
ParkingSpaceGarage
Lot
Block
Book
Yes
Page
Yes
Records Of Survey
B/P
RECORDS OF SURVEY
Unit
Building
CommonLot
ParkingSpaceGarage
Lot
Block
Book
Yes
Page
Yes
Miscellaneous Records
B/P
MISCELLANEOUS RECORDS
Unit
Building
CommonLot
ParkingSpaceGarage
Lot
Block
Book
Yes
Page
Yes
Deed Maps
B/P
DEEDS
Unit
Building
CommonLot
ParkingSpaceGarage
Lot
Block
Book
Yes
Page
Yes
Official Maps
B/P
OFFICIAL MAPS
Unit
Building
CommonLot
ParkingSpaceGarage
Lot
Block
Book
Yes
Page
Yes
Assessors Filed Maps
B/P
ASSESSORS FILE MAPS
Lot
Block
Book
Yes
Page
Yes
Clerks Filed Maps
MAP
CLERKS FILE MAPS
Lot
Block
MapNumber
Yes
Recorders File Maps
MAP
RECORDERS FILE MAPS
Unit
Building
CommonLot
ParkingSpaceGarage
Lot
Block
MapNumber
Yes
Court Cases
CAS
COURT CASES
Lot
Block
CaseNumber
Yes
Ranchos
B/P
RANCHOS
Lot
Block
Book
Yes
Page
Yes
El Conejo Rancho
NAM
Lot
Block
PlantName (Always set to “EL CONEJO”)
Yes
Grogan Tract
NAM
Lot
Block
PlantName (Always set to “GROGAN”)
Yes
Irelan Tract
NAM
Lot
Block
PlantName (Always set to “IRELAN”)
Yes
Sectional/Acreage
SEC
SAN BERNARDINO
Section
Yes
Township
Yes
Range
Quarters
Lot
CA
Madera
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Parcel Maps
B/P
PARCEL MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Official Maps
B/P
OFFICIAL MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
SubParcel
Arb
Sectional/ Acreage
SEC
MT DIABLO
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Mendocino
Drawer Page
B/P
MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Case Drawer Page
CDP
MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Rack
Yes
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Sectional/ Acreage
SEC
If range directional=W then use “MT DIABLO”
If range directional=E then use “HUMBOLDT”
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Merced
Maps
B/P
MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Parcel Maps
B/P
PARCEL MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Lot
Block
Book
Yes
Page
Yes
Sectional
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Arb
CA
Napa
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Sectional/ Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Nevada
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Mining Claims
NAM
PlantName
Yes
Arb
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Sectional/ Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Orange
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Arb
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tract
Maps – LA
B/P
MAPS-LA
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Sub Plant Arbs
B/P
SUB PLANT ARBS
Book
Yes
Page
Yes
Block
CommonLot
Unit
Sub Plant Arbs-LA
B/P
SUB PLANT ARBS-LA
Book
Yes
Page
Yes
Block
CommonLot
Unit
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Yes
CommonLot
Yes
Unit
Maps - Arbed
MAP
ARBED ACCOUNTS
Arb
Lot
Block
MapNumber
Yes
CA
Placer
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Tract
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Parcel Maps
B/P
PARCEL MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Lot
Block
Book
Yes
Page
Yes
Named Plant
NAM
Lot
Block
PlantName
Yes
Sectional
SEC
MT DIABLO
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Plumas
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Parcel Maps
B/P
PARCEL MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Unit
Building
CommonLot
Lot
Block
Book
Page
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
SubParcel
Arb
Sectional/ Acreage
SEC
MT DIABLO
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Riverside
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Arb
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tract
Parcel Maps
B/P
PARCEL MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Maps – San Bernardino
B/P
MAPS-SAN BERN
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Maps – San Diego
B/P
MAPS-SAN DIEGO
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
ROS – San Bernardino
B/P
ROS-SAN BERN
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
ROS – San Diego
B/P
ROS-SAN DIEGO
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
CA
Sacramento
Maps
B/P
MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Subparcel
Parcel Maps
B/P
PARCEL MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Grantor/Grantee Arbs
ARB
GRANTOR or GRANTEE
Book
(Always set to MISC)
Yes
Arb
Page
Yes
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Arb
CA
San Benito
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Parcel Maps
B/P
PARCEL MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Unit
Building
CommonLot
Lot
Block
Book
Page
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
SubParcel
Arb
Plant Arbs
ARB
PLANT ARBS
Book
Yes
Page
Yes
Parcel
SubParcel
Arb
Sectional/ Acreage
SEC
MT DIABLO
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
San Bernardino
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Arb
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tract
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
CA
San Diego
Tracts
TCT
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Tract
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Subparcel
Arb
Licensed Surveys
MAP
LICENSED SURVEYS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Miscellaneous Maps
MAP
MISCELLANEOUS MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Parcel Maps
MAP
PARCEL MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Records of Survey
MAP
RECORDS OF SURVEY
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Mineral Surveys
MAP
MINERAL SURVEYS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
SAN BERNARDINO
Section
Yes
Township
Yes
­
Range
Yes
Quarters
Lot
CommonLot
Unit
Arb
Named Accounts
NAM
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
PlantName
Yes
CA
San Francisco
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
CA
San Joaquin
Maps
B/P
MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tract
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Parcel Maps
B/P
PARCEL MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Arb
CA
Santa Barbara
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tract
Condos
B/P
CONDOS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Lot Splits
B/P
LOT SPLITS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Arb Maps
MAP
ARB MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Named Accounts
NAM
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
PlantName
Yes
Rack and Map
RMP
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Rack
Yes
MapNumber
Yes
Tracts
TCT
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Phase
Tract
Yes
Sectional/Acreage
SEC
If township directional=N then use “SAN BERNARDINO”.
If township directional=S then use “MT DIABLO”.
GovernmentTract
Yes
Section
Yes
Township
Yes
Range
Quarters
Lot
Arb
CA
Santa Clara
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tract
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Arb
Plant Arbs
ARB
PLANT ARBS
Book
Yes
Page
Yes
Parcel
Arb
Sectional
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Shasta
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tract
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
SubParcel
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Solano
Maps
B/P
MAPS
ParkingSpaceGarage
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Parcel Maps
B/P
PARCEL MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Arb
CA
Sonoma
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Parcel
SubParcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Parcel Maps
B/P
PARCEL MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Official Records
B/P
OFFICIAL RECORDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
PlatDocument
Yes
Sectional/Acreage
SEC
MT DIABLO
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Stanislaus
Maps
B/P
MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Subparcel
Parcel Maps
B/P
MAPS
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Arb
CA
Sutter
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Tehama
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Ranchos
B/P
RANCHOS
Arb
Building
Unit
CommonLot
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Tulare
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Plant Arbs
ARB
PLANT ARBS
Book
Yes
Page
Yes
Block
Parcel
Arb
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tract
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Ventura
Tax ID Numbers
ARB
APN ARBS
Book
Yes
Page
Yes
Parcel
Arb
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Tract
Parcel Maps
B/P
PARCEL MAPS
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
Lot
Block
Book
Yes
Page
Yes
CA
Yolo
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Page
Parcel Maps
B/P
PARCEL MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Page
Records of Survey
B/P
RECORDS OF SURVEY
Arb
Building
Unit
CommonLot
Lot
Block
Book
Page
Tax ID Numbers
ARB
APN ARBS
Book
Page
Parcel
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
CA
Yuba
Maps
B/P
MAPS
Arb
ParkingSpaceGarage
Building
Unit
CommonLot
Lot
Block
Book
Page
Tax ID Numbers
ARB
APN ARBS
Book
Page
Parcel
Sectional/Acreage
SEC
MT DIABLO
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb

## FL.html

- Navigation: Title Searching > Reference > Legal Formats > Florida

### Overview

State
County
Name
MapCode
MajorLegalName
Fields
Required
FL
Brevard
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
TractNumber
Block
Unit
Lot
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Official Records
B/P
OFFICIAL RECORDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Unrecorded
B/P
UNRECORDED
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Deeds
B/P
DEEDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
TALLAHASSEE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
FL
Broward
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
TractNumber
Lot
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Official Records
B/P
OFFICIAL RECORDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Unrecorded
B/P
UNRECORDED
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Maps-Miami Dade
B/P
MAPS-MIAMI DADE
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Maps-Palm Beach
B/P
MAPS-PALM BEACH
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Numbers
DOC
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
PlatDocument
Yes
Arb
Sectional/Acreage
SEC
TALLAHASSEE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
FL
Hillsborough
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
TractNumber
Block
Lot
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Official Records
B/P
OFFICIAL RECORDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Unrecorded
B/P
UNRECORDED
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Deeds
B/P
DEEDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Minor Subdivision
B/P
MINOR SUBDIVISION
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
TALLAHASSEE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Document Numbers
DOC
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
PlatDocument
Yes
Arb
FL
Miami-Dade
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
TractNumber
Lot
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Official Records
B/P
OFFICIAL RECORDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Unrecorded
B/P
UNRECORDED
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Deeds
B/P
DEEDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
TALLAHASSEE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
FL
Orange
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
TractNumber
Block
Lot
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Official Records
B/P
OFFICIAL RECORDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Unrecorded
B/P
UNRECORDED
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Deeds
B/P
DEEDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Numbers
DOC
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
PlatDocument
Yes
Arb
Sectional/Acreage
SEC
TALLAHASSEE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
FL
Palm Beach
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
TractNumber
Block
Lot
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Official Records
B/P
OFFICIAL RECORDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Unrecorded
B/P
UNRECORDED
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Deeds
B/P
DEEDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
TALLAHASSEE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
FL
Pasco
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
TractNumber
Block
Lot
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Official Records
B/P
OFFICIAL RECORDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Unrecorded
B/P
UNRECORDED
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Deeds
B/P
DEEDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
TALLAHASSEE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
FL
Pinellas
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
TractNumber
Block
Lot
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Official Records
B/P
OFFICIAL RECORDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Unrecorded
B/P
UNRECORDED
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Maps-Hillsborough
B/P
MAPS-HILLSBOROUGH
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Deeds
B/P
DEEDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
TALLAHASSEE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
FL
Polk
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
TractNumber
Block
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Official Records
B/P
OFFICIAL RECORDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Unrecorded
B/P
UNRECORDED
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Deeds
B/P
DEEDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
TALLAHASSEE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
FL
Seminole
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
TractNumber
Block
Lot
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Official Records
B/P
OFFICIAL RECORDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Unrecorded
B/P
UNRECORDED
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Deeds
B/P
DEEDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
TALLAHASSEE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
FL
Volusia
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Lot
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Official Records
B/P
OFFICIAL RECORDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Unrecorded
B/P
UNRECORDED
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Deeds
B/P
DEEDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
TALLAHASSEE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb

## ID.html

- Navigation: Title Searching > Reference > Legal Formats > Idaho

### Overview

State
County
Name
MapCode
MajorLegalName
Fields
Required
ID
Ada
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Parcel
Arb
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Parcel
Arb
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Sectional/Acreage
SEC
BOISE
GovernmentTract
Section
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Township
Yes
Range
Yes
Block
Arb
ID
Canyon
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Parcel
Arb
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Parcel
Arb
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Named Tract
NAM
PlantName
Yes
Block
TractNumber
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
"If range directional=E then use “WILLAMETTE”.
If range directional=W then use “BOISE”."
GovernmentTract
Section
Township
Yes
Range
Yes
Quarters
Lot
Arb

## IL.html

- Navigation: Title Searching > Reference > Legal Formats > Illinois

### Overview

State
County
Name
MapCode
MajorLegalName
Fields
Required
IL
Champaign
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Block
Lot
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Deeds
B/P
DEEDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Sectional/Acreage 2nd
SEC
2ND PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional/Acreage 3rd
SEC
3RD PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
IL
Cook
Tax ID Numbers
PIN
Area
Yes
APNSection
Block
Parcel
Unit
Arb
IL
Dekalb
Tax ID Numbers
PIN
Area
Yes
APNSection
Block
Parcel
Unit
Arb
IL
DuPage
Tax ID Numbers
PIN
Area
Yes
APNSection
Block
Parcel
Unit
Arb
IL
Kane
Tax ID Numbers
PIN
Area
Yes
APNSection
Block
Parcel
Unit
Arb
IL
Kendall
Tax ID Numbers
PIN
Area
Yes
APNSection
Block
Parcel
Unit
Arb
IL
Lake
Tax ID Numbers
PIN
Area
Yes
APNSection
Block
Parcel
Unit
Arb
IL
Macon
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Arb
Map Number
MAP
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
3RD PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
IL
Madison
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Arb
Map Number
MAP
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
3RD PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
IL
McHenry
Tax ID Numbers
PIN
Area
Yes
APNSection
Block
Parcel
Unit
Arb
IL
McLean
Map Number
MAP
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
3RD PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
IL
Sangamon
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Arb
Map Number
MAP
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
3RD PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
IL
St Clair
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Arb
Map Number
MAP
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
3RD PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
IL
Will
Tax ID Numbers
PIN
Area
Yes
APNSection
Block
Parcel
Unit
Arb
IL
Kane (Historical)
Maps
B/P
MAPS
Lot
Block
Book
Yes
Page
Yes
Named Tract
NAM
Lot
Block
PlantName
Yes
IL
Kendall (Historical)
Maps
B/P
MAPS
Lot
Block
Book
Yes
Page
Yes
Named Tract
NAM
Lot
Block
PlantName
Yes
Sectional/Acreage
SEC
3RD PRINCIPAL
GovernmentTract
Section
Township
Yes
Range
Yes
Quarters
IL
McHenry (Historical)
Maps
B/P
MAPS
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Lot
Block
PlatDocument
Yes
Sectional/Acreage
SEC
3RD PRINCIPAL
GovernmentTract
Section
Township
Yes
Range
Yes
Quarters
IL
Will (Historical)
Maps
B/P
MAPS
Lot
Block
Book
Yes
Page
Yes
Named Tract
NAM
Lot
Block
PlantName
Yes
Sectional/Acreage
SEC
3RD PRINCIPAL
GovernmentTract
Section
Township
Yes
Range
Yes
Quarters

## IN.html

- Navigation: Title Searching > Reference > Legal Formats > Indiana

### Overview

State
County
Name
MapCode
MajorLegalName
Fields
Required
IN
Allen
Map Number
MAP
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
2ND PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
IN
Hamilton
Map Number
MAP
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
IN
Johnson
Map Number
MAP
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
2ND PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
IN
La Porte
Tax ID Numbers
PIN
Area
Yes
APNSection
Block
Parcel
Sectional
SEC
2
ND
PRINCIPAL
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
IN
Lake
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Arb
Document Numbers
DOC
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
PlatDocument
Yes
Arb
Tax ID Numbers
PIN
Area
Yes
APNSection
Block
Parcel
Sectional
SEC
2ND PRINCIPAL
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
IN
Marion
Tax ID Number
ARB
APN ARBS
ArbTract
Block
Parcel
Unit
SubParcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Block
Parcel
Unit
SubParcel
Maps
B/P
MAPS
Share
Yes
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Numbers
DOC
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
PlatDocument
Yes
Map Number
MAP
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
2ND PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Arb
IN
Porter
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Arb
Miscellaneous Maps
B/P
MISCELLANEOUS MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Arb
Plat Book
B/P
PLAT BOOK
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Arb
Deed Maps
B/P
DEEDS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Arb
Document Numbers
DOC
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
PlatDocument
Yes
Arb
Tax ID Numbers
PIN
Area
Yes
APNSection
Block
Parcel
Sectional
SEC
2ND PRINCIPAL
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb

## MI.html

- Navigation: Title Searching > Reference > Legal Formats > Michigan

### Overview

State
County
Name
MapCode
MajorLegalName
Fields
Required
MI
Allegan
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Certificate of Survey
B/P
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block (Labeled as Quarter/Block in TitlePoint)
CommonLot (Labeled as Arb in TitlePoint)
Unit (Labeled as SubArb in TitlePoint)
MI
Barry
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
Unit
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
PlatDocument
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Berrien
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Branch
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Map Number
MAP
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Calhoun
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Map Number
MAP
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Cass
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Clinton
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Certificate of Survey
B/P
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Named Accounts
NAM
PlantName
Yes
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Arb
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block (Labeled as Quarter/Block in TitlePoint)
CommonLot (Labeled as Arb in TitlePoint)
Unit (Labeled as SubArb in TitlePoint)
MI
Eaton
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Certificate of Survey
B/P
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block (Labeled as Quarter/Block in TitlePoint)
CommonLot (Labeled as Arb in TitlePoint)
Unit (Labeled as SubArb in TitlePoint)
MI
Genesee
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Parcel
Arb (Labeled as SubParcel in TitlePoint)
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block (Labeled as Quarter/Block in TitlePoint)
CommonLot (Labeled as Arb in TitlePoint)
MI
Hillsdale
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Ingham
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block (Labeled as Quarter/Block in TitlePoint)
CommonLot (Labeled as Arb in TitlePoint)
Unit (Labeled as SubArb in TitlePoint)
MI
Ionia
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Map Number
MAP
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Kalamazoo
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condo Plan
MAP
CONDO PLAN
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Map Number
Yes
Certificate of Survey
MAP
RECODS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Map Number
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block (Labeled as Quarter/Block in TitlePoint)
CommonLot (Labeled as Arb in TitlePoint)
Unit (Labeled as SubArb in TitlePoint)
MI
Kent
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
CommonLot (Labeled as Arb in TitlePoint)
Unit (Labeled as SubArb in TitlePoint)
MI
Livingston
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Certificate of Survey
MAP
RECODS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Map Number
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
CommonLot (Labeled as Arb in TitlePoint)
MI
Macomb
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Deeds
B/P
DEEDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Unrecorded
B/P
UNRECORDED
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Maps-St Clair
B/P
MAPS-ST CLAIR
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Condo Plan
MAP
CONDO PLAN
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
MapNumber
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Mason
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Map Number
MAP
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Mecosta
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Monroe
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
Subparcel
Unit
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block (Labeled as Quarter/Block in TitlePoint)
CommonLot (Labeled as Arb in TitlePoint)
Unit (Labeled as SubArb in TitlePoint)
MI
Montcalm
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Map Number
MAP
MAPS
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Muskegon
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Certificate of Survey
B/P
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
CommonLot (Labeled as Arb in TitlePoint)
Unit (Labeled as SubArb in TitlePoint)
MI
Newaygo
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Oakland
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Block
Parcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Deeds
B/P
DEEDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Condo Plan
MAP
CONDO PLAN
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
MapNumber
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Oceana
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
Lot
Block
PlatDocument
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Ottawa
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block (Labeled as Quarter/Block in TitlePoint)
CommonLot (Labeled as Arb in TitlePoint)
Unit (Labeled as SubArb in TitlePoint)
MI
Saginaw
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
CommonLot (Labeled as Arb in TitlePoint)
Unit (Labeled as SubArb in TitlePoint)
MI
Sanilac
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Certificate of Survey
B/P
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block (Labeled as Quarter/Block in TitlePoint)
CommonLot (Labeled as Arb in TitlePoint)
Unit (Labeled as SubArb in TitlePoint)
MI
Shiawasee
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
St Clair
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Certificate of Survey
B/P
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condo Plan
MAP
CONDO PLAN
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Map Number
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block (Labeled as Quarter/Block in TitlePoint)
CommonLot (Labeled as Arb in TitlePoint)
Unit (Labeled as SubArb in TitlePoint)
MI
St Joseph
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Van Buren
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Washtenaw
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Block (Labeled as Quarter/Block in TitlePoint)
Parcel
Arb
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MI
Wayne
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Deeds
B/P
DEEDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
City Records
B/P
CITY RECORDS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Unrecorded
B/P
UNRECORDED
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Chancery
MAP
CHANCERY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
MapNumber
Yes
Condo Plan
MAP
CONDO PLAN
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
MapNumber
Yes
Sectional/Acreage
SEC
MICHIGAN
GovernmentTract
Section
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Township
Yes
Range
Yes
Quarters
Lot
Arb

## Missouri.html

- Navigation: Title Searching > Reference > Legal Formats > Missouri

### Overview

State
County
Name
MapCode
MajorLegalName
Fields
Required
MO
Clay
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
TractNumber
Block
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
TractNumber
Block
Book
Yes
Page
Yes
Unrecorded
MAP
UNRECORDED
ParkingSpaceGarage
Arb
Share
Unit
Building
CommonLot
Lot
TractNumber
Block
MapNumber
Yes
Sectional/Acreage
SEC
5TH PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Quarters
Arb
MO
Jackson
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Subparcel
TractNumber
Lot
Unit
Named Tract
NAM
PlantName
Yes
Block
TractNumber
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
5TH PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Quarters
Arb
MO
Platte
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
TractNumber
APNSection
Block
Lot
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
TractNumber
Block
Book
Yes
Page
Yes
Sectional/Acreage 5th
SEC
5TH PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional/Acreage 6th
SEC
6TH PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Quarters
Arb

## MT.html

- Navigation: Title Searching > Reference > Legal Formats > Montana

### Overview

State
County
Name
MapCode
MajorLegalName
Fields
Required
MT
Cascade
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
APNSection
Quarters
Block
Lot
Unit
Condos
B/P
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
Book
Yes
Page
Yes
Document Numbers
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Arb Maps
MAP
ARB MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Plat Maps
MAP
PLAT MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Certificate of Survey
MAP
RECORDS OF SURVEY
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Sectional/Acreage
SEC
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MT
Flathead
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
APNSection
Quarters
Block
Lot
Unit
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
APNSection
Quarters
Block
Lot
Unit
Records of Survey
MAP
RECORDS OF SURVEY
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Named Tract
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MT
Gallatin
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractNumber
Block
Arb
Book
Yes
Page
Yes
Film
B/P
FILM
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractNumber
Block
Arb
Book
Yes
Page
Yes
Document Numbers
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Records of Survey
MAP
RECORDS OF SURVEY
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractNumber
Block
Arb
MapNumber
Yes
Minor Subdivision
MAP
MINOR SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractNumber
Block
Arb
MapNumber
Yes
Dependent Survey
MAP
DEPENDENT SURVEY
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractNumber
Block
Arb
MapNumber
Yes
Sectional/Acreage
SEC
PRINCIPAL
GovernmentTract
Section
Township
Yes
Range
Yes
Quarters
Lot
Arb
MT
Lewis and Clark
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
APNSection
Quarters
Block
Lot
Unit
Condos
B/P
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
Book
Yes
Page
Yes
Document Numbers
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Plat Maps
MAP
PLAT MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Mineral Surveys
MAP
MINERAL SURVEYS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Sectional/Acreage
SEC
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
MT
Madison
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
Book
Yes
Page
Yes
Condos
B/P
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
Book
Yes
Page
Yes
Document Numbers
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Records of Survey
MAP
RECORDS OF SURVEY
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Mining Claims
MAP
MINING CLAIMS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Farm Units
MAP
FARM UNITS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Named Tract
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
PRINCIPAL
GovernmentTract
Section
Township
Yes
Range
Yes
Quarters
Lot
Arb
MT
Missoula
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
Book
Yes
Page
Yes
Map Number
MAP
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Condos
MAP
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Townhomes
MAP
TOWNHOMES
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Duos
MAP
DUOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Records of Survey
MAP
RECORDS OF SURVEY
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Named Tract
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
PRINCIPAL
GovernmentTract
Section
Township
Yes
Range
Yes
Quarters
Lot
Arb
MT
Ravalli
Document Numbers
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Maps
MAP
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Arb
MapNumber
Yes
Named Tract
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
PRINCIPAL
GovernmentTract
Section
Township
Yes
Range
Yes
Quarters
Lot
Arb
MT
Yellowstone
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
APNSection
Quarters
Block
Lot
Unit
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Sectional/Acreage
SEC
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Quarters
Arb

## OH.html

- Navigation: Title Searching > Reference > Legal Formats > Ohio

### Overview

State
County
Name
MapCode
MajorLegalName
Fields
Required
OH
Cuyahoga
Maps
B/P
MAPS
Lot
TractParcel
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Township/ Square Plate
TSQ
Township
Yes
ArbTract
Yes
Unit
Yes
Township/ Original Lot
TOL
Township
Yes

## OR.html

- Navigation: Title Searching > Reference > Legal Formats > Oregon

### Overview

State
County
Name
MapCode
MajorLegalName
Fields
Required
OR
Benton
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Arb
OR
Clackamas
Maps
MAP
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
Section
Yes
Township
Yes
Range
Yes
Arb
Quarters
Lot
Records of Survey
B/P
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
OR
Clatsop
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Named Tract
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Arb
OR
Columbia
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Numbers
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Maps
MAP
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Arb
OR
Coos
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Named Tract
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Lot
Arb
OR
Crook
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Arb
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Block
Parcel
Arb
Document Numbers
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Maps
MAP
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Named Tract
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
OR
Deschutes
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Arb
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Arb
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Numbers
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
OR
Douglas
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Parcel
SubParcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Arb
OR
Jackson
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Arb
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Map Number
MAP
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Named Tract
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Arb
OR
Jefferson
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Arb
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Arb
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Numbers
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
OR
Josephine
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Arb
OR
Lane
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Arb
OR
Lincoln
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
OR
Linn
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Parcel
SubParcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Arb
OR
Marion
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Arb
OR
Multnomah
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
Section
Yes
Township
Yes
Range
Yes
Arb
Quarters
Lot
Records of Survey
B/P
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
OR
Polk
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Arb
OR
Tillamook
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Arb
OR
Washington
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
Condos
B/P
CONDOS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Numbers
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
Section
Yes
Township
Yes
Range
Yes
Arb
Quarters
Lot
Records of Survey
B/P
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
OR
Yamhill
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Partition Plats
MAP
PARTITION PLATS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Lot
Arb

## UT.html

- Navigation: Title Searching > Reference > Legal Formats > Utah

### Overview

State
County
Name
MapCode
MajorLegalName
Fields
Required
UT
Salt Lake
Tax ID Number
PIN
Area
Yes
APNSection
Block
Parcel
SubParcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Parcel
TractNumber
Book
Yes
Page
Yes
City Plat
MAP
CITY PLAT
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractNumber
Block
MapNumber
Yes
Mining Claims
NAM
PlantName
Yes
Block
TractNumber
Parcel
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
SALT LAKE
GovernmentTract
Section
Township
Yes
Range
Yes
Quarters
Block
Lot
Arb

## WA.html

- Navigation: Title Searching > Reference > Legal Formats > Washington

### Overview

State
County
Name
MapCode
MajorLegalName
Fields
Required
WA
Adams
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
APNSection
Quarters
Block
Lot
Unit
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
APNSection
Quarters
Block
Lot
Unit
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Short Plat
B/P
SHORT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
WILLAMETTE
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WA
Benton
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Plant Arbs
ARB
PLANT ARBS
Arb
Yes
ArbTract
Block
Parcel
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Short Plat
MAP
SHORT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Binding Site Plan
MAP
BINDING SITE PLAN
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WA
Clark
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Parcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Parcel
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Short Plat
B/P
SHORT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WA
Cowlitz
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Parcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Parcel
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Short Plat
B/P
SHORT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Large Lot Subdivision
B/P
LARGE LOT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Binding Site Plan
B/P
BINDING SITE PLAN
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Named Tract
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Arb
WA
Franklin
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Parcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Parcel
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Short Plat
B/P
SHORT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Binding Site Plan
B/P
BINDING SITE PLAN
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Irrigation Block
MAP
IRRIGATION BLOCK
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Quarters
Arb
WA
Grant
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Parcel
SubParcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Parcel
SubParcel
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Short Plat
B/P
SHORT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Binding Site Plan
B/P
BINDING SITE PLAN
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Irrigation Block
MAP
IRRIGATION BLOCK
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Unrecorded
MAP
UNRECORDED
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Arb
WA
Island
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Short Plat
B/P
SHORT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Planned Res Dev
B/P
PLANNED RES DEV
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Miscellaneous Maps
B/P
MISCELLANEOUS MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Short Plat (Map)
MAP
SHORT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Condos
MAP
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Binding Site Plan
MAP
BINDING SITE PLAN
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WA
King
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Document Numbers
DOC
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
PlatDocument
Yes
AC Number
MAP
AC NUMBER
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
Sectional/Acreage
SEC
WILLAMETTE
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
WA
Kitsap
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WA
Okanogan
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Parcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Parcel
Maps
MAP
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WA
Pierce
Maps
B/P
MAPS
Share
ParkingSpaceGarage
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
Share
ParkingSpaceGarage
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Document Numbers
DOC
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
PlatDocument
Yes
AC Number
MAP
AC NUMBER
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
Sectional
SEC
WILLAMETTE
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
WA
San Juan
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Parcel
Subparcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Short Plat
B/P
SHORT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Planned Unit Dev
B/P
PLANNED UNIT DEV
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Binding Site Plan
B/P
BINDING SITE PLAN
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WA
Skagit
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Short Plat
B/P
SHORT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Short Plat (Map)
MAP
SHORT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WA
Snohomish
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Document Numbers
DOC
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
PlatDocument
Yes
AC Number
MAP
AC NUMBER
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Sectional/Acreage
SEC
WILLAMETTE
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
WA
Spokane
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Parcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Parcel
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Short Plat
B/P
SHORT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Binding Site Plan
B/P
BINDING SITE PLAN
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Yes
Township
Yes
Range
Yes
Block
Arb
WA
Thurston
Document Numbers
DOC
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
PlatDocument
Yes
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
SubParcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Boundary Line Adjustment
MAP
BOUNDARY LINE ADJUSTMENT
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Binding Site Plan
MAP
BINDING SITE PLAN
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Large Lot Subdivision
MAP
LARGE LOT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Short Subdivision
MAP
SHORT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Non-Platted Street Sub
MAP
NON-PLATTED STREET SUB
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
MapNumber
Yes
Maps
B/P
MAPS
ParkingSpaceGarage
Unit
Building
CommonLot
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Records of Survey
B/P
RECORDS OF SURVEY
Unit
Parcel
Lot
TractParcel
Block
Book
Yes
Page
Yes
Sectional/Acreage
SEC
WILLAMETTE
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Named Accounts
NAM
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
PlantName
Yes
WA
Whatcom
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Parcel
Subparcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Parcel
Subparcel
Maps
B/P
MAPS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Short Plat
B/P
SHORT SUBDIVISION
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Condos
B/P
CONDOS
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Binding Site Plan
B/P
BINDING SITE PLAN
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
TractParcel
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WA
Yakima
Tax ID Number
ARB
APN ARBS
ArbTract
Yes
Parcel
Arb
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Parcel
Arb
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Short Plat
B/P
SHORT SUBDIVISION
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
Book
Yes
Page
Yes
Document Numbers
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
TractNumber
PlatDocument
Yes
Named Tract
NAM
PlantName
Yes
Block
TractNumber
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
WILLAMETTE
GovernmentTract
Section
Township
Yes
Range
Yes
Quarters
Lot
Arb
Sectional Plant Arbs
SPA
SEC PLANT ARBS
Section
Township
Yes
Range
Yes
Quarters
Lot
Arb

## WI.html

- Navigation: Title Searching > Reference > Legal Formats > Wisconsin

### Overview

State
County
Name
MapCode
MajorLegalName
Fields
Required
WI
Adams
Certified Survey Maps
MAP
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Named Tracts
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
4
TH
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WI
Columbia
Certified Survey Maps
MAP
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Named Tracts
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
4
TH
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WI
Dane
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
SubParcel
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Certified Survey Maps
MAP
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
AY Accounts
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
4
TH
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WI
Fond du Lac
Certified Survey Maps
MAP
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Named Tracts
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
4
TH
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WI
Green Lake
Certified Survey Maps
MAP
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Named Tracts
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
4
TH
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WI
Iowa
Certified Survey Maps
MAP
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Named Tracts
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
4
TH
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WI
Junea
Certified Survey Maps
MAP
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Named Tracts
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
4
TH
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WI
Milwaukee
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
SubParcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Certified Survey Maps
MAP
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
4
TH
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Maps - Arbed
TCT
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Phase
Tract
Yes
WI
Richland
Certified Survey Maps
MAP
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Named Tracts
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
4
TH
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WI
Sauk
Certified Survey Maps
MAP
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Named Tracts
NAM
PlantName
Yes
Block
Lot
CommonLot
Building
Unit
Share
ParkingSpaceGarage
Arb
Sectional/Acreage
SEC
4
TH
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
WI
Walworth
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Parcel
Plant Arbs
ARB
PLANT ARBS
ArbTract
Yes
Arb
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Certified Survey Maps
MAP
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
4
TH
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Office Accounts
TCT
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Phase
Tract
Yes
WI
Waukesha
Tax ID Numbers
ARB
APN ARBS
ArbTract
Yes
Block
Parcel
Subparcel
Maps
B/P
MAPS
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Condos
B/P
CONDO
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
Book
Yes
Page
Yes
Document Number
DOC
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
PlatDocument
Yes
Certified Survey Maps
MAP
RECORDS OF SURVEY
Share
Unit
Building
CommonLot
ParkingSpaceGarage
Arb
Lot
Block
MapNumber
Yes
Sectional/Acreage
SEC
4
TH
PRINCIPAL
GovernmentTract
Section
Yes
Township
Yes
Range
Yes
Quarters
Lot
Arb
Office Accounts
TCT
Arb
ParkingSpaceGarage
Share
Unit
Building
CommonLot
Lot
Block
Phase
Tract
Yes

## DocType.html

- Navigation: Title Searching > Reference > Doc Type Categories

### Doc Types Represented by Categories (TitlePoint searches only)

Category
Description
Doc Type
Doc Subtype
Assignments
Assignment,Release & Subordination of Liens
AFF
MLA
Assignments
Assignment,Release & Subordination of Liens
AFF
MSR
Assignments
Assignment,Release & Subordination of Liens
AGR
ASB
Assignments
Assignment,Release & Subordination of Liens
AOR
ASN
Assignments
Assignment,Release & Subordination of Liens
AOR
CAN
Assignments
Assignment,Release & Subordination of Liens
AOR
PAR
Assignments
Assignment,Release & Subordination of Liens
AOR
REL
Assignments
Assignment,Release & Subordination of Liens
AOR
TER
Assignments
Assignment,Release & Subordination of Liens
ASE
ASN
Assignments
Assignment,Release & Subordination of Liens
ASE
CAN
Assignments
Assignment,Release & Subordination of Liens
ASE
PAR
Assignments
Assignment,Release & Subordination of Liens
ASE
REL
Assignments
Assignment,Release & Subordination of Liens
ASE
RSN
Assignments
Assignment,Release & Subordination of Liens
ASE
SAT
Assignments
Assignment,Release & Subordination of Liens
ASE
TER
Assignments
Assignment,Release & Subordination of Liens
BND
REL
Assignments
Assignment,Release & Subordination of Liens
CLM
REL
Assignments
Assignment,Release & Subordination of Liens
CLM
SAT
Assignments
Assignment,Release & Subordination of Liens
CRJ
DCH
Assignments
Assignment,Release & Subordination of Liens
CRJ
REL
Assignments
Assignment,Release & Subordination of Liens
CRJ
SAT
Assignments
Assignment,Release & Subordination of Liens
CRJ
TER
Assignments
Assignment,Release & Subordination of Liens
CTF
PAY
Assignments
Assignment,Release & Subordination of Liens
CTF
RDM
Assignments
Assignment,Release & Subordination of Liens
CTR
Assignments
Assignment,Release & Subordination of Liens
ELN
REL
Assignments
Assignment,Release & Subordination of Liens
ETL
PAR
Assignments
Assignment,Release & Subordination of Liens
ETL
REL
Assignments
Assignment,Release & Subordination of Liens
ETL
SAT
Assignments
Assignment,Release & Subordination of Liens
FAJ
PAR
Assignments
Assignment,Release & Subordination of Liens
FAJ
REL
Assignments
Assignment,Release & Subordination of Liens
FAJ
SBD
Assignments
Assignment,Release & Subordination of Liens
FAJ
TER
Assignments
Assignment,Release & Subordination of Liens
FIN
ASN
Assignments
Assignment,Release & Subordination of Liens
FIN
PAR
Assignments
Assignment,Release & Subordination of Liens
FIN
REL
Assignments
Assignment,Release & Subordination of Liens
FIN
SAT
Assignments
Assignment,Release & Subordination of Liens
FIN
SBD
Assignments
Assignment,Release & Subordination of Liens
FIN
TER
Assignments
Assignment,Release & Subordination of Liens
IND
PAR
Assignments
Assignment,Release & Subordination of Liens
IND
REL
Assignments
Assignment,Release & Subordination of Liens
IND
TER
Assignments
Assignment,Release & Subordination of Liens
JDC
PAR
Assignments
Assignment,Release & Subordination of Liens
JDC
REL
Assignments
Assignment,Release & Subordination of Liens
JDG
ASN
Assignments
Assignment,Release & Subordination of Liens
JDG
DSM
Assignments
Assignment,Release & Subordination of Liens
JDG
PAR
Assignments
Assignment,Release & Subordination of Liens
JDG
REL
Assignments
Assignment,Release & Subordination of Liens
JDG
SAT
Assignments
Assignment,Release & Subordination of Liens
JDG
SBD
Assignments
Assignment,Release & Subordination of Liens
JDG
TER
Assignments
Assignment,Release & Subordination of Liens
JDG
VAC
Assignments
Assignment,Release & Subordination of Liens
JDG
WDW
Assignments
Assignment,Release & Subordination of Liens
JDJ
PAR
Assignments
Assignment,Release & Subordination of Liens
JDJ
REL
Assignments
Assignment,Release & Subordination of Liens
JDJ
SAT
Assignments
Assignment,Release & Subordination of Liens
LNC
CAN
Assignments
Assignment,Release & Subordination of Liens
LNC
PAR
Assignments
Assignment,Release & Subordination of Liens
LNC
REL
Assignments
Assignment,Release & Subordination of Liens
LNC
RML
Assignments
Assignment,Release & Subordination of Liens
LNC
SAT
Assignments
Assignment,Release & Subordination of Liens
LND
REL
Assignments
Assignment,Release & Subordination of Liens
LNF
PAR
Assignments
Assignment,Release & Subordination of Liens
LNF
REL
Assignments
Assignment,Release & Subordination of Liens
LNF
WDW
Assignments
Assignment,Release & Subordination of Liens
LNI
REL
Assignments
Assignment,Release & Subordination of Liens
LNN
ASN
Assignments
Assignment,Release & Subordination of Liens
LNN
CAN
Assignments
Assignment,Release & Subordination of Liens
LNN
PAR
Assignments
Assignment,Release & Subordination of Liens
LNN
REL
Assignments
Assignment,Release & Subordination of Liens
LNN
RSN
Assignments
Assignment,Release & Subordination of Liens
LNN
SAT
Assignments
Assignment,Release & Subordination of Liens
LNN
SBD
Assignments
Assignment,Release & Subordination of Liens
LNN
TER
Assignments
Assignment,Release & Subordination of Liens
LNN
WDW
Assignments
Assignment,Release & Subordination of Liens
LNP
REL
Assignments
Assignment,Release & Subordination of Liens
LNR
REL
Assignments
Assignment,Release & Subordination of Liens
LNR
RML
Assignments
Assignment,Release & Subordination of Liens
LNR
SAT
Assignments
Assignment,Release & Subordination of Liens
LNR
WDW
Assignments
Assignment,Release & Subordination of Liens
LNS
REL
Assignments
Assignment,Release & Subordination of Liens
LNS
RML
Assignments
Assignment,Release & Subordination of Liens
LNS
SAT
Assignments
Assignment,Release & Subordination of Liens
LNS
WDW
Assignments
Assignment,Release & Subordination of Liens
LNU
REL
Assignments
Assignment,Release & Subordination of Liens
LNU
WDW
Assignments
Assignment,Release & Subordination of Liens
LNW
REL
Assignments
Assignment,Release & Subordination of Liens
LNW
SAT
Assignments
Assignment,Release & Subordination of Liens
LNY
PAR
Assignments
Assignment,Release & Subordination of Liens
LNY
REL
Assignments
Assignment,Release & Subordination of Liens
LNY
SAT
Assignments
Assignment,Release & Subordination of Liens
LNY
SBD
Assignments
Assignment,Release & Subordination of Liens
LSE
AAS
Assignments
Assignment,Release & Subordination of Liens
LSE
ASA
Assignments
Assignment,Release & Subordination of Liens
LSE
ASB
Assignments
Assignment,Release & Subordination of Liens
LSE
ASN
Assignments
Assignment,Release & Subordination of Liens
LSE
CAN
Assignments
Assignment,Release & Subordination of Liens
LSE
PAR
Assignments
Assignment,Release & Subordination of Liens
LSE
RAS
Assignments
Assignment,Release & Subordination of Liens
LSE
REL
Assignments
Assignment,Release & Subordination of Liens
LSE
RSN
Assignments
Assignment,Release & Subordination of Liens
LSE
RVC
Assignments
Assignment,Release & Subordination of Liens
LSE
SBD
Assignments
Assignment,Release & Subordination of Liens
LSE
TER
Assignments
Assignment,Release & Subordination of Liens
LSO
ASA
Assignments
Assignment,Release & Subordination of Liens
LSO
ASN
Assignments
Assignment,Release & Subordination of Liens
LSO
PAR
Assignments
Assignment,Release & Subordination of Liens
LSO
REL
Assignments
Assignment,Release & Subordination of Liens
LVY
REL
Assignments
Assignment,Release & Subordination of Liens
MEJ
ASN
Assignments
Assignment,Release & Subordination of Liens
MEJ
PAR
Assignments
Assignment,Release & Subordination of Liens
MEJ
REL
Assignments
Assignment,Release & Subordination of Liens
MEJ
SAT
Assignments
Assignment,Release & Subordination of Liens
MEJ
SBD
Assignments
Assignment,Release & Subordination of Liens
MEM
ASN
Assignments
Assignment,Release & Subordination of Liens
MEM
CAN
Assignments
Assignment,Release & Subordination of Liens
MEM
PAR
Assignments
Assignment,Release & Subordination of Liens
MEM
REL
Assignments
Assignment,Release & Subordination of Liens
MEM
SBD
Assignments
Assignment,Release & Subordination of Liens
MEM
TER
Assignments
Assignment,Release & Subordination of Liens
MLB
PAR
Assignments
Assignment,Release & Subordination of Liens
MLB
REL
Assignments
Assignment,Release & Subordination of Liens
MLN
ASN
Assignments
Assignment,Release & Subordination of Liens
MLN
PAR
Assignments
Assignment,Release & Subordination of Liens
MLN
REL
Assignments
Assignment,Release & Subordination of Liens
MLN
SAT
Assignments
Assignment,Release & Subordination of Liens
MLN
TER
Assignments
Assignment,Release & Subordination of Liens
MTG
AAS
Assignments
Assignment,Release & Subordination of Liens
MTG
AMA
Assignments
Assignment,Release & Subordination of Liens
MTG
AMR
Assignments
Assignment,Release & Subordination of Liens
MTG
ASA
Assignments
Assignment,Release & Subordination of Liens
MTG
ASN
Assignments
Assignment,Release & Subordination of Liens
MTG
MOP
Assignments
Assignment,Release & Subordination of Liens
MTG
PAR
Assignments
Assignment,Release & Subordination of Liens
MTG
RAD
Assignments
Assignment,Release & Subordination of Liens
MTG
RAM
Assignments
Assignment,Release & Subordination of Liens
MTG
RAS
Assignments
Assignment,Release & Subordination of Liens
MTG
RCA
Assignments
Assignment,Release & Subordination of Liens
MTG
REA
Assignments
Assignment,Release & Subordination of Liens
MTG
REL
Assignments
Assignment,Release & Subordination of Liens
MTG
RRM
Assignments
Assignment,Release & Subordination of Liens
MTG
RSU
Assignments
Assignment,Release & Subordination of Liens
MTG
SAT
Assignments
Assignment,Release & Subordination of Liens
MTG
SBD
Assignments
Assignment,Release & Subordination of Liens
NOL
PAR
Assignments
Assignment,Release & Subordination of Liens
NOL
REL
Assignments
Assignment,Release & Subordination of Liens
NOL
SBD
Assignments
Assignment,Release & Subordination of Liens
NTE
REL
Assignments
Assignment,Release & Subordination of Liens
PRM
REL
Assignments
Assignment,Release & Subordination of Liens
SAG
PAR
Assignments
Assignment,Release & Subordination of Liens
SAG
REL
Assignments
Assignment,Release & Subordination of Liens
SAG
TER
Assignments
Assignment,Release & Subordination of Liens
SAL
REL
Assignments
Assignment,Release & Subordination of Liens
TDA
AAS
Assignments
Assignment,Release & Subordination of Liens
TDA
AMA
Assignments
Assignment,Release & Subordination of Liens
TDA
AMB
Assignments
Assignment,Release & Subordination of Liens
TDA
ASA
Assignments
Assignment,Release & Subordination of Liens
TDA
ASN
Assignments
Assignment,Release & Subordination of Liens
TDA
CAN
Assignments
Assignment,Release & Subordination of Liens
TDA
COA
Assignments
Assignment,Release & Subordination of Liens
TDA
MOP
Assignments
Assignment,Release & Subordination of Liens
TDA
PAA
Assignments
Assignment,Release & Subordination of Liens
TDA
PAR
Assignments
Assignment,Release & Subordination of Liens
TDA
PCA
Assignments
Assignment,Release & Subordination of Liens
TDA
PRC
Assignments
Assignment,Release & Subordination of Liens
TDA
RAD
Assignments
Assignment,Release & Subordination of Liens
TDA
RAM
Assignments
Assignment,Release & Subordination of Liens
TDA
RAS
Assignments
Assignment,Release & Subordination of Liens
TDA
RCA
Assignments
Assignment,Release & Subordination of Liens
TDA
REA
Assignments
Assignment,Release & Subordination of Liens
TDA
REC
Assignments
Assignment,Release & Subordination of Liens
TDA
REL
Assignments
Assignment,Release & Subordination of Liens
TDA
RQP
Assignments
Assignment,Release & Subordination of Liens
TDA
RSM
Assignments
Assignment,Release & Subordination of Liens
TDA
RSN
Assignments
Assignment,Release & Subordination of Liens
TDA
RSR
Assignments
Assignment,Release & Subordination of Liens
TDA
RSU
Assignments
Assignment,Release & Subordination of Liens
TDA
SAS
Assignments
Assignment,Release & Subordination of Liens
TDA
SAT
Assignments
Assignment,Release & Subordination of Liens
TDA
SBD
Assignments
Assignment,Release & Subordination of Liens
TDA
SFR
Assignments
Assignment,Release & Subordination of Liens
TDA
SPR
Assignments
Assignment,Release & Subordination of Liens
TDD
AAS
Assignments
Assignment,Release & Subordination of Liens
TDD
AMA
Assignments
Assignment,Release & Subordination of Liens
TDD
AMB
Assignments
Assignment,Release & Subordination of Liens
TDD
AMR
Assignments
Assignment,Release & Subordination of Liens
TDD
ASA
Assignments
Assignment,Release & Subordination of Liens
TDD
ASB
Assignments
Assignment,Release & Subordination of Liens
TDD
ASN
Assignments
Assignment,Release & Subordination of Liens
TDD
ASR
Assignments
Assignment,Release & Subordination of Liens
TDD
AST
Assignments
Assignment,Release & Subordination of Liens
TDD
CAN
Assignments
Assignment,Release & Subordination of Liens
TDD
COA
Assignments
Assignment,Release & Subordination of Liens
TDD
MOP
Assignments
Assignment,Release & Subordination of Liens
TDD
PAA
Assignments
Assignment,Release & Subordination of Liens
TDD
PAR
Assignments
Assignment,Release & Subordination of Liens
TDD
PCA
Assignments
Assignment,Release & Subordination of Liens
TDD
PRC
Assignments
Assignment,Release & Subordination of Liens
TDD
RAD
Assignments
Assignment,Release & Subordination of Liens
TDD
RAM
Assignments
Assignment,Release & Subordination of Liens
TDD
RAS
Assignments
Assignment,Release & Subordination of Liens
TDD
RCA
Assignments
Assignment,Release & Subordination of Liens
TDD
REA
Assignments
Assignment,Release & Subordination of Liens
TDD
REC
Assignments
Assignment,Release & Subordination of Liens
TDD
REL
Assignments
Assignment,Release & Subordination of Liens
TDD
RQP
Assignments
Assignment,Release & Subordination of Liens
TDD
RRM
Assignments
Assignment,Release & Subordination of Liens
TDD
RSM
Assignments
Assignment,Release & Subordination of Liens
TDD
RSN
Assignments
Assignment,Release & Subordination of Liens
TDD
RSR
Assignments
Assignment,Release & Subordination of Liens
TDD
RSU
Assignments
Assignment,Release & Subordination of Liens
TDD
RVC
Assignments
Assignment,Release & Subordination of Liens
TDD
SAS
Assignments
Assignment,Release & Subordination of Liens
TDD
SAT
Assignments
Assignment,Release & Subordination of Liens
TDD
SBD
Assignments
Assignment,Release & Subordination of Liens
TDD
SFR
Assignments
Assignment,Release & Subordination of Liens
TDD
SPR
Assignments
Assignment,Release & Subordination of Liens
TDD
SRR
Assignments
Assignment,Release & Subordination of Liens
TDD
TEA
Assignments
Assignment,Release & Subordination of Liens
TDR
AAS
Assignments
Assignment,Release & Subordination of Liens
TDR
AMA
Assignments
Assignment,Release & Subordination of Liens
TDR
AMB
Assignments
Assignment,Release & Subordination of Liens
TDR
AMR
Assignments
Assignment,Release & Subordination of Liens
TDR
ASA
Assignments
Assignment,Release & Subordination of Liens
TDR
ASB
Assignments
Assignment,Release & Subordination of Liens
TDR
ASN
Assignments
Assignment,Release & Subordination of Liens
TDR
ASR
Assignments
Assignment,Release & Subordination of Liens
TDR
AST
Assignments
Assignment,Release & Subordination of Liens
TDR
CAN
Assignments
Assignment,Release & Subordination of Liens
TDR
COA
Assignments
Assignment,Release & Subordination of Liens
TDR
MOP
Assignments
Assignment,Release & Subordination of Liens
TDR
PAA
Assignments
Assignment,Release & Subordination of Liens
TDR
PAR
Assignments
Assignment,Release & Subordination of Liens
TDR
PCA
Assignments
Assignment,Release & Subordination of Liens
TDR
PRC
Assignments
Assignment,Release & Subordination of Liens
TDR
RAD
Assignments
Assignment,Release & Subordination of Liens
TDR
RAM
Assignments
Assignment,Release & Subordination of Liens
TDR
RAS
Assignments
Assignment,Release & Subordination of Liens
TDR
RCA
Assignments
Assignment,Release & Subordination of Liens
TDR
REA
Assignments
Assignment,Release & Subordination of Liens
TDR
REC
Assignments
Assignment,Release & Subordination of Liens
TDR
REL
Assignments
Assignment,Release & Subordination of Liens
TDR
RQP
Assignments
Assignment,Release & Subordination of Liens
TDR
RRM
Assignments
Assignment,Release & Subordination of Liens
TDR
RSN
Assignments
Assignment,Release & Subordination of Liens
TDR
RSR
Assignments
Assignment,Release & Subordination of Liens
TDR
RSU
Assignments
Assignment,Release & Subordination of Liens
TDR
RVC
Assignments
Assignment,Release & Subordination of Liens
TDR
SAT
Assignments
Assignment,Release & Subordination of Liens
TDR
SBD
Assignments
Assignment,Release & Subordination of Liens
TDR
SFR
Assignments
Assignment,Release & Subordination of Liens
TDR
SPR
Assignments
Assignment,Release & Subordination of Liens
TDR
SRR
Assignments
Assignment,Release & Subordination of Liens
TDR
TEA
Assignments
Assignment,Release & Subordination of Liens
TRU
PAR
Assignments
Assignment,Release & Subordination of Liens
TRU
REL
Assignments
Assignment,Release & Subordination of Liens
TRU
TER
Assignments
Assignment,Release & Subordination of Liens
WAR
PAR
Assignments
Assignment,Release & Subordination of Liens
WAR
REL
Assignments
Assignment,Release & Subordination of Liens
WRE
REL
Assignments
Assignment,Release & Subordination of Liens
WRI
PAR
Assignments
Assignment,Release & Subordination of Liens
WRI
REL
Assignments
Assignment,Release & Subordination of Liens
AOR
AAS
Assignments
Assignment,Release & Subordination of Liens
JDG
EXP
Assignments
Assignment,Release & Subordination of Liens
LSE
RSU
Assignments
Assignment,Release & Subordination of Liens
JDC
SBD
Assignments
Assignment,Release & Subordination of Liens
LSO
SRN
Assignments
Assignment,Release & Subordination of Liens
MTG
DCH
Assignments
Assignment,Release & Subordination of Liens
TDD
DCH
Assignments
Assignment,Release & Subordination of Liens
TDD
TSC
Assignments
Assignment,Release & Subordination of Liens
LNS
SBD
Assignments
Assignment,Release & Subordination of Liens
LNF
SBD
Assignments
Assignment,Release & Subordination of Liens
TRU
ASN
Assignments
Assignment,Release & Subordination of Liens
AFF
ASN
Assignments
Assignment,Release & Subordination of Liens
AFF
PAR
Assignments
Assignment,Release & Subordination of Liens
AFF
REL
Assignments
Assignment,Release & Subordination of Liens
AFF
RML
Assignments
Assignment,Release & Subordination of Liens
AFF
RSN
Assignments
Assignment,Release & Subordination of Liens
AFF
RVC
Assignments
Assignment,Release & Subordination of Liens
AFF
SAT
Assignments
Assignment,Release & Subordination of Liens
AFF
TER
Assignments
Assignment,Release & Subordination of Liens
AGR
AMB
Assignments
Assignment,Release & Subordination of Liens
AGR
PCA
Assignments
Assignment,Release & Subordination of Liens
AGR
RCA
Assignments
Assignment,Release & Subordination of Liens
AGR
RSU
Assignments
Assignment,Release & Subordination of Liens
ANS
REL
Assignments
Assignment,Release & Subordination of Liens
AOR
COA
Assignments
Assignment,Release & Subordination of Liens
AOR
PAA
Assignments
Assignment,Release & Subordination of Liens
AOR
PTT
Assignments
Assignment,Release & Subordination of Liens
AOR
RAS
Assignments
Assignment,Release & Subordination of Liens
AOR
SAT
Assignments
Assignment,Release & Subordination of Liens
AOR
SBD
Assignments
Assignment,Release & Subordination of Liens
ASE
RML
Assignments
Assignment,Release & Subordination of Liens
CRJ
DSM
Assignments
Assignment,Release & Subordination of Liens
CRJ
VAC
Assignments
Assignment,Release & Subordination of Liens
FIN
ASA
Assignments
Assignment,Release & Subordination of Liens
FIN
RAS
Assignments
Assignment,Release & Subordination of Liens
JDG
CAN
Assignments
Assignment,Release & Subordination of Liens
JDG
DCH
Assignments
Assignment,Release & Subordination of Liens
JDG
PAA
Assignments
Assignment,Release & Subordination of Liens
JDG
RAS
Assignments
Assignment,Release & Subordination of Liens
JDG
REA
Assignments
Assignment,Release & Subordination of Liens
JDG
RSN
Assignments
Assignment,Release & Subordination of Liens
JDG
SET
Assignments
Assignment,Release & Subordination of Liens
LNF
DCH
Assignments
Assignment,Release & Subordination of Liens
LNF
NAT
Assignments
Assignment,Release & Subordination of Liens
LNF
RVR
Assignments
Assignment,Release & Subordination of Liens
LNI
SBD
Assignments
Assignment,Release & Subordination of Liens
LNN
DCH
Assignments
Assignment,Release & Subordination of Liens
LNN
DSC
Assignments
Assignment,Release & Subordination of Liens
LNN
RAS
Assignments
Assignment,Release & Subordination of Liens
LNN
RML
Assignments
Assignment,Release & Subordination of Liens
LNN
RVC
Assignments
Assignment,Release & Subordination of Liens
LNS
PAR
Assignments
Assignment,Release & Subordination of Liens
LSE
AMA
Assignments
Assignment,Release & Subordination of Liens
LSE
AMB
Assignments
Assignment,Release & Subordination of Liens
LSE
ARS
Assignments
Assignment,Release & Subordination of Liens
LSE
CLA
Assignments
Assignment,Release & Subordination of Liens
LSE
COA
Assignments
Assignment,Release & Subordination of Liens
LSE
PAA
Assignments
Assignment,Release & Subordination of Liens
LSE
PCA
Assignments
Assignment,Release & Subordination of Liens
LSE
PTT
Assignments
Assignment,Release & Subordination of Liens
LSE
RCA
Assignments
Assignment,Release & Subordination of Liens
LSE
TEA
Assignments
Assignment,Release & Subordination of Liens
LVY
VAC
Assignments
Assignment,Release & Subordination of Liens
MLN
AMR
Assignments
Assignment,Release & Subordination of Liens
MLN
BRL
Assignments
Assignment,Release & Subordination of Liens
MLN
DCH
Assignments
Assignment,Release & Subordination of Liens
MLN
SBD
Assignments
Assignment,Release & Subordination of Liens
MTG
COA
Assignments
Assignment,Release & Subordination of Liens
MTG
DSC
Assignments
Assignment,Release & Subordination of Liens
MTG
PAA
Assignments
Assignment,Release & Subordination of Liens
MTG
PCA
Assignments
Assignment,Release & Subordination of Liens
MTG
TER
Assignments
Assignment,Release & Subordination of Liens
NTE
ASN
Assignments
Assignment,Release & Subordination of Liens
NTE
CAN
Assignments
Assignment,Release & Subordination of Liens
PRM
ASN
Assignments
Assignment,Release & Subordination of Liens
PRM
CAN
Assignments
Assignment,Release & Subordination of Liens
PRM
SBD
Assignments
Assignment,Release & Subordination of Liens
SAG
ASN
Assignments
Assignment,Release & Subordination of Liens
SAG
CLA
Assignments
Assignment,Release & Subordination of Liens
SAG
SAT
Assignments
Assignment,Release & Subordination of Liens
SAG
SBD
Assignments
Assignment,Release & Subordination of Liens
TDD
CAA
Assignments
Assignment,Release & Subordination of Liens
TDD
CAR
Assignments
Assignment,Release & Subordination of Liens
TDD
MLA
Assignments
Assignment,Release & Subordination of Liens
TDD
POT
Assignments
Assignment,Release & Subordination of Liens
TDD
RQR
Assignments
Assignment,Release & Subordination of Liens
TDD
RSG
Assignments
Assignment,Release & Subordination of Liens
TDD
RTS
Assignments
Assignment,Release & Subordination of Liens
TDD
RVR
Assignments
Assignment,Release & Subordination of Liens
TDD
TSP
Assignments
Assignment,Release & Subordination of Liens
MEM
RVC
Assignments
Assignment,Release & Subordination of Liens
MLN
WDW
Assignments
Assignment,Release & Subordination of Liens
TRU
RVC
Assignments
Assignment,Release & Subordination of Liens
MLN
RAD
Assignments
Assignment,Release & Subordination of Liens
AOR
DCH
Assignments
Assignment,Release & Subordination of Liens
CLM
ASN
Assignments
Assignment,Release & Subordination of Liens
MTG
CAN
Assignments
Assignment,Release & Subordination of Liens
MTG
RSR
Assignments
Assignment,Release & Subordination of Liens
TRU
DIS
Assignments
Assignment,Release & Subordination of Liens
MLB
DCH
Assignments
Assignment,Release & Subordination of Liens
LNH
REL
Assignments
Assignment,Release & Subordination of Liens
AOR
ASA
Assignments
Assignment,Release & Subordination of Liens
TDR
RQR
Assignments
Assignment,Release & Subordination of Liens
MEM
PTT
Assignments
Assignment,Release & Subordination of Liens
TSC
RDM
Assignments
Assignment,Release & Subordination of Liens
LSE
TES
Assignments
Assignment,Release & Subordination of Liens
TDR
DCH
Assignments
Assignment,Release & Subordination of Liens
LSE
RAD
Assignments
Assignment,Release & Subordination of Liens
JDC
SAT
Assignments
Assignment,Release & Subordination of Liens
JDG
AMR
Assignments
Assignment,Release & Subordination of Liens
PRM
SAT
Assignments
Assignment,Release & Subordination of Liens
AOR
RAM
Assignments
Assignment,Release & Subordination of Liens
AOR
AMA
Assignments
Assignment,Release & Subordination of Liens
FIN
RAD
Assignments
Assignment,Release & Subordination of Liens
JDG
DIS
Assignments
Assignment,Release & Subordination of Liens
JDG
PVA
Assignments
Assignment,Release & Subordination of Liens
LNH
PAR
Assignments
Assignment,Release & Subordination of Liens
LSO
PAA
Assignments
Assignment,Release & Subordination of Liens
TRU
RSG
Assignments
Assignment,Release & Subordination of Liens
MTG
SFR
Assignments
Assignment,Release & Subordination of Liens
BVL
REL
Assignments
Assignment,Release & Subordination of Liens
ETL
DCH
Assignments
Assignment,Release & Subordination of Liens
IND
ASN
Assignments
Assignment,Release & Subordination of Liens
LNI
ASN
Assignments
Assignment,Release & Subordination of Liens
LNN
PAA
Assignments
Assignment,Release & Subordination of Liens
LNR
DCH
Assignments
Assignment,Release & Subordination of Liens
LSO
COA
Assignments
Assignment,Release & Subordination of Liens
NTE
PAA
Assignments
Assignment,Release & Subordination of Liens
PRM
COA
Assignments
Assignment,Release & Subordination of Liens
WAR
SAT
Assignments
Assignment,Release & Subordination of Liens
ASE
RAD
Assignments
Assignment,Release & Subordination of Liens
CRJ
AMR
Assignments
Assignment,Release & Subordination of Liens
ASE
DCH
Assignments
Assignment,Release & Subordination of Liens
JDC
CAN
Assignments
Assignment,Release & Subordination of Liens
ETL
TRF
Assignments
Assignment,Release & Subordination of Liens
LNC
DCH
Assignments
Assignment,Release & Subordination of Liens
LNH
CAN
Assignments
Assignment,Release & Subordination of Liens
MLN
RSR
Assignments
Assignment,Release & Subordination of Liens
MLN
RSU
Assignments
Assignment,Release & Subordination of Liens
TDR
TSC
Assignments
Assignment,Release & Subordination of Liens
AOR
SFR
Assignments
Assignment,Release & Subordination of Liens
AOR
CAR
Assignments
Assignment,Release & Subordination of Liens
ASE
RSR
Assignments
Assignment,Release & Subordination of Liens
AOR
REC
Assignments
Assignment,Release & Subordination of Liens
TDR
PAS
Assignments
Assignment,Release & Subordination of Liens
MTG
PRC
Assignments
Assignment,Release & Subordination of Liens
MEM
RSN
Assignments
Assignment,Release & Subordination of Liens
MEM
ASA
Assignments
Assignment,Release & Subordination of Liens
MTG
CAR
Assignments
Assignment,Release & Subordination of Liens
TDR
RVR
Assignments
Assignment,Release & Subordination of Liens
TDD
POP
Assignments
Assignment,Release & Subordination of Liens
LSE
SAT
Assignments
Assignment,Release & Subordination of Liens
TRU
REC
Assignments
Assignment,Release & Subordination of Liens
CEL
CAN
Assignments
Assignment,Release & Subordination of Liens
CEL
REL
Assignments
Assignment,Release & Subordination of Liens
CEL
SAT
Assignments
Assignment,Release & Subordination of Liens
CEL
TER
Assignments
Assignment,Release & Subordination of Liens
AOR
RAD
Assignments
Assignment,Release & Subordination of Liens
LNA
REL
Assignments
Assignment,Release & Subordination of Liens
ABI
ASN
Assignments
Assignment,Release & Subordination of Liens
ABI
REL
Assignments
Assignment,Release & Subordination of Liens
ABI
SAT
Assignments
Assignment,Release & Subordination of Liens
LNA
PAR
Assignments
Assignment,Release & Subordination of Liens
LNA
SBD
Assignments
Assignment,Release & Subordination of Liens
MTG
REC
Assignments
Assignment,Release & Subordination of Liens
MTG
CAA
Assignments
Assignment,Release & Subordination of Liens
ITL
REL
Assignments
Assignment,Release & Subordination of Liens
LNW
RNW
Assignments
Assignment,Release & Subordination of Liens
TDR
RTS
Assignments
Assignment,Release & Subordination of Liens
TDA
CAR
Assignments
Assignment,Release & Subordination of Liens
TDA
DCH
Assignments
Assignment,Release & Subordination of Liens
TDA
POP
Assignments
Assignment,Release & Subordination of Liens
TDA
RQR
Assignments
Assignment,Release & Subordination of Liens
TDA
RTS
Assignments
Assignment,Release & Subordination of Liens
TDA
TSC
Assignments
Assignment,Release & Subordination of Liens
JDF
CAN
Assignments
Assignment,Release & Subordination of Liens
JDF
REL
Assignments
Assignment,Release & Subordination of Liens
JDF
WDW
Assignments
Assignment,Release & Subordination of Liens
CJG
SMI
Assignments
Assignment,Release & Subordination of Liens
CRJ
SMI
Assignments
Assignment,Release & Subordination of Liens
FAJ
SMI
Assignments
Assignment,Release & Subordination of Liens
FTP
SMI
Assignments
Assignment,Release & Subordination of Liens
JDC
SMI
Assignments
Assignment,Release & Subordination of Liens
JDG
SMI
Assignments
Assignment,Release & Subordination of Liens
JDJ
SMI
Assignments
Assignment,Release & Subordination of Liens
JDS
SMI
Assignments
Assignment,Release & Subordination of Liens
MEJ
SMI
Assignments
Assignment,Release & Subordination of Liens
JDF
SMI
Assignments
Assignment,Release & Subordination of Liens
RCP
SBD
Category
Description
Doc Type
Doc Subtype
CCRs
Property Docs Restrictions
CCR
CCRs
Property Docs Restrictions
CCR
AMD
CCRs
Property Docs Restrictions
CCR
CNT
CCRs
Property Docs Restrictions
CCR
COR
CCRs
Property Docs Restrictions
CCR
MOD
CCRs
Property Docs Restrictions
CCR
PAR
CCRs
Property Docs Restrictions
CCR
REL
CCRs
Property Docs Restrictions
CCR
REV
CCRs
Property Docs Restrictions
CCR
RML
CCRs
Property Docs Restrictions
CCR
RRR
CCRs
Property Docs Restrictions
CCR
RSN
CCRs
Property Docs Restrictions
CCR
SBD
CCRs
Property Docs Restrictions
CCV
CCRs
Property Docs Restrictions
CCV
AMD
CCRs
Property Docs Restrictions
CCV
CNT
CCRs
Property Docs Restrictions
CCV
COR
CCRs
Property Docs Restrictions
CCV
MOD
CCRs
Property Docs Restrictions
CCV
PAR
CCRs
Property Docs Restrictions
CCV
REL
CCRs
Property Docs Restrictions
CCV
REV
CCRs
Property Docs Restrictions
CCV
RML
CCRs
Property Docs Restrictions
CCV
RRR
CCRs
Property Docs Restrictions
CCV
RSN
CCRs
Property Docs Restrictions
CCV
SBD
CCRs
Property Docs Restrictions
COV
CCRs
Property Docs Restrictions
COV
AMD
CCRs
Property Docs Restrictions
COV
CNT
CCRs
Property Docs Restrictions
COV
COR
CCRs
Property Docs Restrictions
COV
MOD
CCRs
Property Docs Restrictions
COV
PAR
CCRs
Property Docs Restrictions
COV
REL
CCRs
Property Docs Restrictions
COV
REV
CCRs
Property Docs Restrictions
COV
RML
CCRs
Property Docs Restrictions
COV
RRR
CCRs
Property Docs Restrictions
COV
RSN
CCRs
Property Docs Restrictions
COV
SBD
CCRs
Property Docs Restrictions
DRS
CCRs
Property Docs Restrictions
CCR
EAS
CCRs
Property Docs Restrictions
CCR
SUP
CCRs
Property Docs Restrictions
COV
EAS
CCRs
Property Docs Restrictions
DRS
AMD
CCRs
Property Docs Restrictions
CCR
DNX
CCRs
Property Docs Restrictions
CCR
ASA
CCRs
Property Docs Restrictions
CCR
ASM
CCRs
Property Docs Restrictions
CCR
ABD
CCRs
Property Docs Restrictions
CCR
ADR
CCRs
Property Docs Restrictions
CCR
ANX
CCRs
Property Docs Restrictions
CCR
ARS
CCRs
Property Docs Restrictions
CCR
ASN
CCRs
Property Docs Restrictions
CCR
CAN
CCRs
Property Docs Restrictions
CCR
NUL
CCRs
Property Docs Restrictions
CCR
PAA
CCRs
Property Docs Restrictions
CCR
PTT
CCRs
Property Docs Restrictions
CCR
RAT
CCRs
Property Docs Restrictions
CCR
RST
CCRs
Property Docs Restrictions
CCR
RVC
CCRs
Property Docs Restrictions
CCR
TER
CCRs
Property Docs Restrictions
CCR
TRT
CCRs
Property Docs Restrictions
CCR
VAC
CCRs
Property Docs Restrictions
CCR
VIO
CCRs
Property Docs Restrictions
CCR
WDW
CCRs
Property Docs Restrictions
COV
ABD
CCRs
Property Docs Restrictions
COV
SUP
CCRs
Property Docs Restrictions
COV
TER
CCRs
Property Docs Restrictions
COV
WAT
CCRs
Property Docs Restrictions
DRS
ABD
CCRs
Property Docs Restrictions
DRS
ADD
CCRs
Property Docs Restrictions
DRS
ADR
CCRs
Property Docs Restrictions
DRS
ANX
CCRs
Property Docs Restrictions
DRS
ASA
CCRs
Property Docs Restrictions
DRS
ASM
CCRs
Property Docs Restrictions
DRS
ASN
CCRs
Property Docs Restrictions
DRS
ATT
CCRs
Property Docs Restrictions
DRS
CAN
CCRs
Property Docs Restrictions
DRS
CLA
CCRs
Property Docs Restrictions
DRS
COM
CCRs
Property Docs Restrictions
DRS
COR
CCRs
Property Docs Restrictions
DRS
DNX
CCRs
Property Docs Restrictions
DRS
EAS
CCRs
Property Docs Restrictions
DRS
EXT
CCRs
Property Docs Restrictions
DRS
INT
CCRs
Property Docs Restrictions
DRS
MOD
CCRs
Property Docs Restrictions
DRS
PAR
CCRs
Property Docs Restrictions
DRS
RAT
CCRs
Property Docs Restrictions
DRS
REL
CCRs
Property Docs Restrictions
DRS
REV
CCRs
Property Docs Restrictions
DRS
RNW
CCRs
Property Docs Restrictions
DRS
ROA
CCRs
Property Docs Restrictions
DRS
RRR
CCRs
Property Docs Restrictions
DRS
RSN
CCRs
Property Docs Restrictions
DRS
RVC
CCRs
Property Docs Restrictions
DRS
SBD
CCRs
Property Docs Restrictions
DRS
SUP
CCRs
Property Docs Restrictions
DRS
TER
CCRs
Property Docs Restrictions
DRS
WDW
CCRs
Property Docs Restrictions
UOT
CCRs
Property Docs Restrictions
UOT
ASN
CCRs
Property Docs Restrictions
UOT
REL
CCRs
Property Docs Restrictions
CCR
DCH
CCRs
Property Docs Restrictions
CCR
DIS
CCRs
Property Docs Restrictions
CCR
RAF
CCRs
Property Docs Restrictions
COV
RST
CCRs
Property Docs Restrictions
COV
PTT
CCRs
Property Docs Restrictions
CCR
DDC
CCRs
Property Docs Restrictions
CCR
EXT
CCRs
Property Docs Restrictions
CCR
RNW
CCRs
Property Docs Restrictions
UOT
AMD
CCRs
Property Docs Restrictions
UOT
COR
CCRs
Property Docs Restrictions
CCV
TER
CCRs
Property Docs Restrictions
CCR
NDV
CCRs
Property Docs Restrictions
CCR
ROA
CCRs
Property Docs Restrictions
CCR
WAT
CCRs
Property Docs Restrictions
COV
ANX
CCRs
Property Docs Restrictions
CCR
RCA
CCRs
Property Docs Restrictions
CCR
COA
CCRs
Property Docs Restrictions
CCR
SAT
CCRs
Property Docs Restrictions
CCV
ASN
CCRs
Property Docs Restrictions
CCV
COA
CCRs
Property Docs Restrictions
CCV
SAT
CCRs
Property Docs Restrictions
COV
ASN
CCRs
Property Docs Restrictions
COV
COA
CCRs
Property Docs Restrictions
COV
SAT
CCRs
Property Docs Restrictions
UOT
COA
CCRs
Property Docs Restrictions
UOT
PAA
CCRs
Property Docs Restrictions
UOT
PAR
CCRs
Property Docs Restrictions
UOT
RRR
CCRs
Property Docs Restrictions
COV
BRC
CCRs
Property Docs Restrictions
CCV
ABD
CCRs
Property Docs Restrictions
CCV
ADR
CCRs
Property Docs Restrictions
CCV
ANX
CCRs
Property Docs Restrictions
CCV
ARS
CCRs
Property Docs Restrictions
CCV
ASA
CCRs
Property Docs Restrictions
CCV
ASM
CCRs
Property Docs Restrictions
CCV
CAN
CCRs
Property Docs Restrictions
CCV
DNX
CCRs
Property Docs Restrictions
CCV
EAS
CCRs
Property Docs Restrictions
CCV
NUL
CCRs
Property Docs Restrictions
CCV
PAA
CCRs
Property Docs Restrictions
CCV
PTT
CCRs
Property Docs Restrictions
CCV
RAT
CCRs
Property Docs Restrictions
CCV
RST
CCRs
Property Docs Restrictions
CCV
RVC
CCRs
Property Docs Restrictions
CCV
SUP
CCRs
Property Docs Restrictions
CCV
TRT
CCRs
Property Docs Restrictions
CCV
VAC
CCRs
Property Docs Restrictions
CCV
VIO
CCRs
Property Docs Restrictions
CCV
WDW
CCRs
Property Docs Restrictions
COV
ADR
CCRs
Property Docs Restrictions
COV
ARS
CCRs
Property Docs Restrictions
COV
ASA
CCRs
Property Docs Restrictions
COV
ASM
CCRs
Property Docs Restrictions
COV
CAN
CCRs
Property Docs Restrictions
COV
DNX
CCRs
Property Docs Restrictions
COV
NUL
CCRs
Property Docs Restrictions
COV
PAA
CCRs
Property Docs Restrictions
COV
RAT
CCRs
Property Docs Restrictions
COV
RVC
CCRs
Property Docs Restrictions
COV
TRT
CCRs
Property Docs Restrictions
COV
VAC
CCRs
Property Docs Restrictions
COV
VIO
CCRs
Property Docs Restrictions
COV
WDW
CCRs
Property Docs Restrictions
COV
EXP
CCRs
Property Docs Restrictions
CCR
REI
CCRs
Property Docs Restrictions
DRS
PTT
CCRs
Property Docs Restrictions
CCR
ACC
CCRs
Property Docs Restrictions
CCR
RLQ
CCRs
Property Docs Restrictions
CCV
ACC
CCRs
Property Docs Restrictions
CCV
EXP
CCRs
Property Docs Restrictions
CCV
EXT
CCRs
Property Docs Restrictions
CCV
MER
CCRs
Property Docs Restrictions
CCV
MNT
CCRs
Property Docs Restrictions
CCV
REI
CCRs
Property Docs Restrictions
CCV
RLQ
CCRs
Property Docs Restrictions
DRS
ARS
CCRs
Property Docs Restrictions
CCR
APT
CCRs
Property Docs Restrictions
CCR
REC
CCRs
Property Docs Restrictions
CCR
RQN
CCRs
Property Docs Restrictions
CCR
STT
CCRs
Property Docs Restrictions
COV
AOA
CCRs
Property Docs Restrictions
CCR
AOA
CCRs
Property Docs Restrictions
CCV
AOA
CCRs
Property Docs Restrictions
DRS
SAT
CCRs
Property Docs Restrictions
CCR
CAR
CCRs
Property Docs Restrictions
CCR
DFL
CCRs
Property Docs Restrictions
COV
REA
CCRs
Property Docs Restrictions
DRS
ACC
CCRs
Property Docs Restrictions
CCR
ADD
CCRs
Property Docs Restrictions
CCR
AMA
CCRs
Property Docs Restrictions
CCR
ASB
CCRs
Property Docs Restrictions
CCR
EXP
CCRs
Property Docs Restrictions
CCR
PAC
CCRs
Property Docs Restrictions
CCR
RAS
CCRs
Property Docs Restrictions
CCR
SFR
CCRs
Property Docs Restrictions
COV
REC
CCRs
Property Docs Restrictions
COV
SFR
CCRs
Property Docs Restrictions
DRS
RLQ
CCRs
Property Docs Restrictions
CCR
RAD
Category
Description
Doc Type
Doc Subtype
Contracts
Contracts
AGD
Contracts
Contracts
AGP
Contracts
Contracts
AGP
AMD
Contracts
Contracts
AGP
ASN
Contracts
Contracts
AGP
REL
Contracts
Contracts
AGP
TER
Contracts
Contracts
AGS
Contracts
Contracts
AGS
AMD
Contracts
Contracts
AGS
ASN
Contracts
Contracts
AGS
CAN
Contracts
Contracts
AGS
COR
Contracts
Contracts
AGS
MOD
Contracts
Contracts
AGS
REL
Contracts
Contracts
AGS
RRR
Contracts
Contracts
AGS
RVC
Contracts
Contracts
AGS
TER
Contracts
Contracts
CON
Contracts
Contracts
CON
ACC
Contracts
Contracts
CON
AMD
Contracts
Contracts
CON
ASM
Contracts
Contracts
CON
ASN
Contracts
Contracts
CON
CAN
Contracts
Contracts
CON
FCL
Contracts
Contracts
CON
MOD
Contracts
Contracts
CON
PAR
Contracts
Contracts
CON
REL
Contracts
Contracts
CON
RRR
Contracts
Contracts
CON
RSN
Contracts
Contracts
CON
RVC
Contracts
Contracts
CON
SAT
Contracts
Contracts
CON
TER
Contracts
Contracts
CON
WDW
Contracts
Contracts
COS
Contracts
Contracts
COS
AMD
Contracts
Contracts
COS
ASM
Contracts
Contracts
COS
ASN
Contracts
Contracts
COS
CAN
Contracts
Contracts
COS
DFL
Contracts
Contracts
COS
EXT
Contracts
Contracts
COS
MOD
Contracts
Contracts
COS
REL
Contracts
Contracts
COS
RRR
Contracts
Contracts
COS
RSN
Contracts
Contracts
COS
TER
Contracts
Contracts
OFF
Contracts
Contracts
OFF
ACC
Contracts
Contracts
OFF
DDC
Contracts
Contracts
OFF
RRR
Contracts
Contracts
OFF
RVC
Contracts
Contracts
OPP
Contracts
Contracts
OPP
AMD
Contracts
Contracts
OPP
ASN
Contracts
Contracts
OPP
CAN
Contracts
Contracts
OPP
PAR
Contracts
Contracts
OPP
REL
Contracts
Contracts
OPP
RLQ
Contracts
Contracts
OPP
RRR
Contracts
Contracts
OPP
TER
Contracts
Contracts
OPT
Contracts
Contracts
OPT
AMD
Contracts
Contracts
OPT
MOD
Contracts
Contracts
OPT
PAR
Contracts
Contracts
OPT
REL
Contracts
Contracts
OPT
RRR
Contracts
Contracts
OPT
TER
Contracts
Contracts
OPT
PTT
Contracts
Contracts
AGR
RFR
Contracts
Contracts
OPT
ASN
Contracts
Contracts
OPT
SBD
Contracts
Contracts
AGD
CAN
Contracts
Contracts
AGP
ADR
Contracts
Contracts
AGS
CLA
Contracts
Contracts
AGS
REI
Contracts
Contracts
AGS
SBD
Contracts
Contracts
CON
ADR
Contracts
Contracts
CON
ARS
Contracts
Contracts
CON
RAS
Contracts
Contracts
CON
SBD
Contracts
Contracts
OPP
RFR
Contracts
Contracts
OPT
ASA
Contracts
Contracts
OPT
ASB
Contracts
Contracts
OPT
CLA
Contracts
Contracts
OPT
EXT
Contracts
Contracts
OPT
PAA
Contracts
Contracts
OPT
RFR
Contracts
Contracts
AGD
ASN
Contracts
Contracts
AGD
AMD
Contracts
Contracts
AGD
MOD
Contracts
Contracts
AGD
RRR
Contracts
Contracts
CON
ASA
Contracts
Contracts
AGD
REL
Contracts
Contracts
OPP
PAA
Contracts
Contracts
OPP
SBD
Contracts
Contracts
OPT
RSN
Contracts
Contracts
AGS
RCA
Contracts
Contracts
OPT
TEA
Contracts
Contracts
AGD
EXT
Contracts
Contracts
AGD
TER
Contracts
Contracts
CON
COA
Contracts
Contracts
CON
TEA
Contracts
Contracts
COS
PAA
Contracts
Contracts
COS
ADR
Contracts
Contracts
COS
RAS
Contracts
Contracts
AGS
RAS
Contracts
Contracts
COS
AME
Category
Description
Doc Type
Doc Subtype
Conveyances
Conveyances
AFD
Conveyances
Conveyances
AGR
CMP
Conveyances
Conveyances
AGR
MER
Conveyances
Conveyances
BIL
Conveyances
Conveyances
BIL
ASN
Conveyances
Conveyances
BIL
RRR
Conveyances
Conveyances
BKR
Conveyances
Conveyances
BKR
AMD
Conveyances
Conveyances
BKY
Conveyances
Conveyances
CDM
Conveyances
Conveyances
CTF
CDM
Conveyances
Conveyances
CTF
MER
Conveyances
Conveyances
CVY
Conveyances
Conveyances
DCD
Conveyances
Conveyances
DCD
AMD
Conveyances
Conveyances
DCD
COR
Conveyances
Conveyances
DCD
REL
Conveyances
Conveyances
DCD
RRR
Conveyances
Conveyances
DCR
Conveyances
Conveyances
DCR
AMD
Conveyances
Conveyances
DCR
COR
Conveyances
Conveyances
DCR
QUI
Conveyances
Conveyances
DDD
Conveyances
Conveyances
DDD
COR
Conveyances
Conveyances
DDD
RRR
Conveyances
Conveyances
DDD
RVC
Conveyances
Conveyances
DDU
Conveyances
Conveyances
DDU
AMD
Conveyances
Conveyances
DDU
COR
Conveyances
Conveyances
DDU
RRR
Conveyances
Conveyances
DEA
Conveyances
Conveyances
DEA
COR
Conveyances
Conveyances
DEA
RRR
Conveyances
Conveyances
DEB
Conveyances
Conveyances
DEB
AMD
Conveyances
Conveyances
DEB
COR
Conveyances
Conveyances
DEB
RRR
Conveyances
Conveyances
DEC
Conveyances
Conveyances
DEC
RRR
Conveyances
Conveyances
DED
Conveyances
Conveyances
DED
AMD
Conveyances
Conveyances
DED
COR
Conveyances
Conveyances
DED
MOD
Conveyances
Conveyances
DED
PAR
Conveyances
Conveyances
DED
REL
Conveyances
Conveyances
DED
RRR
Conveyances
Conveyances
DED
RVC
Conveyances
Conveyances
DEE
Conveyances
Conveyances
DEE
COR
Conveyances
Conveyances
DEE
RRR
Conveyances
Conveyances
DEF
Conveyances
Conveyances
DEF
AMD
Conveyances
Conveyances
DEF
COR
Conveyances
Conveyances
DEF
RRR
Conveyances
Conveyances
DEF
RVC
Conveyances
Conveyances
DEG
Conveyances
Conveyances
DEG
AMD
Conveyances
Conveyances
DEG
COR
Conveyances
Conveyances
DEG
EAS
Conveyances
Conveyances
DEG
MOD
Conveyances
Conveyances
DEG
REL
Conveyances
Conveyances
DEG
RRR
Conveyances
Conveyances
DEG
RVC
Conveyances
Conveyances
DEJ
Conveyances
Conveyances
DEJ
COR
Conveyances
Conveyances
DEJ
RRR
Conveyances
Conveyances
DEM
Conveyances
Conveyances
DEM
COR
Conveyances
Conveyances
DEQ
Conveyances
Conveyances
DEQ
AMD
Conveyances
Conveyances
DEQ
COR
Conveyances
Conveyances
DEQ
EAS
Conveyances
Conveyances
DEQ
PAR
Conveyances
Conveyances
DEQ
REL
Conveyances
Conveyances
DEQ
RRR
Conveyances
Conveyances
DEQ
RVC
Conveyances
Conveyances
DER
Conveyances
Conveyances
DES
Conveyances
Conveyances
DES
AMD
Conveyances
Conveyances
DES
COR
Conveyances
Conveyances
DES
RRR
Conveyances
Conveyances
DET
Conveyances
Conveyances
DET
AMD
Conveyances
Conveyances
DET
COR
Conveyances
Conveyances
DET
REL
Conveyances
Conveyances
DET
RRR
Conveyances
Conveyances
DET
RSN
Conveyances
Conveyances
DEU
Conveyances
Conveyances
DEU
AMD
Conveyances
Conveyances
DEU
COR
Conveyances
Conveyances
DEU
RRR
Conveyances
Conveyances
DEW
Conveyances
Conveyances
DEW
AMD
Conveyances
Conveyances
DEW
COR
Conveyances
Conveyances
DEW
MOD
Conveyances
Conveyances
DEW
REL
Conveyances
Conveyances
DEW
RRR
Conveyances
Conveyances
DEX
Conveyances
Conveyances
DEX
COR
Conveyances
Conveyances
DEX
RRR
Conveyances
Conveyances
DEY
Conveyances
Conveyances
DEY
AMD
Conveyances
Conveyances
DEY
COR
Conveyances
Conveyances
DEY
RRR
Conveyances
Conveyances
DEY
RVC
Conveyances
Conveyances
DID
Conveyances
Conveyances
DID
COR
Conveyances
Conveyances
DID
RRR
Conveyances
Conveyances
DIT
Conveyances
Conveyances
DIT
AMD
Conveyances
Conveyances
DIT
COR
Conveyances
Conveyances
DIT
RRR
Conveyances
Conveyances
DQT
Conveyances
Conveyances
DQT
AMD
Conveyances
Conveyances
DQT
RRR
Conveyances
Conveyances
GRT
Conveyances
Conveyances
GRT
ASN
Conveyances
Conveyances
GRT
REL
Conveyances
Conveyances
GRT
TER
Conveyances
Conveyances
JTY
TER
Conveyances
Conveyances
MNG
Conveyances
Conveyances
MNG
AMD
Conveyances
Conveyances
MNG
RRR
Conveyances
Conveyances
NOT
CDM
Conveyances
Conveyances
NOT
FOR
Conveyances
Conveyances
NOT
MER
Conveyances
Conveyances
NOT
SZE
Conveyances
Conveyances
ORD
CDM
Conveyances
Conveyances
ORD
FCL
Conveyances
Conveyances
ORD
QUI
Conveyances
Conveyances
ORS
Conveyances
Conveyances
ORS
AMD
Conveyances
Conveyances
PAT
Conveyances
Conveyances
PAT
RRR
Conveyances
Conveyances
ROW
Conveyances
Conveyances
ROW
ABD
Conveyances
Conveyances
ROW
AMD
Conveyances
Conveyances
ROW
MOD
Conveyances
Conveyances
ROW
RLQ
Conveyances
Conveyances
ROW
RRR
Conveyances
Conveyances
ROW
TER
Conveyances
Conveyances
ROW
VAC
Conveyances
Conveyances
SWD
Conveyances
Conveyances
SWD
AMD
Conveyances
Conveyances
SWD
COR
Conveyances
Conveyances
SWD
MOD
Conveyances
Conveyances
SWD
RRR
Conveyances
Conveyances
SWD
RVC
Conveyances
Conveyances
DOG
Conveyances
Conveyances
OLQ
Conveyances
Conveyances
DDU
RSN
Conveyances
Conveyances
DEG
RSN
Conveyances
Conveyances
AFD
COR
Conveyances
Conveyances
JDG
QUI
Conveyances
Conveyances
OLQ
PAR
Conveyances
Conveyances
DCR
NAM
Conveyances
Conveyances
ORD
NAM
Conveyances
Conveyances
DEJ
SEV
Conveyances
Conveyances
OLQ
SRN
Conveyances
Conveyances
DEQ
RSN
Conveyances
Conveyances
ACC
CMP
Conveyances
Conveyances
AFF
CMP
Conveyances
Conveyances
AFF
FOR
Conveyances
Conveyances
AFF
HEI
Conveyances
Conveyances
AFF
MER
Conveyances
Conveyances
AFF
SUR
Conveyances
Conveyances
BIL
REL
Conveyances
Conveyances
CTF
DTH
Conveyances
Conveyances
CTF
NAM
Conveyances
Conveyances
DDU
CAN
Conveyances
Conveyances
DED
ASN
Conveyances
Conveyances
DED
DDC
Conveyances
Conveyances
DED
FCL
Conveyances
Conveyances
DED
GDN
Conveyances
Conveyances
DED
RST
Conveyances
Conveyances
DED
TER
Conveyances
Conveyances
DEG
ASN
Conveyances
Conveyances
DEG
TER
Conveyances
Conveyances
DEQ
ADR
Conveyances
Conveyances
DEQ
TER
Conveyances
Conveyances
DEW
LTD
Conveyances
Conveyances
JDG
CDM
Conveyances
Conveyances
JDG
NAM
Conveyances
Conveyances
JTY
SEV
Conveyances
Conveyances
NOT
CAF
Conveyances
Conveyances
NOT
DTH
Conveyances
Conveyances
NOT
NAM
Conveyances
Conveyances
ORD
FOR
Conveyances
Conveyances
PAT
ASN
Conveyances
Conveyances
ROW
ASN
Conveyances
Conveyances
ROW
DDC
Conveyances
Conveyances
ROW
EAS
Conveyances
Conveyances
ROW
PAR
Conveyances
Conveyances
SWD
ASN
Conveyances
Conveyances
SWD
REL
Conveyances
Conveyances
SWD
SBD
Conveyances
Conveyances
AFD
AMD
Conveyances
Conveyances
AFD
RRR
Conveyances
Conveyances
BIL
COR
Conveyances
Conveyances
JTY
ACC
Conveyances
Conveyances
DED
SPC
Conveyances
Conveyances
MNG
RLQ
Conveyances
Conveyances
DCD
FNL
Conveyances
Conveyances
DCR
DFL
Conveyances
Conveyances
DCR
DSC
Conveyances
Conveyances
DED
EXP
Conveyances
Conveyances
DEM
ASN
Conveyances
Conveyances
DOG
COR
Conveyances
Conveyances
MNG
COR
Conveyances
Conveyances
CPT
QUI
Conveyances
Conveyances
MHT
Conveyances
Conveyances
MHT
ELM
Conveyances
Conveyances
MHT
RML
Conveyances
Conveyances
MHT
RRR
Conveyances
Conveyances
DCL
ARS
Conveyances
Conveyances
SWD
RFR
Conveyances
Conveyances
CVY
ARS
Conveyances
Conveyances
DEB
CAN
Conveyances
Conveyances
DED
APS
Conveyances
Conveyances
DED
FCR
Conveyances
Conveyances
DED
INT
Conveyances
Conveyances
DED
RSN
Conveyances
Conveyances
DEG
QUI
Conveyances
Conveyances
DES
EXP
Conveyances
Conveyances
DES
RSN
Conveyances
Conveyances
DET
SBD
Conveyances
Conveyances
DEW
EAS
Conveyances
Conveyances
DEW
RSN
Conveyances
Conveyances
DEX
RSN
Conveyances
Conveyances
DEY
RSN
Conveyances
Conveyances
DID
EAS
Conveyances
Conveyances
GRT
SBD
Conveyances
Conveyances
ROW
CAN
Conveyances
Conveyances
ROW
SUP
Conveyances
Conveyances
SWD
LTD
Conveyances
Conveyances
DED
NAC
Conveyances
Conveyances
DEQ
NAC
Conveyances
Conveyances
DEQ
PRC
Conveyances
Conveyances
BIL
ASA
Conveyances
Conveyances
MHT
COR
Conveyances
Conveyances
JDF
CDM
Conveyances
Conveyances
JDF
QUI
Conveyances
Conveyances
CIV
CDM
Conveyances
Conveyances
CIV
NAM
Conveyances
Conveyances
CIV
QUI
Conveyances
Conveyances
CIV
FOR
Conveyances
Conveyances
MHT
ASN
Conveyances
Conveyances
TOD
Conveyances
Conveyances
TOD
ACC
Conveyances
Conveyances
TOD
AMD
Conveyances
Conveyances
TOD
COR
Conveyances
Conveyances
TOD
RRR
Conveyances
Conveyances
TOD
RVC
Conveyances
Conveyances
SWD
RSN
Conveyances
Conveyances
ORD
HEI
Conveyances
Conveyances
DEW
WDW
Conveyances
Conveyances
GRT
RVC
Conveyances
Conveyances
DCO
Category
Description
Doc Type
Doc Subtype
CourtRelated
Court Related
AFF
ATY
CourtRelated
Court Related
AGR
DFL
CourtRelated
Court Related
ANS
CourtRelated
Court Related
BKR
CourtRelated
Court Related
BKR
AMD
CourtRelated
Court Related
BKY
CourtRelated
Court Related
BND
CourtRelated
Court Related
BND
REL
CourtRelated
Court Related
BND
RRR
CourtRelated
Court Related
BVL
CourtRelated
Court Related
CAE
CourtRelated
Court Related
CDM
CourtRelated
Court Related
CJG
CourtRelated
Court Related
CON
FCL
CourtRelated
Court Related
COS
DFL
CourtRelated
Court Related
CPR
CourtRelated
Court Related
CPR
AMD
CourtRelated
Court Related
CPR
CAN
CourtRelated
Court Related
CPR
REL
CourtRelated
Court Related
CPT
CourtRelated
Court Related
CRJ
CourtRelated
Court Related
CRJ
AMD
CourtRelated
Court Related
CRJ
DCH
CourtRelated
Court Related
CRJ
EXT
CourtRelated
Court Related
CRJ
REL
CourtRelated
Court Related
CRJ
RRR
CourtRelated
Court Related
CRJ
SAT
CourtRelated
Court Related
CRJ
TER
CourtRelated
Court Related
CTF
CDM
CourtRelated
Court Related
CTF
DCH
CourtRelated
Court Related
CTF
DIS
CourtRelated
Court Related
CTF
PAY
CourtRelated
Court Related
CTF
RDM
CourtRelated
Court Related
CTF
REI
CourtRelated
Court Related
CTR
CourtRelated
Court Related
CTS
CourtRelated
Court Related
CTS
AMD
CourtRelated
Court Related
CTS
ASN
CourtRelated
Court Related
CTS
CAN
CourtRelated
Court Related
CTS
COR
CourtRelated
Court Related
CTS
RDM
CourtRelated
Court Related
CTS
REL
CourtRelated
Court Related
CTS
RRR
CourtRelated
Court Related
CTS
RSN
CourtRelated
Court Related
DCD
CourtRelated
Court Related
DCD
AMD
CourtRelated
Court Related
DCD
COR
CourtRelated
Court Related
DCD
REL
CourtRelated
Court Related
DCD
RRR
CourtRelated
Court Related
DCR
CourtRelated
Court Related
DCR
AMD
CourtRelated
Court Related
DCR
COR
CourtRelated
Court Related
DCR
QUI
CourtRelated
Court Related
DEA
CourtRelated
Court Related
DEA
COR
CourtRelated
Court Related
DEA
RRR
CourtRelated
Court Related
DEE
CourtRelated
Court Related
DEE
COR
CourtRelated
Court Related
DEE
RRR
CourtRelated
Court Related
DES
CourtRelated
Court Related
DES
AMD
CourtRelated
Court Related
DES
COR
CourtRelated
Court Related
DES
RRR
CourtRelated
Court Related
DEU
CourtRelated
Court Related
DEU
AMD
CourtRelated
Court Related
DEU
COR
CourtRelated
Court Related
DEU
RRR
CourtRelated
Court Related
DEX
CourtRelated
Court Related
DEX
COR
CourtRelated
Court Related
DEX
RRR
CourtRelated
Court Related
DIV
CourtRelated
Court Related
DIV
AMD
CourtRelated
Court Related
DOM
CourtRelated
Court Related
DOM
AMD
CourtRelated
Court Related
DOM
RRR
CourtRelated
Court Related
DQT
CourtRelated
Court Related
DQT
AMD
CourtRelated
Court Related
DQT
RRR
CourtRelated
Court Related
ETL
CourtRelated
Court Related
ETL
AMD
CourtRelated
Court Related
ETL
PAR
CourtRelated
Court Related
ETL
REL
CourtRelated
Court Related
ETL
SAT
CourtRelated
Court Related
ETT
CourtRelated
Court Related
FAJ
CourtRelated
Court Related
FAJ
AMD
CourtRelated
Court Related
FAJ
PAR
CourtRelated
Court Related
FAJ
REL
CourtRelated
Court Related
FAJ
SBD
CourtRelated
Court Related
FAJ
TER
CourtRelated
Court Related
FTP
CourtRelated
Court Related
ICM
AMD
CourtRelated
Court Related
INJ
CourtRelated
Court Related
INJ
WDW
CourtRelated
Court Related
IVY
CourtRelated
Court Related
JDC
CourtRelated
Court Related
JDC
PAR
CourtRelated
Court Related
JDC
REL
CourtRelated
Court Related
JDG
CourtRelated
Court Related
JDG
AMD
CourtRelated
Court Related
JDG
ASN
CourtRelated
Court Related
JDG
COR
CourtRelated
Court Related
JDG
DFL
CourtRelated
Court Related
JDG
DSM
CourtRelated
Court Related
JDG
EXT
CourtRelated
Court Related
JDG
FCL
CourtRelated
Court Related
JDG
MOD
CourtRelated
Court Related
JDG
PAR
CourtRelated
Court Related
JDG
REI
CourtRelated
Court Related
JDG
REL
CourtRelated
Court Related
JDG
RRR
CourtRelated
Court Related
JDG
SAT
CourtRelated
Court Related
JDG
SBD
CourtRelated
Court Related
JDG
TER
CourtRelated
Court Related
JDG
VAC
CourtRelated
Court Related
JDG
WDW
CourtRelated
Court Related
JDJ
CourtRelated
Court Related
JDJ
AMD
CourtRelated
Court Related
JDJ
PAR
CourtRelated
Court Related
JDJ
REL
CourtRelated
Court Related
JDJ
RRR
CourtRelated
Court Related
JDJ
SAT
CourtRelated
Court Related
JDS
CourtRelated
Court Related
LIS
CourtRelated
Court Related
LIS
AMD
CourtRelated
Court Related
LIS
COR
CourtRelated
Court Related
LIS
DSM
CourtRelated
Court Related
LIS
EXP
CourtRelated
Court Related
LIS
PAR
CourtRelated
Court Related
LIS
REL
CourtRelated
Court Related
LIS
RML
CourtRelated
Court Related
LIS
RRR
CourtRelated
Court Related
LIS
RVC
CourtRelated
Court Related
LIS
SAT
CourtRelated
Court Related
LIS
SUP
CourtRelated
Court Related
LIS
TER
CourtRelated
Court Related
LIS
WDW
CourtRelated
Court Related
LTR
CourtRelated
Court Related
LTR
ADM
CourtRelated
Court Related
LTR
AMD
CourtRelated
Court Related
LTR
RRR
CourtRelated
Court Related
LTR
SPC
CourtRelated
Court Related
LTR
TST
CourtRelated
Court Related
LVY
CourtRelated
Court Related
LVY
AMD
CourtRelated
Court Related
LVY
REL
CourtRelated
Court Related
MEJ
CourtRelated
Court Related
MEJ
AMD
CourtRelated
Court Related
MEJ
ASN
CourtRelated
Court Related
MEJ
COR
CourtRelated
Court Related
MEJ
DFL
CourtRelated
Court Related
MEJ
PAR
CourtRelated
Court Related
MEJ
REL
CourtRelated
Court Related
MEJ
REV
CourtRelated
Court Related
MEJ
RRR
CourtRelated
Court Related
MEJ
RVC
CourtRelated
Court Related
MEJ
SAT
CourtRelated
Court Related
MEJ
SBD
CourtRelated
Court Related
MLN
CourtRelated
Court Related
MOT
CourtRelated
Court Related
MSA
CourtRelated
Court Related
MTG
FCL
CourtRelated
Court Related
NOT
APT
CourtRelated
Court Related
NOT
ATT
CourtRelated
Court Related
NOT
CDM
CourtRelated
Court Related
NOT
CRD
CourtRelated
Court Related
NOT
CSL
CourtRelated
Court Related
NOT
DCH
CourtRelated
Court Related
NOT
DFL
CourtRelated
Court Related
NOT
DLQ
CourtRelated
Court Related
NOT
DSM
CourtRelated
Court Related
NOT
FCL
CourtRelated
Court Related
NOT
FOR
CourtRelated
Court Related
NOT
PAY
CourtRelated
Court Related
NOT
STP
CourtRelated
Court Related
NOT
SZE
CourtRelated
Court Related
OAT
CourtRelated
Court Related
ORD
CourtRelated
Court Related
ORD
ABD
CourtRelated
Court Related
ORD
AMD
CourtRelated
Court Related
ORD
APT
CourtRelated
Court Related
ORD
CDM
CourtRelated
Court Related
ORD
COR
CourtRelated
Court Related
ORD
DCH
CourtRelated
Court Related
ORD
DML
CourtRelated
Court Related
ORD
DSM
CourtRelated
Court Related
ORD
FCL
CourtRelated
Court Related
ORD
GDN
CourtRelated
Court Related
ORD
NCP
CourtRelated
Court Related
ORD
POS
CourtRelated
Court Related
ORD
QUI
CourtRelated
Court Related
ORD
RRR
CourtRelated
Court Related
ORD
SAT
CourtRelated
Court Related
ORD
STP
CourtRelated
Court Related
ORD
TER
CourtRelated
Court Related
ORD
VAC
CourtRelated
Court Related
ORS
CourtRelated
Court Related
ORS
AMD
CourtRelated
Court Related
ORS
TER
CourtRelated
Court Related
PET
CourtRelated
Court Related
PET
RSN
CourtRelated
Court Related
PET
VAC
CourtRelated
Court Related
PLN
CourtRelated
Court Related
PLN
REV
CourtRelated
Court Related
PRO
CourtRelated
Court Related
PRT
CourtRelated
Court Related
RRD
REL
CourtRelated
Court Related
TSC
CourtRelated
Court Related
TSC
RRR
CourtRelated
Court Related
WAR
CourtRelated
Court Related
WAR
PAR
CourtRelated
Court Related
WAR
REL
CourtRelated
Court Related
WIL
CourtRelated
Court Related
WLL
CourtRelated
Court Related
WRE
CourtRelated
Court Related
WRE
COR
CourtRelated
Court Related
WRE
REL
CourtRelated
Court Related
WRI
CourtRelated
Court Related
WRI
AMD
CourtRelated
Court Related
WRI
PAR
CourtRelated
Court Related
WRI
REL
CourtRelated
Court Related
WRI
RRR
CourtRelated
Court Related
WRI
WDW
CourtRelated
Court Related
JDG
RNW
CourtRelated
Court Related
ORD
RVC
CourtRelated
Court Related
JDG
STP
CourtRelated
Court Related
JDG
EXP
CourtRelated
Court Related
LTR
CVS
CourtRelated
Court Related
JDC
SBD
CourtRelated
Court Related
JDG
QUI
CourtRelated
Court Related
DCR
NAM
CourtRelated
Court Related
ORD
NAM
CourtRelated
Court Related
AFF
FOR
CourtRelated
Court Related
AFF
HEI
CourtRelated
Court Related
AFF
NAM
CourtRelated
Court Related
AFF
NAT
CourtRelated
Court Related
AFF
SAT
CourtRelated
Court Related
AGR
APS
CourtRelated
Court Related
AGR
FOR
CourtRelated
Court Related
AGR
SEP
CourtRelated
Court Related
ANS
REL
CourtRelated
Court Related
CRJ
DSM
CourtRelated
Court Related
CRJ
VAC
CourtRelated
Court Related
CTF
APS
CourtRelated
Court Related
DED
FCL
CourtRelated
Court Related
DED
GDN
CourtRelated
Court Related
DIV
DSM
CourtRelated
Court Related
EAS
CDM
CourtRelated
Court Related
ETT
ASN
CourtRelated
Court Related
ETT
REL
CourtRelated
Court Related
JDC
AMD
CourtRelated
Court Related
JDC
RNW
CourtRelated
Court Related
JDG
ANM
CourtRelated
Court Related
JDG
CAN
CourtRelated
Court Related
JDG
CDM
CourtRelated
Court Related
JDG
DCH
CourtRelated
Court Related
JDG
FCR
CourtRelated
Court Related
JDG
FNL
CourtRelated
Court Related
JDG
FOR
CourtRelated
Court Related
JDG
NAM
CourtRelated
Court Related
JDG
PAA
CourtRelated
Court Related
JDG
POS
CourtRelated
Court Related
JDG
RAS
CourtRelated
Court Related
JDG
REA
CourtRelated
Court Related
JDG
REF
CourtRelated
Court Related
JDG
RSN
CourtRelated
Court Related
JDG
SET
CourtRelated
Court Related
JDG
SUP
CourtRelated
Court Related
LIS
CAN
CourtRelated
Court Related
LIS
DCH
CourtRelated
Court Related
LIS
QUI
CourtRelated
Court Related
LIS
RAD
CourtRelated
Court Related
LNN
ATY
CourtRelated
Court Related
LTR
APT
CourtRelated
Court Related
LTR
GDN
CourtRelated
Court Related
LTR
INT
CourtRelated
Court Related
LVY
VAC
CourtRelated
Court Related
NOT
CAF
CourtRelated
Court Related
ORD
APS
CourtRelated
Court Related
ORD
CAN
CourtRelated
Court Related
ORD
CVS
CourtRelated
Court Related
ORD
FOR
CourtRelated
Court Related
ORD
PAR
CourtRelated
Court Related
ORD
REL
CourtRelated
Court Related
ORD
RML
CourtRelated
Court Related
PET
ANX
CourtRelated
Court Related
PET
NAM
CourtRelated
Court Related
PLN
AMD
CourtRelated
Court Related
PRO
AMD
CourtRelated
Court Related
PRO
RRR
CourtRelated
Court Related
WIL
RVC
CourtRelated
Court Related
WLL
AMD
CourtRelated
Court Related
WRI
ATT
CourtRelated
Court Related
JDC
SUB
CourtRelated
Court Related
ORD
SUP
CourtRelated
Court Related
BND
AMD
CourtRelated
Court Related
ORD
ASN
CourtRelated
Court Related
ORD
RSN
CourtRelated
Court Related
RRD
ASN
CourtRelated
Court Related
CTS
FCL
CourtRelated
Court Related
TSC
RDM
CourtRelated
Court Related
JDC
DFL
CourtRelated
Court Related
CTF
FCL
CourtRelated
Court Related
JDC
SAT
CourtRelated
Court Related
JDG
AMR
CourtRelated
Court Related
JDG
DLQ
CourtRelated
Court Related
ORD
TRF
CourtRelated
Court Related
PET
AMD
CourtRelated
Court Related
WLL
RVC
CourtRelated
Court Related
DCD
FNL
CourtRelated
Court Related
DCR
DFL
CourtRelated
Court Related
DCR
DSC
CourtRelated
Court Related
JDC
COR
CourtRelated
Court Related
JDC
STP
CourtRelated
Court Related
JDG
DIS
CourtRelated
Court Related
JDG
PVA
CourtRelated
Court Related
JDG
SUB
CourtRelated
Court Related
CPT
REL
CourtRelated
Court Related
MOT
DSM
CourtRelated
Court Related
ORD
EXP
CourtRelated
Court Related
CIV
CourtRelated
Court Related
DMS
CourtRelated
Court Related
ANS
AMD
CourtRelated
Court Related
ANS
COR
CourtRelated
Court Related
BVL
REL
CourtRelated
Court Related
CIV
REL
CourtRelated
Court Related
DOM
COR
CourtRelated
Court Related
ETL
DCH
CourtRelated
Court Related
MOT
SAT
CourtRelated
Court Related
WAR
SAT
CourtRelated
Court Related
CPT
QUI
CourtRelated
Court Related
ORD
DFL
CourtRelated
Court Related
PET
GDN
CourtRelated
Court Related
WRE
ASN
CourtRelated
Court Related
CRI
CourtRelated
Court Related
CRJ
AMR
CourtRelated
Court Related
JDC
CAN
CourtRelated
Court Related
CPT
POS
CourtRelated
Court Related
DED
APS
CourtRelated
Court Related
DED
FCR
CourtRelated
Court Related
DEG
QUI
CourtRelated
Court Related
DES
EXP
CourtRelated
Court Related
DES
RSN
CourtRelated
Court Related
DEX
RSN
CourtRelated
Court Related
ETL
TRF
CourtRelated
Court Related
LIS
AME
CourtRelated
Court Related
LIS
ERR
CourtRelated
Court Related
WAR
RNW
CourtRelated
Court Related
CAE
REL
CourtRelated
Court Related
BRF
CourtRelated
Court Related
DOM
MOD
CourtRelated
Court Related
ORD
EXT
CourtRelated
Court Related
CEL
CourtRelated
Court Related
CEL
CAN
CourtRelated
Court Related
CEL
REL
CourtRelated
Court Related
CEL
SAT
CourtRelated
Court Related
CEL
TER
CourtRelated
Court Related
DOM
PAR
CourtRelated
Court Related
LTR
EXT
CourtRelated
Court Related
DMD
CourtRelated
Court Related
FED
CourtRelated
Court Related
ETT
DPP
CourtRelated
Court Related
ITL
CourtRelated
Court Related
ITL
REL
CourtRelated
Court Related
JDF
CourtRelated
Court Related
JDF
CAN
CourtRelated
Court Related
JDF
CDM
CourtRelated
Court Related
JDF
DFL
CourtRelated
Court Related
JDF
FCL
CourtRelated
Court Related
JDF
QUI
CourtRelated
Court Related
JDF
REL
CourtRelated
Court Related
JDF
STP
CourtRelated
Court Related
JDF
WDW
CourtRelated
Court Related
PRF
CourtRelated
Court Related
PRF
ADM
CourtRelated
Court Related
PRF
APT
CourtRelated
Court Related
PRF
CVS
CourtRelated
Court Related
PRF
DPP
CourtRelated
Court Related
PRF
GDN
CourtRelated
Court Related
PRF
SPC
CourtRelated
Court Related
PRF
TST
CourtRelated
Court Related
CIV
ABD
CourtRelated
Court Related
CIV
ATY
CourtRelated
Court Related
CIV
CDM
CourtRelated
Court Related
CIV
DML
CourtRelated
Court Related
CIV
FCL
CourtRelated
Court Related
CIV
NAM
CourtRelated
Court Related
CIV
QUI
CourtRelated
Court Related
CIV
STP
CourtRelated
Court Related
CIV
TER
CourtRelated
Court Related
CIV
TXA
CourtRelated
Court Related
CIV
VAC
CourtRelated
Court Related
CRI
AMD
CourtRelated
Court Related
CRI
DCH
CourtRelated
Court Related
CRI
SAT
CourtRelated
Court Related
DMS
ANM
CourtRelated
Court Related
DMS
DIS
CourtRelated
Court Related
DMS
NUL
CourtRelated
Court Related
DMS
SEP
CourtRelated
Court Related
CIV
POS
CourtRelated
Court Related
CIV
FOR
CourtRelated
Court Related
CTS
CAA
CourtRelated
Court Related
CVU
DIS
CourtRelated
Court Related
DPP
DIS
CourtRelated
Court Related
CJG
SMI
CourtRelated
Court Related
CRJ
SMI
CourtRelated
Court Related
FAJ
SMI
CourtRelated
Court Related
FTP
SMI
CourtRelated
Court Related
JDC
SMI
CourtRelated
Court Related
JDG
SMI
CourtRelated
Court Related
JDJ
SMI
CourtRelated
Court Related
JDS
SMI
CourtRelated
Court Related
MEJ
SMI
CourtRelated
Court Related
JDF
SMI
CourtRelated
Court Related
ADM
CourtRelated
Court Related
ADP
CourtRelated
Court Related
APP
CourtRelated
Court Related
CAV
CourtRelated
Court Related
FTL
CourtRelated
Court Related
HLF
CourtRelated
Court Related
MAG
CourtRelated
Court Related
MIS
CourtRelated
Court Related
NLF
CourtRelated
Court Related
PTF
CourtRelated
Court Related
LDC
CourtRelated
Court Related
CTS
COA
CourtRelated
Court Related
JDF
DSM
CourtRelated
Court Related
JDF
PAR
CourtRelated
Court Related
JDF
REV
CourtRelated
Court Related
JDF
RNW
CourtRelated
Court Related
JDF
SAT
CourtRelated
Court Related
JDF
SUP
CourtRelated
Court Related
NOT
ANM
CourtRelated
Court Related
PRF
COR
CourtRelated
Court Related
PRO
RSG
CourtRelated
Court Related
WAR
SBD
CourtRelated
Court Related
ORD
HEI
CourtRelated
Court Related
JDF
MOD
CourtRelated
Court Related
LCF
CourtRelated
Court Related
CLF
CourtRelated
Court Related
WAF
CourtRelated
Court Related
ANS
PAR
Category
Description
Doc Type
Doc Subtype
Deeds
Conveyance Documents
AFD
Deeds
Conveyance Documents
COS
Deeds
Conveyance Documents
COS
ABD
Deeds
Conveyance Documents
COS
ACC
Deeds
Conveyance Documents
COS
AMD
Deeds
Conveyance Documents
COS
ASM
Deeds
Conveyance Documents
COS
ASN
Deeds
Conveyance Documents
COS
CAN
Deeds
Conveyance Documents
COS
CNT
Deeds
Conveyance Documents
COS
COR
Deeds
Conveyance Documents
COS
DCH
Deeds
Conveyance Documents
COS
DFL
Deeds
Conveyance Documents
COS
EXT
Deeds
Conveyance Documents
COS
MOD
Deeds
Conveyance Documents
COS
PAR
Deeds
Conveyance Documents
COS
REL
Deeds
Conveyance Documents
COS
RRR
Deeds
Conveyance Documents
COS
RSN
Deeds
Conveyance Documents
COS
RVC
Deeds
Conveyance Documents
COS
SAT
Deeds
Conveyance Documents
COS
TER
Deeds
Conveyance Documents
COS
WDW
Deeds
Conveyance Documents
CTS
Deeds
Conveyance Documents
CTS
ACC
Deeds
Conveyance Documents
CTS
AMD
Deeds
Conveyance Documents
CTS
ASN
Deeds
Conveyance Documents
CTS
CAN
Deeds
Conveyance Documents
CTS
CNT
Deeds
Conveyance Documents
CTS
COR
Deeds
Conveyance Documents
CTS
DCH
Deeds
Conveyance Documents
CTS
DIS
Deeds
Conveyance Documents
CTS
DSM
Deeds
Conveyance Documents
CTS
MER
Deeds
Conveyance Documents
CTS
PAR
Deeds
Conveyance Documents
CTS
RDM
Deeds
Conveyance Documents
CTS
REI
Deeds
Conveyance Documents
CTS
REL
Deeds
Conveyance Documents
CTS
REV
Deeds
Conveyance Documents
CTS
RML
Deeds
Conveyance Documents
CTS
RRR
Deeds
Conveyance Documents
CTS
RSG
Deeds
Conveyance Documents
CTS
RSN
Deeds
Conveyance Documents
CTS
RUF
Deeds
Conveyance Documents
CTS
RVC
Deeds
Conveyance Documents
CTS
SAT
Deeds
Conveyance Documents
CTS
TER
Deeds
Conveyance Documents
CTS
VAC
Deeds
Conveyance Documents
CTS
VIO
Deeds
Conveyance Documents
CTS
WDW
Deeds
Conveyance Documents
CTT
Deeds
Conveyance Documents
CTT
AMD
Deeds
Conveyance Documents
CTT
ASN
Deeds
Conveyance Documents
CTT
BUT
Deeds
Conveyance Documents
CTT
CAN
Deeds
Conveyance Documents
CTT
COR
Deeds
Conveyance Documents
CTT
MOD
Deeds
Conveyance Documents
CTT
PAR
Deeds
Conveyance Documents
CTT
REL
Deeds
Conveyance Documents
CTT
REV
Deeds
Conveyance Documents
CTT
RRR
Deeds
Conveyance Documents
CTT
RVC
Deeds
Conveyance Documents
CTT
SAT
Deeds
Conveyance Documents
CTT
TER
Deeds
Conveyance Documents
CTT
WDW
Deeds
Conveyance Documents
CVY
Deeds
Conveyance Documents
DDD
Deeds
Conveyance Documents
DDD
AMD
Deeds
Conveyance Documents
DDD
COR
Deeds
Conveyance Documents
DDD
MOD
Deeds
Conveyance Documents
DDD
PAR
Deeds
Conveyance Documents
DDD
REL
Deeds
Conveyance Documents
DDD
REV
Deeds
Conveyance Documents
DDD
RRR
Deeds
Conveyance Documents
DDD
RVC
Deeds
Conveyance Documents
DDU
Deeds
Conveyance Documents
DDU
AMD
Deeds
Conveyance Documents
DDU
COR
Deeds
Conveyance Documents
DDU
MOD
Deeds
Conveyance Documents
DDU
PAR
Deeds
Conveyance Documents
DDU
REL
Deeds
Conveyance Documents
DDU
REV
Deeds
Conveyance Documents
DDU
RRR
Deeds
Conveyance Documents
DDU
RVC
Deeds
Conveyance Documents
DEA
Deeds
Conveyance Documents
DEA
AMD
Deeds
Conveyance Documents
DEA
COR
Deeds
Conveyance Documents
DEA
MOD
Deeds
Conveyance Documents
DEA
PAR
Deeds
Conveyance Documents
DEA
REL
Deeds
Conveyance Documents
DEA
REV
Deeds
Conveyance Documents
DEA
RRR
Deeds
Conveyance Documents
DEA
RVC
Deeds
Conveyance Documents
DEB
Deeds
Conveyance Documents
DEB
AMD
Deeds
Conveyance Documents
DEB
COR
Deeds
Conveyance Documents
DEB
MOD
Deeds
Conveyance Documents
DEB
PAR
Deeds
Conveyance Documents
DEB
REL
Deeds
Conveyance Documents
DEB
REV
Deeds
Conveyance Documents
DEB
RRR
Deeds
Conveyance Documents
DEB
RVC
Deeds
Conveyance Documents
DEC
Deeds
Conveyance Documents
DEC
AMD
Deeds
Conveyance Documents
DEC
COR
Deeds
Conveyance Documents
DEC
MOD
Deeds
Conveyance Documents
DEC
PAR
Deeds
Conveyance Documents
DEC
REL
Deeds
Conveyance Documents
DEC
REV
Deeds
Conveyance Documents
DEC
RRR
Deeds
Conveyance Documents
DEC
RVC
Deeds
Conveyance Documents
DED
Deeds
Conveyance Documents
DED
AMD
Deeds
Conveyance Documents
DED
COR
Deeds
Conveyance Documents
DED
EAS
Deeds
Conveyance Documents
DED
MOD
Deeds
Conveyance Documents
DED
PAR
Deeds
Conveyance Documents
DED
REL
Deeds
Conveyance Documents
DED
REV
Deeds
Conveyance Documents
DED
RRR
Deeds
Conveyance Documents
DED
RVC
Deeds
Conveyance Documents
DEE
Deeds
Conveyance Documents
DEE
AMD
Deeds
Conveyance Documents
DEE
COR
Deeds
Conveyance Documents
DEE
MOD
Deeds
Conveyance Documents
DEE
PAR
Deeds
Conveyance Documents
DEE
REL
Deeds
Conveyance Documents
DEE
REV
Deeds
Conveyance Documents
DEE
RRR
Deeds
Conveyance Documents
DEE
RVC
Deeds
Conveyance Documents
DEF
Deeds
Conveyance Documents
DEF
AMD
Deeds
Conveyance Documents
DEF
COR
Deeds
Conveyance Documents
DEF
MOD
Deeds
Conveyance Documents
DEF
PAR
Deeds
Conveyance Documents
DEF
REL
Deeds
Conveyance Documents
DEF
REV
Deeds
Conveyance Documents
DEF
RRR
Deeds
Conveyance Documents
DEF
RVC
Deeds
Conveyance Documents
DEG
Deeds
Conveyance Documents
DEG
AMD
Deeds
Conveyance Documents
DEG
COR
Deeds
Conveyance Documents
DEG
EAS
Deeds
Conveyance Documents
DEG
MOD
Deeds
Conveyance Documents
DEG
PAR
Deeds
Conveyance Documents
DEG
REL
Deeds
Conveyance Documents
DEG
REV
Deeds
Conveyance Documents
DEG
RRR
Deeds
Conveyance Documents
DEG
RVC
Deeds
Conveyance Documents
DEJ
Deeds
Conveyance Documents
DEJ
AMD
Deeds
Conveyance Documents
DEJ
COR
Deeds
Conveyance Documents
DEJ
MOD
Deeds
Conveyance Documents
DEJ
PAR
Deeds
Conveyance Documents
DEJ
REL
Deeds
Conveyance Documents
DEJ
REV
Deeds
Conveyance Documents
DEJ
RRR
Deeds
Conveyance Documents
DEJ
RVC
Deeds
Conveyance Documents
DEM
Deeds
Conveyance Documents
DEM
AMD
Deeds
Conveyance Documents
DEM
COR
Deeds
Conveyance Documents
DEM
MOD
Deeds
Conveyance Documents
DEM
PAR
Deeds
Conveyance Documents
DEM
REL
Deeds
Conveyance Documents
DEM
REV
Deeds
Conveyance Documents
DEM
RRR
Deeds
Conveyance Documents
DEM
RVC
Deeds
Conveyance Documents
DEQ
Deeds
Conveyance Documents
DEQ
AMD
Deeds
Conveyance Documents
DEQ
COR
Deeds
Conveyance Documents
DEQ
EAS
Deeds
Conveyance Documents
DEQ
MOD
Deeds
Conveyance Documents
DEQ
PAR
Deeds
Conveyance Documents
DEQ
REL
Deeds
Conveyance Documents
DEQ
REV
Deeds
Conveyance Documents
DEQ
RRR
Deeds
Conveyance Documents
DEQ
RVC
Deeds
Conveyance Documents
DER
Deeds
Conveyance Documents
DER
AMD
Deeds
Conveyance Documents
DER
COR
Deeds
Conveyance Documents
DER
MOD
Deeds
Conveyance Documents
DER
PAR
Deeds
Conveyance Documents
DER
REL
Deeds
Conveyance Documents
DER
REV
Deeds
Conveyance Documents
DER
RRR
Deeds
Conveyance Documents
DER
RVC
Deeds
Conveyance Documents
DES
Deeds
Conveyance Documents
DES
AMD
Deeds
Conveyance Documents
DES
COR
Deeds
Conveyance Documents
DES
MOD
Deeds
Conveyance Documents
DES
PAR
Deeds
Conveyance Documents
DES
REL
Deeds
Conveyance Documents
DES
REV
Deeds
Conveyance Documents
DES
RRR
Deeds
Conveyance Documents
DES
RVC
Deeds
Conveyance Documents
DET
Deeds
Conveyance Documents
DET
AMD
Deeds
Conveyance Documents
DET
COR
Deeds
Conveyance Documents
DET
MOD
Deeds
Conveyance Documents
DET
PAR
Deeds
Conveyance Documents
DET
REL
Deeds
Conveyance Documents
DET
REV
Deeds
Conveyance Documents
DET
RRR
Deeds
Conveyance Documents
DET
RSN
Deeds
Conveyance Documents
DET
RVC
Deeds
Conveyance Documents
DEU
Deeds
Conveyance Documents
DEU
AMD
Deeds
Conveyance Documents
DEU
COR
Deeds
Conveyance Documents
DEU
MOD
Deeds
Conveyance Documents
DEU
PAR
Deeds
Conveyance Documents
DEU
REL
Deeds
Conveyance Documents
DEU
REV
Deeds
Conveyance Documents
DEU
RRR
Deeds
Conveyance Documents
DEU
RVC
Deeds
Conveyance Documents
DEW
Deeds
Conveyance Documents
DEW
AMD
Deeds
Conveyance Documents
DEW
COR
Deeds
Conveyance Documents
DEW
MOD
Deeds
Conveyance Documents
DEW
PAR
Deeds
Conveyance Documents
DEW
REL
Deeds
Conveyance Documents
DEW
REV
Deeds
Conveyance Documents
DEW
RRR
Deeds
Conveyance Documents
DEW
RVC
Deeds
Conveyance Documents
DEX
Deeds
Conveyance Documents
DEX
AMD
Deeds
Conveyance Documents
DEX
COR
Deeds
Conveyance Documents
DEX
MOD
Deeds
Conveyance Documents
DEX
PAR
Deeds
Conveyance Documents
DEX
REL
Deeds
Conveyance Documents
DEX
REV
Deeds
Conveyance Documents
DEX
RRR
Deeds
Conveyance Documents
DEX
RVC
Deeds
Conveyance Documents
DEY
Deeds
Conveyance Documents
DEY
AMD
Deeds
Conveyance Documents
DEY
COR
Deeds
Conveyance Documents
DEY
MOD
Deeds
Conveyance Documents
DEY
PAR
Deeds
Conveyance Documents
DEY
REL
Deeds
Conveyance Documents
DEY
REV
Deeds
Conveyance Documents
DEY
RRR
Deeds
Conveyance Documents
DEY
RVC
Deeds
Conveyance Documents
DID
Deeds
Conveyance Documents
DID
AMD
Deeds
Conveyance Documents
DID
COR
Deeds
Conveyance Documents
DID
MOD
Deeds
Conveyance Documents
DID
PAR
Deeds
Conveyance Documents
DID
REL
Deeds
Conveyance Documents
DID
REV
Deeds
Conveyance Documents
DID
RRR
Deeds
Conveyance Documents
DID
RVC
Deeds
Conveyance Documents
DIT
Deeds
Conveyance Documents
DIT
AMD
Deeds
Conveyance Documents
DIT
COR
Deeds
Conveyance Documents
DIT
MOD
Deeds
Conveyance Documents
DIT
PAR
Deeds
Conveyance Documents
DIT
REL
Deeds
Conveyance Documents
DIT
REV
Deeds
Conveyance Documents
DIT
RRR
Deeds
Conveyance Documents
DIT
RVC
Deeds
Conveyance Documents
SWD
Deeds
Conveyance Documents
SWD
AMD
Deeds
Conveyance Documents
SWD
COR
Deeds
Conveyance Documents
SWD
EAS
Deeds
Conveyance Documents
SWD
MOD
Deeds
Conveyance Documents
SWD
RRR
Deeds
Conveyance Documents
SWD
RVC
Deeds
Conveyance Documents
DEG
RSN
Deeds
Conveyance Documents
AFD
COR
Deeds
Conveyance Documents
DEJ
SEV
Deeds
Conveyance Documents
DED
CAN
Deeds
Conveyance Documents
DEG
CAN
Deeds
Conveyance Documents
DEQ
RSN
Deeds
Conveyance Documents
DEG
SBD
Deeds
Conveyance Documents
COS
FOR
Deeds
Conveyance Documents
CTS
PAA
Deeds
Conveyance Documents
CTT
WAT
Deeds
Conveyance Documents
CVY
ASN
Deeds
Conveyance Documents
CVY
COR
Deeds
Conveyance Documents
CVY
EXP
Deeds
Conveyance Documents
DDD
ASN
Deeds
Conveyance Documents
DDD
CAN
Deeds
Conveyance Documents
DDD
COA
Deeds
Conveyance Documents
DDD
EAS
Deeds
Conveyance Documents
DDD
SBD
Deeds
Conveyance Documents
DDD
SCR
Deeds
Conveyance Documents
DDD
TER
Deeds
Conveyance Documents
DDU
ANM
Deeds
Conveyance Documents
DDU
ASN
Deeds
Conveyance Documents
DDU
CAN
Deeds
Conveyance Documents
DDU
ERR
Deeds
Conveyance Documents
DDU
SBD
Deeds
Conveyance Documents
DDU
SCR
Deeds
Conveyance Documents
DDU
STT
Deeds
Conveyance Documents
DDU
TER
Deeds
Conveyance Documents
DEB
ASN
Deeds
Conveyance Documents
DEB
ERR
Deeds
Conveyance Documents
DEC
ASN
Deeds
Conveyance Documents
DED
ASN
Deeds
Conveyance Documents
DED
CMP
Deeds
Conveyance Documents
DED
DDC
Deeds
Conveyance Documents
DED
ERR
Deeds
Conveyance Documents
DED
EST
Deeds
Conveyance Documents
DED
FCL
Deeds
Conveyance Documents
DED
GDN
Deeds
Conveyance Documents
DED
PAA
Deeds
Conveyance Documents
DED
RAT
Deeds
Conveyance Documents
DED
RCA
Deeds
Conveyance Documents
DED
ROA
Deeds
Conveyance Documents
DED
RST
Deeds
Conveyance Documents
DED
SCR
Deeds
Conveyance Documents
DED
STT
Deeds
Conveyance Documents
DED
TER
Deeds
Conveyance Documents
DED
TRF
Deeds
Conveyance Documents
DED
WAT
Deeds
Conveyance Documents
DEG
ASN
Deeds
Conveyance Documents
DEG
TER
Deeds
Conveyance Documents
DEJ
ASN
Deeds
Conveyance Documents
DEJ
CAN
Deeds
Conveyance Documents
DEJ
CLA
Deeds
Conveyance Documents
DEJ
COA
Deeds
Conveyance Documents
DEJ
ERR
Deeds
Conveyance Documents
DEJ
PAA
Deeds
Conveyance Documents
DEJ
SBD
Deeds
Conveyance Documents
DEJ
SCR
Deeds
Conveyance Documents
DEJ
STT
Deeds
Conveyance Documents
DEJ
TER
Deeds
Conveyance Documents
DEQ
ABD
Deeds
Conveyance Documents
DEQ
ADR
Deeds
Conveyance Documents
DEQ
ASN
Deeds
Conveyance Documents
DEQ
CAN
Deeds
Conveyance Documents
DEQ
CLA
Deeds
Conveyance Documents
DEQ
COA
Deeds
Conveyance Documents
DEQ
DTH
Deeds
Conveyance Documents
DEQ
ERR
Deeds
Conveyance Documents
DEQ
FCL
Deeds
Conveyance Documents
DEQ
PAA
Deeds
Conveyance Documents
DEQ
REC
Deeds
Conveyance Documents
DEQ
RUF
Deeds
Conveyance Documents
DEQ
SBD
Deeds
Conveyance Documents
DEQ
SCR
Deeds
Conveyance Documents
DEQ
STT
Deeds
Conveyance Documents
DEQ
TER
Deeds
Conveyance Documents
DES
ASN
Deeds
Conveyance Documents
DEW
ABD
Deeds
Conveyance Documents
DEW
ADR
Deeds
Conveyance Documents
DEW
ASM
Deeds
Conveyance Documents
DEW
ASN
Deeds
Conveyance Documents
DEW
CAN
Deeds
Conveyance Documents
DEW
CLA
Deeds
Conveyance Documents
DEW
COA
Deeds
Conveyance Documents
DEW
ERR
Deeds
Conveyance Documents
DEW
FCL
Deeds
Conveyance Documents
DEW
LTD
Deeds
Conveyance Documents
DEW
PAA
Deeds
Conveyance Documents
DEW
RAS
Deeds
Conveyance Documents
DEW
RAT
Deeds
Conveyance Documents
DEW
SBD
Deeds
Conveyance Documents
DEW
SCR
Deeds
Conveyance Documents
DEW
STT
Deeds
Conveyance Documents
DEW
TER
Deeds
Conveyance Documents
DEW
WAT
Deeds
Conveyance Documents
DEY
ASN
Deeds
Conveyance Documents
DIT
SBD
Deeds
Conveyance Documents
SWD
ABD
Deeds
Conveyance Documents
SWD
ASN
Deeds
Conveyance Documents
SWD
CLA
Deeds
Conveyance Documents
SWD
PAA
Deeds
Conveyance Documents
SWD
PAR
Deeds
Conveyance Documents
SWD
RAT
Deeds
Conveyance Documents
SWD
REL
Deeds
Conveyance Documents
SWD
SBD
Deeds
Conveyance Documents
AFD
AMD
Deeds
Conveyance Documents
AFD
RRR
Deeds
Conveyance Documents
DED
SRN
Deeds
Conveyance Documents
DES
SET
Deeds
Conveyance Documents
DED
RAS
Deeds
Conveyance Documents
CTS
FCL
Deeds
Conveyance Documents
DED
SPC
Deeds
Conveyance Documents
DEF
SPC
Deeds
Conveyance Documents
COS
CLA
Deeds
Conveyance Documents
DED
DSC
Deeds
Conveyance Documents
DEM
ASA
Deeds
Conveyance Documents
DEM
TRF
Deeds
Conveyance Documents
DER
TRF
Deeds
Conveyance Documents
AFD
CMP
Deeds
Conveyance Documents
AFD
REI
Deeds
Conveyance Documents
AFD
REL
Deeds
Conveyance Documents
AFD
RSG
Deeds
Conveyance Documents
AFD
SCC
Deeds
Conveyance Documents
AFD
STT
Deeds
Conveyance Documents
AFD
TER
Deeds
Conveyance Documents
CVY
REL
Deeds
Conveyance Documents
DED
EXP
Deeds
Conveyance Documents
DED
PTT
Deeds
Conveyance Documents
DED
SBD
Deeds
Conveyance Documents
DEQ
WAT
Deeds
Conveyance Documents
DDD
PAA
Deeds
Conveyance Documents
DED
REC
Deeds
Conveyance Documents
DET
ERR
Deeds
Conveyance Documents
DET
SUB
Deeds
Conveyance Documents
CVY
EAS
Deeds
Conveyance Documents
CVY
AMD
Deeds
Conveyance Documents
CVY
COA
Deeds
Conveyance Documents
CVY
PAA
Deeds
Conveyance Documents
CVY
PAR
Deeds
Conveyance Documents
CVY
RRR
Deeds
Conveyance Documents
CVY
SAT
Deeds
Conveyance Documents
DDU
COA
Deeds
Conveyance Documents
DDU
SAT
Deeds
Conveyance Documents
DED
COA
Deeds
Conveyance Documents
DEE
ASN
Deeds
Conveyance Documents
DEE
COA
Deeds
Conveyance Documents
DEF
ASN
Deeds
Conveyance Documents
DEF
COA
Deeds
Conveyance Documents
DEM
ASN
Deeds
Conveyance Documents
DEM
COA
Deeds
Conveyance Documents
DER
ASN
Deeds
Conveyance Documents
DER
COA
Deeds
Conveyance Documents
DET
ASN
Deeds
Conveyance Documents
DET
COA
Deeds
Conveyance Documents
DEU
ASN
Deeds
Conveyance Documents
DEU
COA
Deeds
Conveyance Documents
DEX
ASN
Deeds
Conveyance Documents
DEX
COA
Deeds
Conveyance Documents
DEX
SAT
Deeds
Conveyance Documents
DIT
ASN
Deeds
Conveyance Documents
DIT
COA
Deeds
Conveyance Documents
SWD
COA
Deeds
Conveyance Documents
DED
QUI
Deeds
Conveyance Documents
DEQ
DSC
Deeds
Conveyance Documents
COS
COA
Deeds
Conveyance Documents
DET
FCL
Deeds
Conveyance Documents
AFD
ASN
Deeds
Conveyance Documents
AFD
PAR
Deeds
Conveyance Documents
DED
ASM
Deeds
Conveyance Documents
SWD
RFR
Deeds
Conveyance Documents
CTT
ABD
Deeds
Conveyance Documents
CTT
ADR
Deeds
Conveyance Documents
CTT
ANX
Deeds
Conveyance Documents
CTT
ARS
Deeds
Conveyance Documents
CTT
ASA
Deeds
Conveyance Documents
CTT
ASM
Deeds
Conveyance Documents
CTT
CNT
Deeds
Conveyance Documents
CTT
DNX
Deeds
Conveyance Documents
CTT
EAS
Deeds
Conveyance Documents
CTT
NUL
Deeds
Conveyance Documents
CTT
PAA
Deeds
Conveyance Documents
CTT
PTT
Deeds
Conveyance Documents
CTT
RAT
Deeds
Conveyance Documents
CTT
RML
Deeds
Conveyance Documents
CTT
RSN
Deeds
Conveyance Documents
CTT
RST
Deeds
Conveyance Documents
CTT
SBD
Deeds
Conveyance Documents
CTT
SUP
Deeds
Conveyance Documents
CTT
TRT
Deeds
Conveyance Documents
CTT
VAC
Deeds
Conveyance Documents
CTT
VIO
Deeds
Conveyance Documents
CVY
ABD
Deeds
Conveyance Documents
CVY
ADR
Deeds
Conveyance Documents
CVY
ANX
Deeds
Conveyance Documents
CVY
ARS
Deeds
Conveyance Documents
CVY
ASA
Deeds
Conveyance Documents
CVY
ASM
Deeds
Conveyance Documents
CVY
BUT
Deeds
Conveyance Documents
CVY
CNT
Deeds
Conveyance Documents
CVY
DNX
Deeds
Conveyance Documents
CVY
NUL
Deeds
Conveyance Documents
CVY
PTT
Deeds
Conveyance Documents
CVY
RAT
Deeds
Conveyance Documents
CVY
RML
Deeds
Conveyance Documents
CVY
RSN
Deeds
Conveyance Documents
CVY
RST
Deeds
Conveyance Documents
CVY
SBD
Deeds
Conveyance Documents
CVY
SUP
Deeds
Conveyance Documents
CVY
TRT
Deeds
Conveyance Documents
CVY
VAC
Deeds
Conveyance Documents
CVY
VIO
Deeds
Conveyance Documents
CVY
WAT
Deeds
Conveyance Documents
DDD
CMP
Deeds
Conveyance Documents
DDD
DDC
Deeds
Conveyance Documents
DDD
EST
Deeds
Conveyance Documents
DDD
FCL
Deeds
Conveyance Documents
DDD
GDN
Deeds
Conveyance Documents
DDD
RAT
Deeds
Conveyance Documents
DDD
RCA
Deeds
Conveyance Documents
DDD
ROA
Deeds
Conveyance Documents
DDD
RSN
Deeds
Conveyance Documents
DDD
RST
Deeds
Conveyance Documents
DDD
TRF
Deeds
Conveyance Documents
DDU
CMP
Deeds
Conveyance Documents
DDU
DDC
Deeds
Conveyance Documents
DDU
EAS
Deeds
Conveyance Documents
DDU
EST
Deeds
Conveyance Documents
DDU
FCL
Deeds
Conveyance Documents
DDU
GDN
Deeds
Conveyance Documents
DDU
PAA
Deeds
Conveyance Documents
DDU
RAT
Deeds
Conveyance Documents
DDU
RCA
Deeds
Conveyance Documents
DDU
ROA
Deeds
Conveyance Documents
DDU
RST
Deeds
Conveyance Documents
DDU
TRF
Deeds
Conveyance Documents
DEA
ASN
Deeds
Conveyance Documents
DEA
CAN
Deeds
Conveyance Documents
DEA
CMP
Deeds
Conveyance Documents
DEA
DDC
Deeds
Conveyance Documents
DEA
EAS
Deeds
Conveyance Documents
DEA
ERR
Deeds
Conveyance Documents
DEA
EST
Deeds
Conveyance Documents
DEA
FCL
Deeds
Conveyance Documents
DEA
GDN
Deeds
Conveyance Documents
DEA
PAA
Deeds
Conveyance Documents
DEA
RAT
Deeds
Conveyance Documents
DEA
RCA
Deeds
Conveyance Documents
DEA
ROA
Deeds
Conveyance Documents
DEA
RST
Deeds
Conveyance Documents
DEA
SCR
Deeds
Conveyance Documents
DEA
STT
Deeds
Conveyance Documents
DEA
TER
Deeds
Conveyance Documents
DEA
TRF
Deeds
Conveyance Documents
DEA
WAT
Deeds
Conveyance Documents
DEB
CAN
Deeds
Conveyance Documents
DEB
CMP
Deeds
Conveyance Documents
DEB
DDC
Deeds
Conveyance Documents
DEB
EAS
Deeds
Conveyance Documents
DEB
EST
Deeds
Conveyance Documents
DEB
FCL
Deeds
Conveyance Documents
DEB
GDN
Deeds
Conveyance Documents
DEB
PAA
Deeds
Conveyance Documents
DEB
RAT
Deeds
Conveyance Documents
DEB
RCA
Deeds
Conveyance Documents
DEB
ROA
Deeds
Conveyance Documents
DEB
RST
Deeds
Conveyance Documents
DEB
SCR
Deeds
Conveyance Documents
DEB
STT
Deeds
Conveyance Documents
DEB
TER
Deeds
Conveyance Documents
DEB
TRF
Deeds
Conveyance Documents
DEB
WAT
Deeds
Conveyance Documents
DEC
CAN
Deeds
Conveyance Documents
DEC
CMP
Deeds
Conveyance Documents
DEC
DDC
Deeds
Conveyance Documents
DEC
EAS
Deeds
Conveyance Documents
DEC
ERR
Deeds
Conveyance Documents
DEC
EST
Deeds
Conveyance Documents
DEC
FCL
Deeds
Conveyance Documents
DEC
GDN
Deeds
Conveyance Documents
DEC
PAA
Deeds
Conveyance Documents
DEC
RAT
Deeds
Conveyance Documents
DEC
RCA
Deeds
Conveyance Documents
DEC
ROA
Deeds
Conveyance Documents
DEC
RST
Deeds
Conveyance Documents
DEC
SCR
Deeds
Conveyance Documents
DEC
STT
Deeds
Conveyance Documents
DEC
TER
Deeds
Conveyance Documents
DEC
TRF
Deeds
Conveyance Documents
DED
ABD
Deeds
Conveyance Documents
DED
ADR
Deeds
Conveyance Documents
DED
ANM
Deeds
Conveyance Documents
DED
APS
Deeds
Conveyance Documents
DED
APT
Deeds
Conveyance Documents
DED
ASA
Deeds
Conveyance Documents
DED
ATY
Deeds
Conveyance Documents
DED
CDM
Deeds
Conveyance Documents
DED
CFS
Deeds
Conveyance Documents
DED
CNT
Deeds
Conveyance Documents
DED
CRD
Deeds
Conveyance Documents
DED
CVS
Deeds
Conveyance Documents
DED
DCH
Deeds
Conveyance Documents
DED
DFL
Deeds
Conveyance Documents
DED
DSM
Deeds
Conveyance Documents
DED
EXT
Deeds
Conveyance Documents
DED
FCR
Deeds
Conveyance Documents
DED
FNL
Deeds
Conveyance Documents
DED
FOR
Deeds
Conveyance Documents
DED
INA
Deeds
Conveyance Documents
DED
INT
Deeds
Conveyance Documents
DED
NUL
Deeds
Conveyance Documents
DED
OSL
Deeds
Conveyance Documents
DED
POS
Deeds
Conveyance Documents
DED
REA
Deeds
Conveyance Documents
DED
REF
Deeds
Conveyance Documents
DED
REI
Deeds
Conveyance Documents
DED
RML
Deeds
Conveyance Documents
DED
RNW
Deeds
Conveyance Documents
DED
RSN
Deeds
Conveyance Documents
DED
RSU
Deeds
Conveyance Documents
DED
SAT
Deeds
Conveyance Documents
DED
SCC
Deeds
Conveyance Documents
DED
SET
Deeds
Conveyance Documents
DED
STP
Deeds
Conveyance Documents
DED
SUP
Deeds
Conveyance Documents
DED
SZE
Deeds
Conveyance Documents
DED
TXA
Deeds
Conveyance Documents
DED
VAC
Deeds
Conveyance Documents
DED
WDW
Deeds
Conveyance Documents
DEF
CAN
Deeds
Conveyance Documents
DEF
CLA
Deeds
Conveyance Documents
DEF
ERR
Deeds
Conveyance Documents
DEF
PAA
Deeds
Conveyance Documents
DEF
SBD
Deeds
Conveyance Documents
DEF
SCR
Deeds
Conveyance Documents
DEF
SEV
Deeds
Conveyance Documents
DEF
STT
Deeds
Conveyance Documents
DEF
TER
Deeds
Conveyance Documents
DEG
ABD
Deeds
Conveyance Documents
DEG
ADR
Deeds
Conveyance Documents
DEG
ANM
Deeds
Conveyance Documents
DEG
APS
Deeds
Conveyance Documents
DEG
APT
Deeds
Conveyance Documents
DEG
ASA
Deeds
Conveyance Documents
DEG
ATY
Deeds
Conveyance Documents
DEG
CDM
Deeds
Conveyance Documents
DEG
CFS
Deeds
Conveyance Documents
DEG
CMP
Deeds
Conveyance Documents
DEG
CNT
Deeds
Conveyance Documents
DEG
CRD
Deeds
Conveyance Documents
DEG
CVS
Deeds
Conveyance Documents
DEG
DCH
Deeds
Conveyance Documents
DEG
DDC
Deeds
Conveyance Documents
DEG
DFL
Deeds
Conveyance Documents
DEG
DSC
Deeds
Conveyance Documents
DEG
DSM
Deeds
Conveyance Documents
DEG
EST
Deeds
Conveyance Documents
DEG
EXP
Deeds
Conveyance Documents
DEG
EXT
Deeds
Conveyance Documents
DEG
FCR
Deeds
Conveyance Documents
DEG
FNL
Deeds
Conveyance Documents
DEG
FOR
Deeds
Conveyance Documents
DEG
INT
Deeds
Conveyance Documents
DEG
NUL
Deeds
Conveyance Documents
DEG
OSL
Deeds
Conveyance Documents
DEG
POS
Deeds
Conveyance Documents
DEG
QUI
Deeds
Conveyance Documents
DEG
RAS
Deeds
Conveyance Documents
DEG
RAT
Deeds
Conveyance Documents
DEG
RCA
Deeds
Conveyance Documents
DEG
REA
Deeds
Conveyance Documents
DEG
REF
Deeds
Conveyance Documents
DEG
REI
Deeds
Conveyance Documents
DEG
RML
Deeds
Conveyance Documents
DEG
RNW
Deeds
Conveyance Documents
DEG
RST
Deeds
Conveyance Documents
DEG
RSU
Deeds
Conveyance Documents
DEG
SAT
Deeds
Conveyance Documents
DEG
SCC
Deeds
Conveyance Documents
DEG
SET
Deeds
Conveyance Documents
DEG
STP
Deeds
Conveyance Documents
DEG
STT
Deeds
Conveyance Documents
DEG
SUP
Deeds
Conveyance Documents
DEG
SZE
Deeds
Conveyance Documents
DEG
TXA
Deeds
Conveyance Documents
DEG
VAC
Deeds
Conveyance Documents
DEG
WAT
Deeds
Conveyance Documents
DEG
WDW
Deeds
Conveyance Documents
DEJ
ABD
Deeds
Conveyance Documents
DEJ
ADR
Deeds
Conveyance Documents
DEJ
ANM
Deeds
Conveyance Documents
DEJ
APS
Deeds
Conveyance Documents
DEJ
APT
Deeds
Conveyance Documents
DEJ
ASA
Deeds
Conveyance Documents
DEJ
ATY
Deeds
Conveyance Documents
DEJ
CDM
Deeds
Conveyance Documents
DEJ
CFS
Deeds
Conveyance Documents
DEJ
CMP
Deeds
Conveyance Documents
DEJ
CNT
Deeds
Conveyance Documents
DEJ
CRD
Deeds
Conveyance Documents
DEJ
DCH
Deeds
Conveyance Documents
DEJ
DDC
Deeds
Conveyance Documents
DEJ
DFL
Deeds
Conveyance Documents
DEJ
DSC
Deeds
Conveyance Documents
DEJ
DSM
Deeds
Conveyance Documents
DEJ
EST
Deeds
Conveyance Documents
DEJ
EXP
Deeds
Conveyance Documents
DEJ
EXT
Deeds
Conveyance Documents
DEJ
FCR
Deeds
Conveyance Documents
DEJ
FNL
Deeds
Conveyance Documents
DEJ
FOR
Deeds
Conveyance Documents
DEJ
INA
Deeds
Conveyance Documents
DEJ
INT
Deeds
Conveyance Documents
DEJ
NUL
Deeds
Conveyance Documents
DEJ
OSL
Deeds
Conveyance Documents
DEJ
POS
Deeds
Conveyance Documents
DEJ
QUI
Deeds
Conveyance Documents
DEJ
RAS
Deeds
Conveyance Documents
DEJ
RAT
Deeds
Conveyance Documents
DEJ
RCA
Deeds
Conveyance Documents
DEJ
REA
Deeds
Conveyance Documents
DEJ
REI
Deeds
Conveyance Documents
DEJ
RML
Deeds
Conveyance Documents
DEJ
RNW
Deeds
Conveyance Documents
DEJ
RSN
Deeds
Conveyance Documents
DEJ
RST
Deeds
Conveyance Documents
DEJ
RSU
Deeds
Conveyance Documents
DEJ
SAT
Deeds
Conveyance Documents
DEJ
SET
Deeds
Conveyance Documents
DEJ
STP
Deeds
Conveyance Documents
DEJ
SUP
Deeds
Conveyance Documents
DEJ
SZE
Deeds
Conveyance Documents
DEJ
TXA
Deeds
Conveyance Documents
DEJ
VAC
Deeds
Conveyance Documents
DEJ
WAT
Deeds
Conveyance Documents
DEJ
WDW
Deeds
Conveyance Documents
DEM
ABD
Deeds
Conveyance Documents
DEM
ADR
Deeds
Conveyance Documents
DEM
ANM
Deeds
Conveyance Documents
DEM
APS
Deeds
Conveyance Documents
DEM
APT
Deeds
Conveyance Documents
DEM
ATY
Deeds
Conveyance Documents
DEM
CAN
Deeds
Conveyance Documents
DEM
CDM
Deeds
Conveyance Documents
DEM
CFS
Deeds
Conveyance Documents
DEM
CLA
Deeds
Conveyance Documents
DEM
CMP
Deeds
Conveyance Documents
DEM
CNT
Deeds
Conveyance Documents
DEM
CRD
Deeds
Conveyance Documents
DEM
DCH
Deeds
Conveyance Documents
DEM
DDC
Deeds
Conveyance Documents
DEM
DFL
Deeds
Conveyance Documents
DEM
DSC
Deeds
Conveyance Documents
DEM
DSM
Deeds
Conveyance Documents
DEM
ERR
Deeds
Conveyance Documents
DEM
EST
Deeds
Conveyance Documents
DEM
EXP
Deeds
Conveyance Documents
DEM
EXT
Deeds
Conveyance Documents
DEM
FCR
Deeds
Conveyance Documents
DEM
FNL
Deeds
Conveyance Documents
DEM
FOR
Deeds
Conveyance Documents
DEM
INA
Deeds
Conveyance Documents
DEM
INT
Deeds
Conveyance Documents
DEM
NUL
Deeds
Conveyance Documents
DEM
OSL
Deeds
Conveyance Documents
DEM
PAA
Deeds
Conveyance Documents
DEM
POS
Deeds
Conveyance Documents
DEM
QUI
Deeds
Conveyance Documents
DEM
RAS
Deeds
Conveyance Documents
DEM
RAT
Deeds
Conveyance Documents
DEM
RCA
Deeds
Conveyance Documents
DEM
REA
Deeds
Conveyance Documents
DEM
REI
Deeds
Conveyance Documents
DEM
RML
Deeds
Conveyance Documents
DEM
RNW
Deeds
Conveyance Documents
DEM
RSN
Deeds
Conveyance Documents
DEM
RST
Deeds
Conveyance Documents
DEM
RSU
Deeds
Conveyance Documents
DEM
SAT
Deeds
Conveyance Documents
DEM
SCR
Deeds
Conveyance Documents
DEM
SET
Deeds
Conveyance Documents
DEM
SEV
Deeds
Conveyance Documents
DEM
STP
Deeds
Conveyance Documents
DEM
SUP
Deeds
Conveyance Documents
DEM
SZE
Deeds
Conveyance Documents
DEM
TER
Deeds
Conveyance Documents
DEM
TXA
Deeds
Conveyance Documents
DEM
VAC
Deeds
Conveyance Documents
DEM
WAT
Deeds
Conveyance Documents
DEM
WDW
Deeds
Conveyance Documents
DEQ
ANM
Deeds
Conveyance Documents
DEQ
APS
Deeds
Conveyance Documents
DEQ
APT
Deeds
Conveyance Documents
DEQ
ASA
Deeds
Conveyance Documents
DEQ
ATY
Deeds
Conveyance Documents
DEQ
CDM
Deeds
Conveyance Documents
DEQ
CFS
Deeds
Conveyance Documents
DEQ
CMP
Deeds
Conveyance Documents
DEQ
CNT
Deeds
Conveyance Documents
DEQ
CRD
Deeds
Conveyance Documents
DEQ
DCH
Deeds
Conveyance Documents
DEQ
DDC
Deeds
Conveyance Documents
DEQ
DFL
Deeds
Conveyance Documents
DEQ
DSM
Deeds
Conveyance Documents
DEQ
EST
Deeds
Conveyance Documents
DEQ
EXP
Deeds
Conveyance Documents
DEQ
EXT
Deeds
Conveyance Documents
DEQ
FCR
Deeds
Conveyance Documents
DEQ
FNL
Deeds
Conveyance Documents
DEQ
FOR
Deeds
Conveyance Documents
DEQ
INA
Deeds
Conveyance Documents
DEQ
INT
Deeds
Conveyance Documents
DEQ
NUL
Deeds
Conveyance Documents
DEQ
OSL
Deeds
Conveyance Documents
DEQ
POS
Deeds
Conveyance Documents
DEQ
QUI
Deeds
Conveyance Documents
DEQ
RAS
Deeds
Conveyance Documents
DEQ
RAT
Deeds
Conveyance Documents
DEQ
RCA
Deeds
Conveyance Documents
DEQ
REA
Deeds
Conveyance Documents
DEQ
REI
Deeds
Conveyance Documents
DEQ
RML
Deeds
Conveyance Documents
DEQ
RNW
Deeds
Conveyance Documents
DEQ
RST
Deeds
Conveyance Documents
DEQ
RSU
Deeds
Conveyance Documents
DEQ
SAT
Deeds
Conveyance Documents
DEQ
SET
Deeds
Conveyance Documents
DEQ
SEV
Deeds
Conveyance Documents
DEQ
STP
Deeds
Conveyance Documents
DEQ
SUP
Deeds
Conveyance Documents
DEQ
SZE
Deeds
Conveyance Documents
DEQ
TXA
Deeds
Conveyance Documents
DEQ
VAC
Deeds
Conveyance Documents
DEQ
WDW
Deeds
Conveyance Documents
DER
ABD
Deeds
Conveyance Documents
DER
ADR
Deeds
Conveyance Documents
DER
ANX
Deeds
Conveyance Documents
DER
ARS
Deeds
Conveyance Documents
DER
ASA
Deeds
Conveyance Documents
DER
ASM
Deeds
Conveyance Documents
DER
BUT
Deeds
Conveyance Documents
DER
CNT
Deeds
Conveyance Documents
DER
DNX
Deeds
Conveyance Documents
DER
EAS
Deeds
Conveyance Documents
DER
EXP
Deeds
Conveyance Documents
DER
NUL
Deeds
Conveyance Documents
DER
PAA
Deeds
Conveyance Documents
DER
PTT
Deeds
Conveyance Documents
DER
RAT
Deeds
Conveyance Documents
DER
RML
Deeds
Conveyance Documents
DER
RSN
Deeds
Conveyance Documents
DER
RST
Deeds
Conveyance Documents
DER
SAT
Deeds
Conveyance Documents
DER
SBD
Deeds
Conveyance Documents
DER
SUP
Deeds
Conveyance Documents
DER
TRT
Deeds
Conveyance Documents
DER
VAC
Deeds
Conveyance Documents
DER
WAT
Deeds
Conveyance Documents
DES
ABD
Deeds
Conveyance Documents
DES
ADR
Deeds
Conveyance Documents
DES
ANX
Deeds
Conveyance Documents
DES
ARS
Deeds
Conveyance Documents
DES
ASA
Deeds
Conveyance Documents
DES
ASM
Deeds
Conveyance Documents
DES
BUT
Deeds
Conveyance Documents
DES
CNT
Deeds
Conveyance Documents
DES
DNX
Deeds
Conveyance Documents
DES
EAS
Deeds
Conveyance Documents
DES
EXP
Deeds
Conveyance Documents
DES
NUL
Deeds
Conveyance Documents
DES
PAA
Deeds
Conveyance Documents
DES
PTT
Deeds
Conveyance Documents
DES
RAT
Deeds
Conveyance Documents
DES
RML
Deeds
Conveyance Documents
DES
RSN
Deeds
Conveyance Documents
DES
RST
Deeds
Conveyance Documents
DES
SAT
Deeds
Conveyance Documents
DES
SBD
Deeds
Conveyance Documents
DES
SUP
Deeds
Conveyance Documents
DES
TRT
Deeds
Conveyance Documents
DES
VAC
Deeds
Conveyance Documents
DES
WAT
Deeds
Conveyance Documents
DET
ABD
Deeds
Conveyance Documents
DET
ADR
Deeds
Conveyance Documents
DET
ANX
Deeds
Conveyance Documents
DET
ARS
Deeds
Conveyance Documents
DET
ASA
Deeds
Conveyance Documents
DET
ASM
Deeds
Conveyance Documents
DET
BUT
Deeds
Conveyance Documents
DET
CNT
Deeds
Conveyance Documents
DET
DNX
Deeds
Conveyance Documents
DET
EAS
Deeds
Conveyance Documents
DET
EXP
Deeds
Conveyance Documents
DET
NUL
Deeds
Conveyance Documents
DET
PAA
Deeds
Conveyance Documents
DET
PTT
Deeds
Conveyance Documents
DET
RAT
Deeds
Conveyance Documents
DET
RML
Deeds
Conveyance Documents
DET
RST
Deeds
Conveyance Documents
DET
SAT
Deeds
Conveyance Documents
DET
SBD
Deeds
Conveyance Documents
DET
SUP
Deeds
Conveyance Documents
DET
TRT
Deeds
Conveyance Documents
DET
VAC
Deeds
Conveyance Documents
DEU
ABD
Deeds
Conveyance Documents
DEU
ADR
Deeds
Conveyance Documents
DEU
ANX
Deeds
Conveyance Documents
DEU
ARS
Deeds
Conveyance Documents
DEU
ASA
Deeds
Conveyance Documents
DEU
ASM
Deeds
Conveyance Documents
DEU
BUT
Deeds
Conveyance Documents
DEU
CNT
Deeds
Conveyance Documents
DEU
DNX
Deeds
Conveyance Documents
DEU
EAS
Deeds
Conveyance Documents
DEU
EXP
Deeds
Conveyance Documents
DEU
NUL
Deeds
Conveyance Documents
DEU
PAA
Deeds
Conveyance Documents
DEU
PTT
Deeds
Conveyance Documents
DEU
RAT
Deeds
Conveyance Documents
DEU
RML
Deeds
Conveyance Documents
DEU
RSN
Deeds
Conveyance Documents
DEU
RST
Deeds
Conveyance Documents
DEU
SAT
Deeds
Conveyance Documents
DEU
SBD
Deeds
Conveyance Documents
DEU
SUP
Deeds
Conveyance Documents
DEU
TRT
Deeds
Conveyance Documents
DEW
ANX
Deeds
Conveyance Documents
DEW
ARS
Deeds
Conveyance Documents
DEW
ASA
Deeds
Conveyance Documents
DEW
BUT
Deeds
Conveyance Documents
DEW
CNT
Deeds
Conveyance Documents
DEW
DNX
Deeds
Conveyance Documents
DEW
EAS
Deeds
Conveyance Documents
DEW
EXP
Deeds
Conveyance Documents
DEW
NUL
Deeds
Conveyance Documents
DEW
PTT
Deeds
Conveyance Documents
DEW
RML
Deeds
Conveyance Documents
DEW
RSN
Deeds
Conveyance Documents
DEW
RST
Deeds
Conveyance Documents
DEW
SAT
Deeds
Conveyance Documents
DEW
SUP
Deeds
Conveyance Documents
DEW
TRT
Deeds
Conveyance Documents
DEX
ABD
Deeds
Conveyance Documents
DEX
ADR
Deeds
Conveyance Documents
DEX
ANX
Deeds
Conveyance Documents
DEX
ARS
Deeds
Conveyance Documents
DEX
ASA
Deeds
Conveyance Documents
DEX
ASM
Deeds
Conveyance Documents
DEX
BUT
Deeds
Conveyance Documents
DEX
CNT
Deeds
Conveyance Documents
DEX
DNX
Deeds
Conveyance Documents
DEX
EAS
Deeds
Conveyance Documents
DEX
EXP
Deeds
Conveyance Documents
DEX
NUL
Deeds
Conveyance Documents
DEX
PAA
Deeds
Conveyance Documents
DEX
PTT
Deeds
Conveyance Documents
DEX
RAT
Deeds
Conveyance Documents
DEX
RML
Deeds
Conveyance Documents
DEX
RSN
Deeds
Conveyance Documents
DEX
RST
Deeds
Conveyance Documents
DEX
SBD
Deeds
Conveyance Documents
DEX
SUP
Deeds
Conveyance Documents
DEX
TRT
Deeds
Conveyance Documents
DEX
VAC
Deeds
Conveyance Documents
DEY
ABD
Deeds
Conveyance Documents
DEY
ADR
Deeds
Conveyance Documents
DEY
ANX
Deeds
Conveyance Documents
DEY
ARS
Deeds
Conveyance Documents
DEY
ASA
Deeds
Conveyance Documents
DEY
ASM
Deeds
Conveyance Documents
DEY
BUT
Deeds
Conveyance Documents
DEY
CNT
Deeds
Conveyance Documents
DEY
DNX
Deeds
Conveyance Documents
DEY
EAS
Deeds
Conveyance Documents
DEY
EXP
Deeds
Conveyance Documents
DEY
NUL
Deeds
Conveyance Documents
DEY
PAA
Deeds
Conveyance Documents
DEY
PTT
Deeds
Conveyance Documents
DEY
RAT
Deeds
Conveyance Documents
DEY
RML
Deeds
Conveyance Documents
DEY
RSN
Deeds
Conveyance Documents
DEY
RST
Deeds
Conveyance Documents
DEY
SAT
Deeds
Conveyance Documents
DEY
SBD
Deeds
Conveyance Documents
DEY
SUP
Deeds
Conveyance Documents
DEY
TRT
Deeds
Conveyance Documents
DID
ABD
Deeds
Conveyance Documents
DID
ADR
Deeds
Conveyance Documents
DID
ANX
Deeds
Conveyance Documents
DID
ARS
Deeds
Conveyance Documents
DID
ASA
Deeds
Conveyance Documents
DID
ASM
Deeds
Conveyance Documents
DID
BUT
Deeds
Conveyance Documents
DID
CNT
Deeds
Conveyance Documents
DID
DNX
Deeds
Conveyance Documents
DID
EAS
Deeds
Conveyance Documents
DID
EXP
Deeds
Conveyance Documents
DID
NUL
Deeds
Conveyance Documents
DID
PAA
Deeds
Conveyance Documents
DID
PTT
Deeds
Conveyance Documents
DID
RAT
Deeds
Conveyance Documents
DID
RML
Deeds
Conveyance Documents
DID
RSN
Deeds
Conveyance Documents
DID
RST
Deeds
Conveyance Documents
DID
SAT
Deeds
Conveyance Documents
DID
SBD
Deeds
Conveyance Documents
DID
SUP
Deeds
Conveyance Documents
DIT
ABD
Deeds
Conveyance Documents
DIT
ADR
Deeds
Conveyance Documents
DIT
ANX
Deeds
Conveyance Documents
DIT
ARS
Deeds
Conveyance Documents
DIT
ASA
Deeds
Conveyance Documents
DIT
ASM
Deeds
Conveyance Documents
DIT
BUT
Deeds
Conveyance Documents
DIT
CNT
Deeds
Conveyance Documents
DIT
DNX
Deeds
Conveyance Documents
DIT
EAS
Deeds
Conveyance Documents
DIT
EXP
Deeds
Conveyance Documents
DIT
NUL
Deeds
Conveyance Documents
DIT
PAA
Deeds
Conveyance Documents
DIT
PTT
Deeds
Conveyance Documents
DIT
RAT
Deeds
Conveyance Documents
DIT
RML
Deeds
Conveyance Documents
DIT
RSN
Deeds
Conveyance Documents
DIT
RST
Deeds
Conveyance Documents
DIT
SAT
Deeds
Conveyance Documents
DIT
SUP
Deeds
Conveyance Documents
COS
TSL
Deeds
Conveyance Documents
SWD
LTD
Deeds
Conveyance Documents
DEM
SBD
Deeds
Conveyance Documents
DEY
DSC
Deeds
Conveyance Documents
DED
NAC
Deeds
Conveyance Documents
CTS
RQN
Deeds
Conveyance Documents
SWD
ERR
Deeds
Conveyance Documents
DEQ
NAC
Deeds
Conveyance Documents
AFD
SUP
Deeds
Conveyance Documents
COS
REI
Deeds
Conveyance Documents
DED
RUF
Deeds
Conveyance Documents
DEE
APT
Deeds
Conveyance Documents
DEE
DFL
Deeds
Conveyance Documents
DEE
SBD
Deeds
Conveyance Documents
DEQ
PRC
Deeds
Conveyance Documents
DEX
CAN
Deeds
Conveyance Documents
DEG
RUF
Deeds
Conveyance Documents
CVY
RCA
Deeds
Conveyance Documents
DEG
ERR
Deeds
Conveyance Documents
AFD
MOD
Deeds
Conveyance Documents
DDU
REI
Deeds
Conveyance Documents
DEG
MER
Deeds
Conveyance Documents
COS
EXM
Deeds
Conveyance Documents
CTS
MOD
Deeds
Conveyance Documents
DEE
SAT
Deeds
Conveyance Documents
DEW
DCH
Deeds
Conveyance Documents
DEW
EXT
Deeds
Conveyance Documents
DEX
DCH
Deeds
Conveyance Documents
DEX
EXT
Deeds
Conveyance Documents
DIT
DCH
Deeds
Conveyance Documents
DIT
EXT
Deeds
Conveyance Documents
SWD
DCH
Deeds
Conveyance Documents
SWD
SAT
Deeds
Conveyance Documents
SWD
RSU
Deeds
Conveyance Documents
AFD
CAN
Deeds
Conveyance Documents
AFD
RVC
Deeds
Conveyance Documents
DED
ADA
Deeds
Conveyance Documents
DED
JTV
Deeds
Conveyance Documents
DED
PRC
Deeds
Conveyance Documents
DED
RQN
Deeds
Conveyance Documents
DED
RSG
Deeds
Conveyance Documents
DED
SFR
Deeds
Conveyance Documents
DEG
REC
Deeds
Conveyance Documents
DEG
RQN
Deeds
Conveyance Documents
DEQ
JTV
Deeds
Conveyance Documents
DEQ
RQN
Deeds
Conveyance Documents
DEQ
RSG
Deeds
Conveyance Documents
COS
FCL
Deeds
Conveyance Documents
DEE
DCH
Deeds
Conveyance Documents
DIT
TER
Deeds
Conveyance Documents
SWD
TER
Deeds
Conveyance Documents
SWD
EXT
Deeds
Conveyance Documents
CTS
CAA
Deeds
Conveyance Documents
COS
SBD
Deeds
Conveyance Documents
COS
STT
Deeds
Conveyance Documents
DED
RFR
Deeds
Conveyance Documents
DED
RLQ
Deeds
Conveyance Documents
DEW
SPC
Deeds
Conveyance Documents
AFD
ACC
Deeds
Conveyance Documents
AFD
ASA
Deeds
Conveyance Documents
AFD
COA
Deeds
Conveyance Documents
AFD
REC
Deeds
Conveyance Documents
AFD
SFR
Deeds
Conveyance Documents
COS
REC
Deeds
Conveyance Documents
COS
SFR
Deeds
Conveyance Documents
CTS
REC
Deeds
Conveyance Documents
DDU
ACC
Deeds
Conveyance Documents
DDU
ASA
Deeds
Conveyance Documents
DDU
REC
Deeds
Conveyance Documents
DDU
SFR
Deeds
Conveyance Documents
DEE
SFR
Deeds
Conveyance Documents
DEF
RSN
Deeds
Conveyance Documents
DEG
ACC
Deeds
Conveyance Documents
DEG
AMA
Deeds
Conveyance Documents
DEG
AST
Deeds
Conveyance Documents
DEG
COA
Deeds
Conveyance Documents
DEG
DIS
Deeds
Conveyance Documents
DEG
INV
Deeds
Conveyance Documents
DEG
NAC
Deeds
Conveyance Documents
DEG
PAA
Deeds
Conveyance Documents
DEG
RAM
Deeds
Conveyance Documents
DEG
RLQ
Deeds
Conveyance Documents
DEG
SFR
Deeds
Conveyance Documents
DEQ
ACC
Deeds
Conveyance Documents
DEQ
SFR
Deeds
Conveyance Documents
DET
REC
Deeds
Conveyance Documents
DEX
RAS
Deeds
Conveyance Documents
DEX
REC
Deeds
Conveyance Documents
DEX
SFR
Deeds
Conveyance Documents
TOD
Deeds
Conveyance Documents
TOD
ACC
Deeds
Conveyance Documents
TOD
AMD
Deeds
Conveyance Documents
TOD
COR
Deeds
Conveyance Documents
TOD
RRR
Deeds
Conveyance Documents
TOD
RVC
Deeds
Conveyance Documents
DDU
RAS
Deeds
Conveyance Documents
DEX
CAR
Deeds
Conveyance Documents
COS
PAA
Deeds
Conveyance Documents
CTS
COA
Deeds
Conveyance Documents
COS
ADR
Deeds
Conveyance Documents
SWD
RSN
Deeds
Conveyance Documents
COS
RAS
Deeds
Conveyance Documents
DEW
WDW
Deeds
Conveyance Documents
DCO
Deeds
Conveyance Documents
DCO
AMD
Deeds
Conveyance Documents
DCO
ASN
Deeds
Conveyance Documents
DCO
COR
Deeds
Conveyance Documents
DCO
EAS
Deeds
Conveyance Documents
DCO
MOD
Deeds
Conveyance Documents
DCO
PAR
Deeds
Conveyance Documents
DCO
REL
Deeds
Conveyance Documents
DCO
RRR
Deeds
Conveyance Documents
DCO
RSN
Deeds
Conveyance Documents
DCO
RVC
Deeds
Conveyance Documents
DCO
TER
Deeds
Conveyance Documents
DCO
RAS
Deeds
Conveyance Documents
DCO
SAT
Deeds
Conveyance Documents
COS
AME
Deeds
Conveyance Documents
COS
QUI
Deeds
Conveyance Documents
DES
RAS
Deeds
Conveyance Documents
DET
EXT
Deeds
Conveyance Documents
DET
RAS
Deeds
Conveyance Documents
DET
TER
Deeds
Conveyance Documents
SWD
RAS
Category
Description
Doc Type
Doc Subtype
Delinquencies
Delinquency, Default & Related Sales Documents
AGR
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
ASE
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
CON
FCL
Delinquencies
Delinquency, Default & Related Sales Documents
COS
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
CPR
Delinquencies
Delinquency, Default & Related Sales Documents
CPR
AMD
Delinquencies
Delinquency, Default & Related Sales Documents
CPR
CAN
Delinquencies
Delinquency, Default & Related Sales Documents
CPR
REL
Delinquencies
Delinquency, Default & Related Sales Documents
CTF
RDM
Delinquencies
Delinquency, Default & Related Sales Documents
CTF
REI
Delinquencies
Delinquency, Default & Related Sales Documents
CTR
Delinquencies
Delinquency, Default & Related Sales Documents
CTS
Delinquencies
Delinquency, Default & Related Sales Documents
CTS
AMD
Delinquencies
Delinquency, Default & Related Sales Documents
CTS
ASN
Delinquencies
Delinquency, Default & Related Sales Documents
CTS
CAN
Delinquencies
Delinquency, Default & Related Sales Documents
CTS
COR
Delinquencies
Delinquency, Default & Related Sales Documents
CTS
RDM
Delinquencies
Delinquency, Default & Related Sales Documents
CTS
REL
Delinquencies
Delinquency, Default & Related Sales Documents
CTS
RRR
Delinquencies
Delinquency, Default & Related Sales Documents
CTS
RSN
Delinquencies
Delinquency, Default & Related Sales Documents
DDU
Delinquencies
Delinquency, Default & Related Sales Documents
DDU
AMD
Delinquencies
Delinquency, Default & Related Sales Documents
DDU
COR
Delinquencies
Delinquency, Default & Related Sales Documents
DDU
RRR
Delinquencies
Delinquency, Default & Related Sales Documents
DES
Delinquencies
Delinquency, Default & Related Sales Documents
DES
AMD
Delinquencies
Delinquency, Default & Related Sales Documents
DES
COR
Delinquencies
Delinquency, Default & Related Sales Documents
DES
RRR
Delinquencies
Delinquency, Default & Related Sales Documents
DET
Delinquencies
Delinquency, Default & Related Sales Documents
DET
COR
Delinquencies
Delinquency, Default & Related Sales Documents
DET
RRR
Delinquencies
Delinquency, Default & Related Sales Documents
DET
RSN
Delinquencies
Delinquency, Default & Related Sales Documents
DEU
Delinquencies
Delinquency, Default & Related Sales Documents
DEU
AMD
Delinquencies
Delinquency, Default & Related Sales Documents
DEU
COR
Delinquencies
Delinquency, Default & Related Sales Documents
DEU
RRR
Delinquencies
Delinquency, Default & Related Sales Documents
DEX
Delinquencies
Delinquency, Default & Related Sales Documents
DEX
COR
Delinquencies
Delinquency, Default & Related Sales Documents
DEX
RRR
Delinquencies
Delinquency, Default & Related Sales Documents
JDG
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
JDG
FCL
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
AMD
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
COR
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
DSM
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
EXP
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
PAR
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
REL
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
RML
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
RRR
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
RVC
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
SAT
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
SUP
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
TER
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
WDW
Delinquencies
Delinquency, Default & Related Sales Documents
LNN
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
LSE
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
MEJ
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
MTG
FCL
Delinquencies
Delinquency, Default & Related Sales Documents
NDF
Delinquencies
Delinquency, Default & Related Sales Documents
NDF
AMD
Delinquencies
Delinquency, Default & Related Sales Documents
NDF
RSN
Delinquencies
Delinquency, Default & Related Sales Documents
NOT
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
NOT
DLQ
Delinquencies
Delinquency, Default & Related Sales Documents
NOT
FCL
Delinquencies
Delinquency, Default & Related Sales Documents
NOT
RTS
Delinquencies
Delinquency, Default & Related Sales Documents
NOT
TSL
Delinquencies
Delinquency, Default & Related Sales Documents
ORD
FCL
Delinquencies
Delinquency, Default & Related Sales Documents
ORS
Delinquencies
Delinquency, Default & Related Sales Documents
ORS
AMD
Delinquencies
Delinquency, Default & Related Sales Documents
ORS
TER
Delinquencies
Delinquency, Default & Related Sales Documents
RRD
REL
Delinquencies
Delinquency, Default & Related Sales Documents
TDA
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
TDA
REI
Delinquencies
Delinquency, Default & Related Sales Documents
TDA
RQN
Delinquencies
Delinquency, Default & Related Sales Documents
TDA
STT
Delinquencies
Delinquency, Default & Related Sales Documents
TDD
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
TDD
FCL
Delinquencies
Delinquency, Default & Related Sales Documents
TDD
REI
Delinquencies
Delinquency, Default & Related Sales Documents
TDD
RQN
Delinquencies
Delinquency, Default & Related Sales Documents
TDD
STT
Delinquencies
Delinquency, Default & Related Sales Documents
TDR
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
TDR
REI
Delinquencies
Delinquency, Default & Related Sales Documents
TDR
RQN
Delinquencies
Delinquency, Default & Related Sales Documents
TDR
STT
Delinquencies
Delinquency, Default & Related Sales Documents
TSC
Delinquencies
Delinquency, Default & Related Sales Documents
TSC
RRR
Delinquencies
Delinquency, Default & Related Sales Documents
ASE
DLQ
Delinquencies
Delinquency, Default & Related Sales Documents
ASE
RND
Delinquencies
Delinquency, Default & Related Sales Documents
DDU
RSN
Delinquencies
Delinquency, Default & Related Sales Documents
TDD
TSC
Delinquencies
Delinquency, Default & Related Sales Documents
AFF
FOR
Delinquencies
Delinquency, Default & Related Sales Documents
AFF
POP
Delinquencies
Delinquency, Default & Related Sales Documents
AGR
FOR
Delinquencies
Delinquency, Default & Related Sales Documents
DDU
CAN
Delinquencies
Delinquency, Default & Related Sales Documents
DED
FCL
Delinquencies
Delinquency, Default & Related Sales Documents
JDG
FCR
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
CAN
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
DCH
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
QUI
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
RAD
Delinquencies
Delinquency, Default & Related Sales Documents
MTG
REI
Delinquencies
Delinquency, Default & Related Sales Documents
NOT
STT
Delinquencies
Delinquency, Default & Related Sales Documents
ORD
APS
Delinquencies
Delinquency, Default & Related Sales Documents
TDD
PAS
Delinquencies
Delinquency, Default & Related Sales Documents
TDD
POT
Delinquencies
Delinquency, Default & Related Sales Documents
TDD
RTS
Delinquencies
Delinquency, Default & Related Sales Documents
TDD
TSL
Delinquencies
Delinquency, Default & Related Sales Documents
TDD
TSM
Delinquencies
Delinquency, Default & Related Sales Documents
TDD
TSP
Delinquencies
Delinquency, Default & Related Sales Documents
RRD
ASN
Delinquencies
Delinquency, Default & Related Sales Documents
CTS
FCL
Delinquencies
Delinquency, Default & Related Sales Documents
NDF
CAN
Delinquencies
Delinquency, Default & Related Sales Documents
TSC
RDM
Delinquencies
Delinquency, Default & Related Sales Documents
NOT
TSM
Delinquencies
Delinquency, Default & Related Sales Documents
JDC
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
CTF
FCL
Delinquencies
Delinquency, Default & Related Sales Documents
JDG
DLQ
Delinquencies
Delinquency, Default & Related Sales Documents
NDF
REL
Delinquencies
Delinquency, Default & Related Sales Documents
NDF
RSR
Delinquencies
Delinquency, Default & Related Sales Documents
AGR
RQN
Delinquencies
Delinquency, Default & Related Sales Documents
ASE
STT
Delinquencies
Delinquency, Default & Related Sales Documents
LNN
DLQ
Delinquencies
Delinquency, Default & Related Sales Documents
NDF
RND
Delinquencies
Delinquency, Default & Related Sales Documents
TDD
DLQ
Delinquencies
Delinquency, Default & Related Sales Documents
ORD
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
TDR
TSL
Delinquencies
Delinquency, Default & Related Sales Documents
DED
FCR
Delinquencies
Delinquency, Default & Related Sales Documents
DES
EXP
Delinquencies
Delinquency, Default & Related Sales Documents
DES
RSN
Delinquencies
Delinquency, Default & Related Sales Documents
DEX
RSN
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
AME
Delinquencies
Delinquency, Default & Related Sales Documents
LIS
ERR
Delinquencies
Delinquency, Default & Related Sales Documents
ASE
TSL
Delinquencies
Delinquency, Default & Related Sales Documents
TDR
TSC
Delinquencies
Delinquency, Default & Related Sales Documents
TDR
TSM
Delinquencies
Delinquency, Default & Related Sales Documents
ASE
TSC
Delinquencies
Delinquency, Default & Related Sales Documents
BRF
Delinquencies
Delinquency, Default & Related Sales Documents
TDA
TSL
Delinquencies
Delinquency, Default & Related Sales Documents
TDD
POP
Delinquencies
Delinquency, Default & Related Sales Documents
ASE
RTS
Delinquencies
Delinquency, Default & Related Sales Documents
DED
RQN
Delinquencies
Delinquency, Default & Related Sales Documents
LSE
RQN
Delinquencies
Delinquency, Default & Related Sales Documents
TDR
RTS
Delinquencies
Delinquency, Default & Related Sales Documents
TDA
DLQ
Delinquencies
Delinquency, Default & Related Sales Documents
TDA
POP
Delinquencies
Delinquency, Default & Related Sales Documents
TDA
RTS
Delinquencies
Delinquency, Default & Related Sales Documents
TDA
TSC
Delinquencies
Delinquency, Default & Related Sales Documents
TDA
TSM
Delinquencies
Delinquency, Default & Related Sales Documents
JDF
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
JDF
FCL
Delinquencies
Delinquency, Default & Related Sales Documents
CIV
FCL
Delinquencies
Delinquency, Default & Related Sales Documents
CIV
TXA
Delinquencies
Delinquency, Default & Related Sales Documents
CTS
CAA
Delinquencies
Delinquency, Default & Related Sales Documents
LHA
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
LHA
DLQ
Delinquencies
Delinquency, Default & Related Sales Documents
LHA
RND
Delinquencies
Delinquency, Default & Related Sales Documents
LHA
RTS
Delinquencies
Delinquency, Default & Related Sales Documents
LHA
STT
Delinquencies
Delinquency, Default & Related Sales Documents
LHA
TSC
Delinquencies
Delinquency, Default & Related Sales Documents
LHA
TSL
Delinquencies
Delinquency, Default & Related Sales Documents
CTS
COA
Delinquencies
Delinquency, Default & Related Sales Documents
RCP
DFL
Delinquencies
Delinquency, Default & Related Sales Documents
AFF
TSL
Category
Description
Doc Type
Doc Subtype
Easements
Property Docs Easements
EAS
Easements
Property Docs Easements
EAS
ABD
Easements
Property Docs Easements
EAS
AMD
Easements
Property Docs Easements
EAS
COR
Easements
Property Docs Easements
EAS
MOD
Easements
Property Docs Easements
EAS
PAR
Easements
Property Docs Easements
EAS
PVA
Easements
Property Docs Easements
EAS
REL
Easements
Property Docs Easements
EAS
REV
Easements
Property Docs Easements
EAS
RLQ
Easements
Property Docs Easements
EAS
RRR
Easements
Property Docs Easements
EAS
RVC
Easements
Property Docs Easements
EAS
TER
Easements
Property Docs Easements
EAS
VAC
Easements
Property Docs Easements
PWA
Easements
Property Docs Easements
PWA
RRR
Easements
Property Docs Easements
ROW
Easements
Property Docs Easements
ROW
ABD
Easements
Property Docs Easements
ROW
AMD
Easements
Property Docs Easements
ROW
COR
Easements
Property Docs Easements
ROW
MOD
Easements
Property Docs Easements
ROW
PVA
Easements
Property Docs Easements
ROW
REV
Easements
Property Docs Easements
ROW
RLQ
Easements
Property Docs Easements
ROW
RRR
Easements
Property Docs Easements
ROW
RVC
Easements
Property Docs Easements
ROW
TER
Easements
Property Docs Easements
ROW
VAC
Easements
Property Docs Easements
DCE
Easements
Property Docs Easements
GRE
Easements
Property Docs Easements
GRE
AMD
Easements
Property Docs Easements
GRE
TER
Easements
Property Docs Easements
DCE
MOD
Easements
Property Docs Easements
GRE
SBD
Easements
Property Docs Easements
EAS
SBD
Easements
Property Docs Easements
EAS
PAA
Easements
Property Docs Easements
GRE
ASN
Easements
Property Docs Easements
EAS
ADD
Easements
Property Docs Easements
EAS
ADR
Easements
Property Docs Easements
EAS
ASA
Easements
Property Docs Easements
EAS
ASN
Easements
Property Docs Easements
EAS
CAN
Easements
Property Docs Easements
EAS
CDM
Easements
Property Docs Easements
EAS
DDC
Easements
Property Docs Easements
EAS
DIS
Easements
Property Docs Easements
EAS
DSC
Easements
Property Docs Easements
EAS
DTC
Easements
Property Docs Easements
EAS
ERR
Easements
Property Docs Easements
EAS
EXP
Easements
Property Docs Easements
EAS
EXT
Easements
Property Docs Easements
EAS
INT
Easements
Property Docs Easements
EAS
MNT
Easements
Property Docs Easements
EAS
NDV
Easements
Property Docs Easements
EAS
PAB
Easements
Property Docs Easements
EAS
PTT
Easements
Property Docs Easements
EAS
RAT
Easements
Property Docs Easements
EAS
RED
Easements
Property Docs Easements
EAS
REI
Easements
Property Docs Easements
EAS
RML
Easements
Property Docs Easements
EAS
ROA
Easements
Property Docs Easements
EAS
RST
Easements
Property Docs Easements
EAS
RUF
Easements
Property Docs Easements
EAS
SAT
Easements
Property Docs Easements
EAS
SCR
Easements
Property Docs Easements
EAS
SUP
Easements
Property Docs Easements
EAS
SVY
Easements
Property Docs Easements
EAS
TRF
Easements
Property Docs Easements
EAS
WAT
Easements
Property Docs Easements
EAS
WDW
Easements
Property Docs Easements
ROW
ADD
Easements
Property Docs Easements
ROW
ASA
Easements
Property Docs Easements
ROW
ASN
Easements
Property Docs Easements
ROW
DDC
Easements
Property Docs Easements
ROW
EAS
Easements
Property Docs Easements
ROW
MNT
Easements
Property Docs Easements
ROW
NAM
Easements
Property Docs Easements
ROW
PAA
Easements
Property Docs Easements
ROW
PAB
Easements
Property Docs Easements
ROW
PAR
Easements
Property Docs Easements
ROW
REL
Easements
Property Docs Easements
ROW
ROA
Easements
Property Docs Easements
ROW
SVY
Easements
Property Docs Easements
ROW
TRF
Easements
Property Docs Easements
GRE
RRR
Easements
Property Docs Easements
EAS
CLA
Easements
Property Docs Easements
PWA
CAN
Easements
Property Docs Easements
DCE
AMD
Easements
Property Docs Easements
DCE
SUP
Easements
Property Docs Easements
EAS
RNW
Easements
Property Docs Easements
GRE
ARS
Easements
Property Docs Easements
GRE
COR
Easements
Property Docs Easements
EAS
ARS
Easements
Property Docs Easements
DCE
ASN
Easements
Property Docs Easements
DCE
COA
Easements
Property Docs Easements
DCE
COR
Easements
Property Docs Easements
DCE
RRR
Easements
Property Docs Easements
GRE
COA
Easements
Property Docs Easements
GRE
REL
Easements
Property Docs Easements
GRE
SAT
Easements
Property Docs Easements
PWA
AMD
Easements
Property Docs Easements
PWA
COR
Easements
Property Docs Easements
PWA
TER
Easements
Property Docs Easements
ROW
COA
Easements
Property Docs Easements
EAS
RSN
Easements
Property Docs Easements
GRE
MOD
Easements
Property Docs Easements
PWA
REL
Easements
Property Docs Easements
PWA
ABD
Easements
Property Docs Easements
PWA
ADR
Easements
Property Docs Easements
PWA
ANM
Easements
Property Docs Easements
PWA
APS
Easements
Property Docs Easements
PWA
APT
Easements
Property Docs Easements
PWA
ASA
Easements
Property Docs Easements
PWA
ATY
Easements
Property Docs Easements
PWA
CDM
Easements
Property Docs Easements
PWA
CFS
Easements
Property Docs Easements
PWA
CMP
Easements
Property Docs Easements
PWA
CRD
Easements
Property Docs Easements
PWA
CVS
Easements
Property Docs Easements
PWA
DCH
Easements
Property Docs Easements
PWA
DDC
Easements
Property Docs Easements
PWA
DFL
Easements
Property Docs Easements
PWA
DSC
Easements
Property Docs Easements
PWA
DSM
Easements
Property Docs Easements
PWA
EST
Easements
Property Docs Easements
PWA
EXP
Easements
Property Docs Easements
PWA
EXT
Easements
Property Docs Easements
PWA
FCL
Easements
Property Docs Easements
PWA
FCR
Easements
Property Docs Easements
PWA
FNL
Easements
Property Docs Easements
PWA
FOR
Easements
Property Docs Easements
PWA
INA
Easements
Property Docs Easements
PWA
INT
Easements
Property Docs Easements
PWA
OSL
Easements
Property Docs Easements
PWA
POS
Easements
Property Docs Easements
PWA
QUI
Easements
Property Docs Easements
PWA
RAS
Easements
Property Docs Easements
PWA
RAT
Easements
Property Docs Easements
PWA
RCA
Easements
Property Docs Easements
PWA
REA
Easements
Property Docs Easements
PWA
REF
Easements
Property Docs Easements
PWA
REV
Easements
Property Docs Easements
PWA
RML
Easements
Property Docs Easements
PWA
RND
Easements
Property Docs Easements
PWA
RNW
Easements
Property Docs Easements
PWA
RST
Easements
Property Docs Easements
PWA
RSU
Easements
Property Docs Easements
PWA
SCC
Easements
Property Docs Easements
PWA
SET
Easements
Property Docs Easements
PWA
SRN
Easements
Property Docs Easements
PWA
STP
Easements
Property Docs Easements
PWA
STT
Easements
Property Docs Easements
PWA
SUP
Easements
Property Docs Easements
PWA
SZE
Easements
Property Docs Easements
PWA
TSL
Easements
Property Docs Easements
PWA
TXA
Easements
Property Docs Easements
PWA
WAT
Easements
Property Docs Easements
ROW
ADR
Easements
Property Docs Easements
ROW
ANM
Easements
Property Docs Easements
ROW
APS
Easements
Property Docs Easements
ROW
APT
Easements
Property Docs Easements
ROW
ATY
Easements
Property Docs Easements
ROW
CAN
Easements
Property Docs Easements
ROW
CDM
Easements
Property Docs Easements
ROW
CFS
Easements
Property Docs Easements
ROW
CMP
Easements
Property Docs Easements
ROW
CRD
Easements
Property Docs Easements
ROW
CVS
Easements
Property Docs Easements
ROW
DCH
Easements
Property Docs Easements
ROW
DSC
Easements
Property Docs Easements
ROW
DSM
Easements
Property Docs Easements
ROW
EST
Easements
Property Docs Easements
ROW
EXP
Easements
Property Docs Easements
ROW
FCL
Easements
Property Docs Easements
ROW
FCR
Easements
Property Docs Easements
ROW
FNL
Easements
Property Docs Easements
ROW
FOR
Easements
Property Docs Easements
ROW
INA
Easements
Property Docs Easements
ROW
INT
Easements
Property Docs Easements
ROW
OSL
Easements
Property Docs Easements
ROW
POS
Easements
Property Docs Easements
ROW
QUI
Easements
Property Docs Easements
ROW
RAS
Easements
Property Docs Easements
ROW
RAT
Easements
Property Docs Easements
ROW
RCA
Easements
Property Docs Easements
ROW
REA
Easements
Property Docs Easements
ROW
REF
Easements
Property Docs Easements
ROW
RML
Easements
Property Docs Easements
ROW
RND
Easements
Property Docs Easements
ROW
RNW
Easements
Property Docs Easements
ROW
RST
Easements
Property Docs Easements
ROW
RSU
Easements
Property Docs Easements
ROW
SCC
Easements
Property Docs Easements
ROW
SET
Easements
Property Docs Easements
ROW
SRN
Easements
Property Docs Easements
ROW
STP
Easements
Property Docs Easements
ROW
STT
Easements
Property Docs Easements
ROW
SUP
Easements
Property Docs Easements
ROW
SZE
Easements
Property Docs Easements
ROW
TSL
Easements
Property Docs Easements
ROW
TXA
Easements
Property Docs Easements
ROW
WAT
Easements
Property Docs Easements
DCE
RSN
Easements
Property Docs Easements
DCE
TER
Easements
Property Docs Easements
GRE
ABD
Easements
Property Docs Easements
DCE
CAN
Easements
Property Docs Easements
EAS
ACC
Easements
Property Docs Easements
EAS
DCH
Easements
Property Docs Easements
EAS
RQN
Easements
Property Docs Easements
GRE
RLQ
Easements
Property Docs Easements
EAS
ELM
Easements
Property Docs Easements
EAS
STP
Easements
Property Docs Easements
DCE
ASA
Easements
Property Docs Easements
EAS
PRA
Easements
Property Docs Easements
EAS
RAS
Easements
Property Docs Easements
GRE
ASA
Easements
Property Docs Easements
DCE
REL
Easements
Property Docs Easements
DCE
SAT
Easements
Property Docs Easements
PWA
ASN
Easements
Property Docs Easements
DCE
TRF
Easements
Property Docs Easements
EAS
ADA
Easements
Property Docs Easements
EAS
PRC
Easements
Property Docs Easements
EAS
REC
Easements
Property Docs Easements
EAS
STT
Easements
Property Docs Easements
ROW
REC
Easements
Property Docs Easements
ROW
RQN
Easements
Property Docs Easements
ROW
RSN
Easements
Property Docs Easements
EAS
AOA
Easements
Property Docs Easements
DCE
PAR
Easements
Property Docs Easements
PWA
MOD
Easements
Property Docs Easements
PWA
PAR
Easements
Property Docs Easements
PWA
SAT
Easements
Property Docs Easements
EAS
SFR
Easements
Property Docs Easements
ROW
SFR
Easements
Property Docs Easements
ROW
AOA
Easements
Property Docs Easements
EAS
TEA
Easements
Property Docs Easements
DCE
PTT
Easements
Property Docs Easements
EAS
RSM
Easements
Property Docs Easements
EAS
ASM
Easements
Property Docs Easements
ROW
SAT
Category
Description
Doc Type
Doc Subtype
FVD
Full Value Deeds
DEA
FVD
Full Value Deeds
DEA
RRR
FVD
Full Value Deeds
DEE
FVD
Full Value Deeds
DEE
COR
FVD
Full Value Deeds
DEE
RRR
FVD
Full Value Deeds
DEG
FVD
Full Value Deeds
DEG
AMD
FVD
Full Value Deeds
DEG
COR
FVD
Full Value Deeds
DEG
MOD
FVD
Full Value Deeds
DEG
REL
FVD
Full Value Deeds
DEG
RRR
FVD
Full Value Deeds
DEG
RVC
FVD
Full Value Deeds
DET
FVD
Full Value Deeds
DET
AMD
FVD
Full Value Deeds
DET
COR
FVD
Full Value Deeds
DET
REL
FVD
Full Value Deeds
DET
RRR
FVD
Full Value Deeds
DET
RSN
FVD
Full Value Deeds
DEW
FVD
Full Value Deeds
DEW
AMD
FVD
Full Value Deeds
DEW
COR
FVD
Full Value Deeds
DEW
MOD
FVD
Full Value Deeds
DEW
REL
FVD
Full Value Deeds
DEW
RRR
FVD
Full Value Deeds
SWD
FVD
Full Value Deeds
SWD
AMD
FVD
Full Value Deeds
SWD
COR
FVD
Full Value Deeds
SWD
MOD
FVD
Full Value Deeds
SWD
RRR
FVD
Full Value Deeds
DEG
RSN
FVD
Full Value Deeds
DED
GDN
FVD
Full Value Deeds
DEG
ASN
FVD
Full Value Deeds
DEG
TER
FVD
Full Value Deeds
DEW
LTD
FVD
Full Value Deeds
SWD
SBD
FVD
Full Value Deeds
SWD
RFR
FVD
Full Value Deeds
DET
SBD
FVD
Full Value Deeds
DEW
RSN
FVD
Full Value Deeds
SWD
LTD
Category
Description
Doc Type
Doc Subtype
IME
Involuntary Monetary Encumbrances
AFF
MLA
IME
Involuntary Monetary Encumbrances
AFF
MSR
IME
Involuntary Monetary Encumbrances
ANS
IME
Involuntary Monetary Encumbrances
ASE
IME
Involuntary Monetary Encumbrances
ASE
AMD
IME
Involuntary Monetary Encumbrances
ASE
ASN
IME
Involuntary Monetary Encumbrances
ASE
CAN
IME
Involuntary Monetary Encumbrances
ASE
DFL
IME
Involuntary Monetary Encumbrances
ASE
MOD
IME
Involuntary Monetary Encumbrances
ASE
PAR
IME
Involuntary Monetary Encumbrances
ASE
REL
IME
Involuntary Monetary Encumbrances
ASE
RRR
IME
Involuntary Monetary Encumbrances
ASE
RSN
IME
Involuntary Monetary Encumbrances
ASE
SAT
IME
Involuntary Monetary Encumbrances
ASE
TER
IME
Involuntary Monetary Encumbrances
BND
IME
Involuntary Monetary Encumbrances
BND
REL
IME
Involuntary Monetary Encumbrances
BND
RRR
IME
Involuntary Monetary Encumbrances
BVL
IME
Involuntary Monetary Encumbrances
CAE
IME
Involuntary Monetary Encumbrances
CJG
IME
Involuntary Monetary Encumbrances
CLM
IME
Involuntary Monetary Encumbrances
CLM
REL
IME
Involuntary Monetary Encumbrances
CLM
RRR
IME
Involuntary Monetary Encumbrances
CLM
SAT
IME
Involuntary Monetary Encumbrances
CRJ
IME
Involuntary Monetary Encumbrances
CRJ
AMD
IME
Involuntary Monetary Encumbrances
CRJ
DCH
IME
Involuntary Monetary Encumbrances
CRJ
EXT
IME
Involuntary Monetary Encumbrances
CRJ
REL
IME
Involuntary Monetary Encumbrances
CRJ
RRR
IME
Involuntary Monetary Encumbrances
CRJ
SAT
IME
Involuntary Monetary Encumbrances
CRJ
TER
IME
Involuntary Monetary Encumbrances
CTF
DCH
IME
Involuntary Monetary Encumbrances
CTF
PAY
IME
Involuntary Monetary Encumbrances
CTF
RDM
IME
Involuntary Monetary Encumbrances
CTR
IME
Involuntary Monetary Encumbrances
DCR
IME
Involuntary Monetary Encumbrances
DCR
AMD
IME
Involuntary Monetary Encumbrances
DCR
COR
IME
Involuntary Monetary Encumbrances
ELN
IME
Involuntary Monetary Encumbrances
ELN
AMD
IME
Involuntary Monetary Encumbrances
ELN
CAN
IME
Involuntary Monetary Encumbrances
ELN
CNT
IME
Involuntary Monetary Encumbrances
ELN
COR
IME
Involuntary Monetary Encumbrances
ELN
DCH
IME
Involuntary Monetary Encumbrances
ELN
MOD
IME
Involuntary Monetary Encumbrances
ELN
PAR
IME
Involuntary Monetary Encumbrances
ELN
REI
IME
Involuntary Monetary Encumbrances
ELN
REL
IME
Involuntary Monetary Encumbrances
ELN
RRR
IME
Involuntary Monetary Encumbrances
ELN
RVC
IME
Involuntary Monetary Encumbrances
ELN
SAT
IME
Involuntary Monetary Encumbrances
ELN
TER
IME
Involuntary Monetary Encumbrances
ETL
IME
Involuntary Monetary Encumbrances
ETL
AMD
IME
Involuntary Monetary Encumbrances
ETL
PAR
IME
Involuntary Monetary Encumbrances
ETL
REL
IME
Involuntary Monetary Encumbrances
ETL
SAT
IME
Involuntary Monetary Encumbrances
FAJ
IME
Involuntary Monetary Encumbrances
FAJ
AMD
IME
Involuntary Monetary Encumbrances
FAJ
PAR
IME
Involuntary Monetary Encumbrances
FAJ
REL
IME
Involuntary Monetary Encumbrances
FAJ
SBD
IME
Involuntary Monetary Encumbrances
FAJ
TER
IME
Involuntary Monetary Encumbrances
FTP
IME
Involuntary Monetary Encumbrances
JDC
IME
Involuntary Monetary Encumbrances
JDC
PAR
IME
Involuntary Monetary Encumbrances
JDC
REL
IME
Involuntary Monetary Encumbrances
JDG
IME
Involuntary Monetary Encumbrances
JDG
AMD
IME
Involuntary Monetary Encumbrances
JDG
ASN
IME
Involuntary Monetary Encumbrances
JDG
COR
IME
Involuntary Monetary Encumbrances
JDG
DFL
IME
Involuntary Monetary Encumbrances
JDG
DSM
IME
Involuntary Monetary Encumbrances
JDG
EXT
IME
Involuntary Monetary Encumbrances
JDG
FCL
IME
Involuntary Monetary Encumbrances
JDG
MOD
IME
Involuntary Monetary Encumbrances
JDG
PAR
IME
Involuntary Monetary Encumbrances
JDG
REI
IME
Involuntary Monetary Encumbrances
JDG
REL
IME
Involuntary Monetary Encumbrances
JDG
RRR
IME
Involuntary Monetary Encumbrances
JDG
SAT
IME
Involuntary Monetary Encumbrances
JDG
SBD
IME
Involuntary Monetary Encumbrances
JDG
TER
IME
Involuntary Monetary Encumbrances
JDG
VAC
IME
Involuntary Monetary Encumbrances
JDG
WDW
IME
Involuntary Monetary Encumbrances
JDJ
IME
Involuntary Monetary Encumbrances
JDJ
AMD
IME
Involuntary Monetary Encumbrances
JDJ
PAR
IME
Involuntary Monetary Encumbrances
JDJ
REL
IME
Involuntary Monetary Encumbrances
JDJ
RRR
IME
Involuntary Monetary Encumbrances
JDJ
SAT
IME
Involuntary Monetary Encumbrances
JDS
IME
Involuntary Monetary Encumbrances
LNC
IME
Involuntary Monetary Encumbrances
LNC
CAN
IME
Involuntary Monetary Encumbrances
LNC
EXT
IME
Involuntary Monetary Encumbrances
LNC
PAR
IME
Involuntary Monetary Encumbrances
LNC
REL
IME
Involuntary Monetary Encumbrances
LNC
RML
IME
Involuntary Monetary Encumbrances
LNC
RRR
IME
Involuntary Monetary Encumbrances
LNC
SAT
IME
Involuntary Monetary Encumbrances
LNC
WDW
IME
Involuntary Monetary Encumbrances
LND
IME
Involuntary Monetary Encumbrances
LND
REL
IME
Involuntary Monetary Encumbrances
LNF
IME
Involuntary Monetary Encumbrances
LNF
AMD
IME
Involuntary Monetary Encumbrances
LNF
EXT
IME
Involuntary Monetary Encumbrances
LNF
PAR
IME
Involuntary Monetary Encumbrances
LNF
REL
IME
Involuntary Monetary Encumbrances
LNF
WDW
IME
Involuntary Monetary Encumbrances
LNI
IME
Involuntary Monetary Encumbrances
LNI
REL
IME
Involuntary Monetary Encumbrances
LNN
IME
Involuntary Monetary Encumbrances
LNN
AMD
IME
Involuntary Monetary Encumbrances
LNN
ASN
IME
Involuntary Monetary Encumbrances
LNN
CAN
IME
Involuntary Monetary Encumbrances
LNN
COR
IME
Involuntary Monetary Encumbrances
LNN
DFL
IME
Involuntary Monetary Encumbrances
LNN
EXT
IME
Involuntary Monetary Encumbrances
LNN
HOA
IME
Involuntary Monetary Encumbrances
LNN
PAR
IME
Involuntary Monetary Encumbrances
LNN
REL
IME
Involuntary Monetary Encumbrances
LNN
RRR
IME
Involuntary Monetary Encumbrances
LNN
RSN
IME
Involuntary Monetary Encumbrances
LNN
SAT
IME
Involuntary Monetary Encumbrances
LNN
SBD
IME
Involuntary Monetary Encumbrances
LNN
TER
IME
Involuntary Monetary Encumbrances
LNN
WDW
IME
Involuntary Monetary Encumbrances
LNP
IME
Involuntary Monetary Encumbrances
LNP
REL
IME
Involuntary Monetary Encumbrances
LNR
IME
Involuntary Monetary Encumbrances
LNR
REL
IME
Involuntary Monetary Encumbrances
LNR
RML
IME
Involuntary Monetary Encumbrances
LNR
SAT
IME
Involuntary Monetary Encumbrances
LNR
WDW
IME
Involuntary Monetary Encumbrances
LNS
IME
Involuntary Monetary Encumbrances
LNS
AMD
IME
Involuntary Monetary Encumbrances
LNS
EXT
IME
Involuntary Monetary Encumbrances
LNS
REL
IME
Involuntary Monetary Encumbrances
LNS
RML
IME
Involuntary Monetary Encumbrances
LNS
SAT
IME
Involuntary Monetary Encumbrances
LNS
WDW
IME
Involuntary Monetary Encumbrances
LNU
IME
Involuntary Monetary Encumbrances
LNU
PAR
IME
Involuntary Monetary Encumbrances
LNU
REL
IME
Involuntary Monetary Encumbrances
LNU
WDW
IME
Involuntary Monetary Encumbrances
LNW
IME
Involuntary Monetary Encumbrances
LNW
REL
IME
Involuntary Monetary Encumbrances
LNW
SAT
IME
Involuntary Monetary Encumbrances
LNY
IME
Involuntary Monetary Encumbrances
LNY
AMD
IME
Involuntary Monetary Encumbrances
LNY
ASN
IME
Involuntary Monetary Encumbrances
LNY
COR
IME
Involuntary Monetary Encumbrances
LNY
PAR
IME
Involuntary Monetary Encumbrances
LNY
REL
IME
Involuntary Monetary Encumbrances
LNY
RRR
IME
Involuntary Monetary Encumbrances
LNY
SAT
IME
Involuntary Monetary Encumbrances
LNY
SBD
IME
Involuntary Monetary Encumbrances
LVY
IME
Involuntary Monetary Encumbrances
LVY
AMD
IME
Involuntary Monetary Encumbrances
LVY
REL
IME
Involuntary Monetary Encumbrances
MEJ
IME
Involuntary Monetary Encumbrances
MEJ
AMD
IME
Involuntary Monetary Encumbrances
MEJ
ASN
IME
Involuntary Monetary Encumbrances
MEJ
COR
IME
Involuntary Monetary Encumbrances
MEJ
DFL
IME
Involuntary Monetary Encumbrances
MEJ
PAR
IME
Involuntary Monetary Encumbrances
MEJ
REL
IME
Involuntary Monetary Encumbrances
MEJ
REV
IME
Involuntary Monetary Encumbrances
MEJ
RRR
IME
Involuntary Monetary Encumbrances
MEJ
RVC
IME
Involuntary Monetary Encumbrances
MEJ
SAT
IME
Involuntary Monetary Encumbrances
MEJ
SBD
IME
Involuntary Monetary Encumbrances
MLN
IME
Involuntary Monetary Encumbrances
MLN
AMD
IME
Involuntary Monetary Encumbrances
MLN
ASN
IME
Involuntary Monetary Encumbrances
MLN
CAN
IME
Involuntary Monetary Encumbrances
MLN
COR
IME
Involuntary Monetary Encumbrances
MLN
EXT
IME
Involuntary Monetary Encumbrances
MLN
PAR
IME
Involuntary Monetary Encumbrances
MLN
REL
IME
Involuntary Monetary Encumbrances
MLN
RRR
IME
Involuntary Monetary Encumbrances
MLN
SAT
IME
Involuntary Monetary Encumbrances
MLN
TER
IME
Involuntary Monetary Encumbrances
MTG
FCL
IME
Involuntary Monetary Encumbrances
NOL
IME
Involuntary Monetary Encumbrances
NOL
ASN
IME
Involuntary Monetary Encumbrances
NOL
PAR
IME
Involuntary Monetary Encumbrances
NOL
REL
IME
Involuntary Monetary Encumbrances
NOL
RRR
IME
Involuntary Monetary Encumbrances
NOL
SBD
IME
Involuntary Monetary Encumbrances
NOT
ATT
IME
Involuntary Monetary Encumbrances
PPT
IME
Involuntary Monetary Encumbrances
SAL
IME
Involuntary Monetary Encumbrances
SAL
REL
IME
Involuntary Monetary Encumbrances
SAL
RRR
IME
Involuntary Monetary Encumbrances
TSC
IME
Involuntary Monetary Encumbrances
WAR
IME
Involuntary Monetary Encumbrances
WAR
PAR
IME
Involuntary Monetary Encumbrances
WAR
REL
IME
Involuntary Monetary Encumbrances
WRE
IME
Involuntary Monetary Encumbrances
WRE
COR
IME
Involuntary Monetary Encumbrances
WRE
REL
IME
Involuntary Monetary Encumbrances
WRI
IME
Involuntary Monetary Encumbrances
WRI
AMD
IME
Involuntary Monetary Encumbrances
WRI
PAR
IME
Involuntary Monetary Encumbrances
WRI
REL
IME
Involuntary Monetary Encumbrances
WRI
RRR
IME
Involuntary Monetary Encumbrances
WRI
WDW
IME
Involuntary Monetary Encumbrances
JDG
RNW
IME
Involuntary Monetary Encumbrances
LNH
IME
Involuntary Monetary Encumbrances
JDG
STP
IME
Involuntary Monetary Encumbrances
ASE
DLQ
IME
Involuntary Monetary Encumbrances
ASE
RND
IME
Involuntary Monetary Encumbrances
JDG
EXP
IME
Involuntary Monetary Encumbrances
NOT
TXA
IME
Involuntary Monetary Encumbrances
LNF
REF
IME
Involuntary Monetary Encumbrances
ASE
CLA
IME
Involuntary Monetary Encumbrances
JDC
SBD
IME
Involuntary Monetary Encumbrances
LNS
SBD
IME
Involuntary Monetary Encumbrances
LNF
SBD
IME
Involuntary Monetary Encumbrances
AFF
ASN
IME
Involuntary Monetary Encumbrances
AFF
PAR
IME
Involuntary Monetary Encumbrances
AFF
REL
IME
Involuntary Monetary Encumbrances
AFF
SAT
IME
Involuntary Monetary Encumbrances
ANS
REL
IME
Involuntary Monetary Encumbrances
ASE
RML
IME
Involuntary Monetary Encumbrances
CRJ
DSM
IME
Involuntary Monetary Encumbrances
CRJ
VAC
IME
Involuntary Monetary Encumbrances
CTF
WAT
IME
Involuntary Monetary Encumbrances
JDC
AMD
IME
Involuntary Monetary Encumbrances
JDC
RNW
IME
Involuntary Monetary Encumbrances
JDG
ANM
IME
Involuntary Monetary Encumbrances
JDG
CAN
IME
Involuntary Monetary Encumbrances
JDG
DCH
IME
Involuntary Monetary Encumbrances
JDG
FCR
IME
Involuntary Monetary Encumbrances
JDG
FNL
IME
Involuntary Monetary Encumbrances
JDG
FOR
IME
Involuntary Monetary Encumbrances
JDG
PAA
IME
Involuntary Monetary Encumbrances
JDG
POS
IME
Involuntary Monetary Encumbrances
JDG
RAS
IME
Involuntary Monetary Encumbrances
JDG
REA
IME
Involuntary Monetary Encumbrances
JDG
REF
IME
Involuntary Monetary Encumbrances
JDG
RSN
IME
Involuntary Monetary Encumbrances
JDG
SET
IME
Involuntary Monetary Encumbrances
JDG
SUP
IME
Involuntary Monetary Encumbrances
LNF
COR
IME
Involuntary Monetary Encumbrances
LNF
DCH
IME
Involuntary Monetary Encumbrances
LNF
NAT
IME
Involuntary Monetary Encumbrances
LNF
RVC
IME
Involuntary Monetary Encumbrances
LNF
RVR
IME
Involuntary Monetary Encumbrances
LNI
SBD
IME
Involuntary Monetary Encumbrances
LNN
ATY
IME
Involuntary Monetary Encumbrances
LNN
DCH
IME
Involuntary Monetary Encumbrances
LNN
DSC
IME
Involuntary Monetary Encumbrances
LNN
RML
IME
Involuntary Monetary Encumbrances
LNN
RNW
IME
Involuntary Monetary Encumbrances
LNN
RVC
IME
Involuntary Monetary Encumbrances
LNN
TRF
IME
Involuntary Monetary Encumbrances
LNN
WAT
IME
Involuntary Monetary Encumbrances
LNS
PAR
IME
Involuntary Monetary Encumbrances
LNS
RNW
IME
Involuntary Monetary Encumbrances
LVY
VAC
IME
Involuntary Monetary Encumbrances
MLN
AMR
IME
Involuntary Monetary Encumbrances
MLN
BRL
IME
Involuntary Monetary Encumbrances
MLN
DCH
IME
Involuntary Monetary Encumbrances
MLN
SBD
IME
Involuntary Monetary Encumbrances
MLN
SUP
IME
Involuntary Monetary Encumbrances
WRI
ATT
IME
Involuntary Monetary Encumbrances
JDC
SUB
IME
Involuntary Monetary Encumbrances
MLN
WDW
IME
Involuntary Monetary Encumbrances
MLN
RAD
IME
Involuntary Monetary Encumbrances
BND
AMD
IME
Involuntary Monetary Encumbrances
CLM
ASN
IME
Involuntary Monetary Encumbrances
LNH
SAT
IME
Involuntary Monetary Encumbrances
LNN
STP
IME
Involuntary Monetary Encumbrances
LNH
REL
IME
Involuntary Monetary Encumbrances
TSC
RDM
IME
Involuntary Monetary Encumbrances
JDC
DFL
IME
Involuntary Monetary Encumbrances
JDC
SAT
IME
Involuntary Monetary Encumbrances
JDG
AMR
IME
Involuntary Monetary Encumbrances
JDG
DLQ
IME
Involuntary Monetary Encumbrances
CLM
AMD
IME
Involuntary Monetary Encumbrances
ASE
ADR
IME
Involuntary Monetary Encumbrances
ASE
STT
IME
Involuntary Monetary Encumbrances
DCR
DFL
IME
Involuntary Monetary Encumbrances
DCR
DSC
IME
Involuntary Monetary Encumbrances
JDC
COR
IME
Involuntary Monetary Encumbrances
JDC
STP
IME
Involuntary Monetary Encumbrances
JDG
PVA
IME
Involuntary Monetary Encumbrances
JDG
SUB
IME
Involuntary Monetary Encumbrances
LNC
AMD
IME
Involuntary Monetary Encumbrances
LNC
REF
IME
Involuntary Monetary Encumbrances
LNC
RNW
IME
Involuntary Monetary Encumbrances
LNH
PAR
IME
Involuntary Monetary Encumbrances
LNN
DLQ
IME
Involuntary Monetary Encumbrances
LID
IME
Involuntary Monetary Encumbrances
ANS
AMD
IME
Involuntary Monetary Encumbrances
ANS
COR
IME
Involuntary Monetary Encumbrances
ASE
COR
IME
Involuntary Monetary Encumbrances
BVL
REL
IME
Involuntary Monetary Encumbrances
CLM
COR
IME
Involuntary Monetary Encumbrances
ETL
DCH
IME
Involuntary Monetary Encumbrances
LNH
AMD
IME
Involuntary Monetary Encumbrances
LNH
COR
IME
Involuntary Monetary Encumbrances
LNI
ASN
IME
Involuntary Monetary Encumbrances
LNN
PAA
IME
Involuntary Monetary Encumbrances
LNR
DCH
IME
Involuntary Monetary Encumbrances
LNW
COR
IME
Involuntary Monetary Encumbrances
SAL
COR
IME
Involuntary Monetary Encumbrances
SAL
DCH
IME
Involuntary Monetary Encumbrances
SAL
SAT
IME
Involuntary Monetary Encumbrances
WAR
SAT
IME
Involuntary Monetary Encumbrances
WRE
ASN
IME
Involuntary Monetary Encumbrances
CRI
IME
Involuntary Monetary Encumbrances
ASE
RAD
IME
Involuntary Monetary Encumbrances
CRJ
AMR
IME
Involuntary Monetary Encumbrances
ASE
DCH
IME
Involuntary Monetary Encumbrances
JDC
CAN
IME
Involuntary Monetary Encumbrances
ETL
TRF
IME
Involuntary Monetary Encumbrances
LNC
DCH
IME
Involuntary Monetary Encumbrances
LNF
WAT
IME
Involuntary Monetary Encumbrances
LNH
CAN
IME
Involuntary Monetary Encumbrances
MLN
RAS
IME
Involuntary Monetary Encumbrances
MLN
RSR
IME
Involuntary Monetary Encumbrances
MLN
RSU
IME
Involuntary Monetary Encumbrances
WAR
RNW
IME
Involuntary Monetary Encumbrances
ASE
TSL
IME
Involuntary Monetary Encumbrances
ASE
RSR
IME
Involuntary Monetary Encumbrances
ASE
TSC
IME
Involuntary Monetary Encumbrances
CAE
REL
IME
Involuntary Monetary Encumbrances
ASE
REM
IME
Involuntary Monetary Encumbrances
LNN
ASM
IME
Involuntary Monetary Encumbrances
CEL
IME
Involuntary Monetary Encumbrances
CEL
CAN
IME
Involuntary Monetary Encumbrances
CEL
REL
IME
Involuntary Monetary Encumbrances
CEL
SAT
IME
Involuntary Monetary Encumbrances
CEL
TER
IME
Involuntary Monetary Encumbrances
ASE
RTS
IME
Involuntary Monetary Encumbrances
FED
IME
Involuntary Monetary Encumbrances
ASE
SPC
IME
Involuntary Monetary Encumbrances
ITL
IME
Involuntary Monetary Encumbrances
ITL
REL
IME
Involuntary Monetary Encumbrances
LNO
IME
Involuntary Monetary Encumbrances
LNO
REL
IME
Involuntary Monetary Encumbrances
LNW
RNW
IME
Involuntary Monetary Encumbrances
JDF
IME
Involuntary Monetary Encumbrances
JDF
CAN
IME
Involuntary Monetary Encumbrances
JDF
DFL
IME
Involuntary Monetary Encumbrances
JDF
FCL
IME
Involuntary Monetary Encumbrances
JDF
REL
IME
Involuntary Monetary Encumbrances
JDF
STP
IME
Involuntary Monetary Encumbrances
JDF
WDW
IME
Involuntary Monetary Encumbrances
CIV
TXA
IME
Involuntary Monetary Encumbrances
CRI
AMD
IME
Involuntary Monetary Encumbrances
CRI
DCH
IME
Involuntary Monetary Encumbrances
CRI
SAT
IME
Involuntary Monetary Encumbrances
ASE
SUP
IME
Involuntary Monetary Encumbrances
LNF
RAD
IME
Involuntary Monetary Encumbrances
CJG
SMI
IME
Involuntary Monetary Encumbrances
CRJ
SMI
IME
Involuntary Monetary Encumbrances
FAJ
SMI
IME
Involuntary Monetary Encumbrances
FTP
SMI
IME
Involuntary Monetary Encumbrances
JDC
SMI
IME
Involuntary Monetary Encumbrances
JDG
SMI
IME
Involuntary Monetary Encumbrances
JDJ
SMI
IME
Involuntary Monetary Encumbrances
JDS
SMI
IME
Involuntary Monetary Encumbrances
MEJ
SMI
IME
Involuntary Monetary Encumbrances
JDF
SMI
IME
Involuntary Monetary Encumbrances
FTL
IME
Involuntary Monetary Encumbrances
HLF
IME
Involuntary Monetary Encumbrances
MLF
IME
Involuntary Monetary Encumbrances
NLF
IME
Involuntary Monetary Encumbrances
LDC
IME
Involuntary Monetary Encumbrances
LHA
IME
Involuntary Monetary Encumbrances
LHA
ADR
IME
Involuntary Monetary Encumbrances
LHA
AMD
IME
Involuntary Monetary Encumbrances
LHA
ASN
IME
Involuntary Monetary Encumbrances
LHA
CAN
IME
Involuntary Monetary Encumbrances
LHA
CLA
IME
Involuntary Monetary Encumbrances
LHA
COR
IME
Involuntary Monetary Encumbrances
LHA
DFL
IME
Involuntary Monetary Encumbrances
LHA
DLQ
IME
Involuntary Monetary Encumbrances
LHA
EXT
IME
Involuntary Monetary Encumbrances
LHA
MOD
IME
Involuntary Monetary Encumbrances
LHA
PAA
IME
Involuntary Monetary Encumbrances
LHA
PAR
IME
Involuntary Monetary Encumbrances
LHA
RAD
IME
Involuntary Monetary Encumbrances
LHA
RAS
IME
Involuntary Monetary Encumbrances
LHA
REL
IME
Involuntary Monetary Encumbrances
LHA
REM
IME
Involuntary Monetary Encumbrances
LHA
RML
IME
Involuntary Monetary Encumbrances
LHA
RND
IME
Involuntary Monetary Encumbrances
LHA
RNW
IME
Involuntary Monetary Encumbrances
LHA
RRR
IME
Involuntary Monetary Encumbrances
LHA
RSN
IME
Involuntary Monetary Encumbrances
LHA
RSR
IME
Involuntary Monetary Encumbrances
LHA
RTS
IME
Involuntary Monetary Encumbrances
LHA
RVC
IME
Involuntary Monetary Encumbrances
LHA
SAT
IME
Involuntary Monetary Encumbrances
LHA
SBD
IME
Involuntary Monetary Encumbrances
LHA
STT
IME
Involuntary Monetary Encumbrances
LHA
TER
IME
Involuntary Monetary Encumbrances
LHA
TSC
IME
Involuntary Monetary Encumbrances
LHA
TSL
IME
Involuntary Monetary Encumbrances
JDF
DSM
IME
Involuntary Monetary Encumbrances
JDF
PAR
IME
Involuntary Monetary Encumbrances
JDF
REV
IME
Involuntary Monetary Encumbrances
JDF
RNW
IME
Involuntary Monetary Encumbrances
JDF
SAT
IME
Involuntary Monetary Encumbrances
JDF
SUP
IME
Involuntary Monetary Encumbrances
WAR
SBD
IME
Involuntary Monetary Encumbrances
AFF
TSL
IME
Involuntary Monetary Encumbrances
LNO
PAR
IME
Involuntary Monetary Encumbrances
JDF
MOD
IME
Involuntary Monetary Encumbrances
LCF
IME
Involuntary Monetary Encumbrances
CLF
IME
Involuntary Monetary Encumbrances
WAF
IME
Involuntary Monetary Encumbrances
ANS
PAR
Category
Description
Doc Type
Doc Subtype
JG/LN
Judgment and Lien Documents
ASE
JG/LN
Judgment and Lien Documents
ASE
AMD
JG/LN
Judgment and Lien Documents
ASE
ASM
JG/LN
Judgment and Lien Documents
ASE
ASN
JG/LN
Judgment and Lien Documents
ASE
CAN
JG/LN
Judgment and Lien Documents
ASE
DFL
JG/LN
Judgment and Lien Documents
ASE
MOD
JG/LN
Judgment and Lien Documents
ASE
PAR
JG/LN
Judgment and Lien Documents
ASE
REL
JG/LN
Judgment and Lien Documents
ASE
RRR
JG/LN
Judgment and Lien Documents
ASE
RSN
JG/LN
Judgment and Lien Documents
ASE
SAT
JG/LN
Judgment and Lien Documents
ASE
TER
JG/LN
Judgment and Lien Documents
ASE
WDW
JG/LN
Judgment and Lien Documents
BND
JG/LN
Judgment and Lien Documents
BND
MLA
JG/LN
Judgment and Lien Documents
BND
PAR
JG/LN
Judgment and Lien Documents
BND
REL
JG/LN
Judgment and Lien Documents
BND
RRR
JG/LN
Judgment and Lien Documents
BRA
JG/LN
Judgment and Lien Documents
CAE
JG/LN
Judgment and Lien Documents
CJG
JG/LN
Judgment and Lien Documents
CLM
JG/LN
Judgment and Lien Documents
CLM
CNT
JG/LN
Judgment and Lien Documents
CLM
DSM
JG/LN
Judgment and Lien Documents
CLM
EXT
JG/LN
Judgment and Lien Documents
CLM
FCL
JG/LN
Judgment and Lien Documents
CLM
MOD
JG/LN
Judgment and Lien Documents
CLM
PAR
JG/LN
Judgment and Lien Documents
CLM
REL
JG/LN
Judgment and Lien Documents
CLM
RML
JG/LN
Judgment and Lien Documents
CLM
RRR
JG/LN
Judgment and Lien Documents
CLM
SAT
JG/LN
Judgment and Lien Documents
CLM
TER
JG/LN
Judgment and Lien Documents
CLM
WDW
JG/LN
Judgment and Lien Documents
CRB
JG/LN
Judgment and Lien Documents
CRB
MOD
JG/LN
Judgment and Lien Documents
CRB
PAR
JG/LN
Judgment and Lien Documents
CRB
REL
JG/LN
Judgment and Lien Documents
CRB
RRR
JG/LN
Judgment and Lien Documents
CRB
TER
JG/LN
Judgment and Lien Documents
CRJ
JG/LN
Judgment and Lien Documents
CRJ
AMD
JG/LN
Judgment and Lien Documents
CRJ
ASN
JG/LN
Judgment and Lien Documents
CRJ
CNT
JG/LN
Judgment and Lien Documents
CRJ
DCH
JG/LN
Judgment and Lien Documents
CRJ
EXT
JG/LN
Judgment and Lien Documents
CRJ
PAR
JG/LN
Judgment and Lien Documents
CRJ
REL
JG/LN
Judgment and Lien Documents
CRJ
RRR
JG/LN
Judgment and Lien Documents
CRJ
SAT
JG/LN
Judgment and Lien Documents
CRJ
TER
JG/LN
Judgment and Lien Documents
ETL
JG/LN
Judgment and Lien Documents
ETL
AMD
JG/LN
Judgment and Lien Documents
ETL
ASN
JG/LN
Judgment and Lien Documents
ETL
CAN
JG/LN
Judgment and Lien Documents
ETL
CNT
JG/LN
Judgment and Lien Documents
ETL
COR
JG/LN
Judgment and Lien Documents
ETL
EXT
JG/LN
Judgment and Lien Documents
ETL
PAR
JG/LN
Judgment and Lien Documents
ETL
REL
JG/LN
Judgment and Lien Documents
ETL
REV
JG/LN
Judgment and Lien Documents
ETL
RRR
JG/LN
Judgment and Lien Documents
ETL
SAT
JG/LN
Judgment and Lien Documents
ETL
SBD
JG/LN
Judgment and Lien Documents
ETL
TER
JG/LN
Judgment and Lien Documents
FAJ
JG/LN
Judgment and Lien Documents
FAJ
AMD
JG/LN
Judgment and Lien Documents
FAJ
ASN
JG/LN
Judgment and Lien Documents
FAJ
CNT
JG/LN
Judgment and Lien Documents
FAJ
COR
JG/LN
Judgment and Lien Documents
FAJ
DFL
JG/LN
Judgment and Lien Documents
FAJ
DSM
JG/LN
Judgment and Lien Documents
FAJ
EXT
JG/LN
Judgment and Lien Documents
FAJ
FCL
JG/LN
Judgment and Lien Documents
FAJ
MOD
JG/LN
Judgment and Lien Documents
FAJ
PAR
JG/LN
Judgment and Lien Documents
FAJ
REI
JG/LN
Judgment and Lien Documents
FAJ
REL
JG/LN
Judgment and Lien Documents
FAJ
REV
JG/LN
Judgment and Lien Documents
FAJ
RRR
JG/LN
Judgment and Lien Documents
FAJ
RVC
JG/LN
Judgment and Lien Documents
FAJ
SAT
JG/LN
Judgment and Lien Documents
FAJ
SBD
JG/LN
Judgment and Lien Documents
FAJ
TER
JG/LN
Judgment and Lien Documents
FAJ
VAC
JG/LN
Judgment and Lien Documents
FAJ
WDW
JG/LN
Judgment and Lien Documents
FTP
JG/LN
Judgment and Lien Documents
JDC
JG/LN
Judgment and Lien Documents
JDC
PAR
JG/LN
Judgment and Lien Documents
JDC
REL
JG/LN
Judgment and Lien Documents
JDC
RRR
JG/LN
Judgment and Lien Documents
JDG
JG/LN
Judgment and Lien Documents
JDG
AMD
JG/LN
Judgment and Lien Documents
JDG
ASN
JG/LN
Judgment and Lien Documents
JDG
CNT
JG/LN
Judgment and Lien Documents
JDG
COR
JG/LN
Judgment and Lien Documents
JDG
DFL
JG/LN
Judgment and Lien Documents
JDG
DSM
JG/LN
Judgment and Lien Documents
JDG
EXT
JG/LN
Judgment and Lien Documents
JDG
FCL
JG/LN
Judgment and Lien Documents
JDG
MOD
JG/LN
Judgment and Lien Documents
JDG
PAR
JG/LN
Judgment and Lien Documents
JDG
REI
JG/LN
Judgment and Lien Documents
JDG
REL
JG/LN
Judgment and Lien Documents
JDG
REV
JG/LN
Judgment and Lien Documents
JDG
RRR
JG/LN
Judgment and Lien Documents
JDG
RVC
JG/LN
Judgment and Lien Documents
JDG
SAT
JG/LN
Judgment and Lien Documents
JDG
SBD
JG/LN
Judgment and Lien Documents
JDG
TER
JG/LN
Judgment and Lien Documents
JDG
VAC
JG/LN
Judgment and Lien Documents
JDG
WDW
JG/LN
Judgment and Lien Documents
JDJ
JG/LN
Judgment and Lien Documents
JDJ
AMD
JG/LN
Judgment and Lien Documents
JDJ
ASN
JG/LN
Judgment and Lien Documents
JDJ
CNT
JG/LN
Judgment and Lien Documents
JDJ
COR
JG/LN
Judgment and Lien Documents
JDJ
DFL
JG/LN
Judgment and Lien Documents
JDJ
DSM
JG/LN
Judgment and Lien Documents
JDJ
EXT
JG/LN
Judgment and Lien Documents
JDJ
FCL
JG/LN
Judgment and Lien Documents
JDJ
MOD
JG/LN
Judgment and Lien Documents
JDJ
PAR
JG/LN
Judgment and Lien Documents
JDJ
REI
JG/LN
Judgment and Lien Documents
JDJ
REL
JG/LN
Judgment and Lien Documents
JDJ
REV
JG/LN
Judgment and Lien Documents
JDJ
RRR
JG/LN
Judgment and Lien Documents
JDJ
RVC
JG/LN
Judgment and Lien Documents
JDJ
SAT
JG/LN
Judgment and Lien Documents
JDJ
SBD
JG/LN
Judgment and Lien Documents
JDJ
TER
JG/LN
Judgment and Lien Documents
JDJ
VAC
JG/LN
Judgment and Lien Documents
JDJ
WDW
JG/LN
Judgment and Lien Documents
JDS
JG/LN
Judgment and Lien Documents
JDS
AMD
JG/LN
Judgment and Lien Documents
JDS
ASN
JG/LN
Judgment and Lien Documents
JDS
CNT
JG/LN
Judgment and Lien Documents
JDS
COR
JG/LN
Judgment and Lien Documents
JDS
DFL
JG/LN
Judgment and Lien Documents
JDS
DSM
JG/LN
Judgment and Lien Documents
JDS
EXT
JG/LN
Judgment and Lien Documents
JDS
FCL
JG/LN
Judgment and Lien Documents
JDS
MOD
JG/LN
Judgment and Lien Documents
JDS
PAR
JG/LN
Judgment and Lien Documents
JDS
REI
JG/LN
Judgment and Lien Documents
JDS
REL
JG/LN
Judgment and Lien Documents
JDS
REV
JG/LN
Judgment and Lien Documents
JDS
RRR
JG/LN
Judgment and Lien Documents
JDS
RVC
JG/LN
Judgment and Lien Documents
JDS
SAT
JG/LN
Judgment and Lien Documents
JDS
SBD
JG/LN
Judgment and Lien Documents
JDS
TER
JG/LN
Judgment and Lien Documents
JDS
VAC
JG/LN
Judgment and Lien Documents
JDS
WDW
JG/LN
Judgment and Lien Documents
LNC
JG/LN
Judgment and Lien Documents
LNC
CAN
JG/LN
Judgment and Lien Documents
LNC
CNT
JG/LN
Judgment and Lien Documents
LNC
EXT
JG/LN
Judgment and Lien Documents
LNC
MOD
JG/LN
Judgment and Lien Documents
LNC
PAR
JG/LN
Judgment and Lien Documents
LNC
REL
JG/LN
Judgment and Lien Documents
LNC
RML
JG/LN
Judgment and Lien Documents
LNC
RRR
JG/LN
Judgment and Lien Documents
LNC
SAT
JG/LN
Judgment and Lien Documents
LNC
TER
JG/LN
Judgment and Lien Documents
LNC
WDW
JG/LN
Judgment and Lien Documents
LND
JG/LN
Judgment and Lien Documents
LND
AMD
JG/LN
Judgment and Lien Documents
LND
ASN
JG/LN
Judgment and Lien Documents
LND
CAN
JG/LN
Judgment and Lien Documents
LND
CNT
JG/LN
Judgment and Lien Documents
LND
COR
JG/LN
Judgment and Lien Documents
LND
EXT
JG/LN
Judgment and Lien Documents
LND
FCL
JG/LN
Judgment and Lien Documents
LND
MOD
JG/LN
Judgment and Lien Documents
LND
PAR
JG/LN
Judgment and Lien Documents
LND
REA
JG/LN
Judgment and Lien Documents
LND
REI
JG/LN
Judgment and Lien Documents
LND
REL
JG/LN
Judgment and Lien Documents
LND
REV
JG/LN
Judgment and Lien Documents
LND
RML
JG/LN
Judgment and Lien Documents
LND
RRR
JG/LN
Judgment and Lien Documents
LND
SAT
JG/LN
Judgment and Lien Documents
LND
TER
JG/LN
Judgment and Lien Documents
LNE
JG/LN
Judgment and Lien Documents
LNE
AMD
JG/LN
Judgment and Lien Documents
LNE
MOD
JG/LN
Judgment and Lien Documents
LNE
PAR
JG/LN
Judgment and Lien Documents
LNE
REL
JG/LN
Judgment and Lien Documents
LNE
RRR
JG/LN
Judgment and Lien Documents
LNE
TER
JG/LN
Judgment and Lien Documents
LNF
JG/LN
Judgment and Lien Documents
LNF
AMD
JG/LN
Judgment and Lien Documents
LNF
CAN
JG/LN
Judgment and Lien Documents
LNF
CNT
JG/LN
Judgment and Lien Documents
LNF
EXT
JG/LN
Judgment and Lien Documents
LNF
MOD
JG/LN
Judgment and Lien Documents
LNF
PAR
JG/LN
Judgment and Lien Documents
LNF
REI
JG/LN
Judgment and Lien Documents
LNF
REL
JG/LN
Judgment and Lien Documents
LNF
RML
JG/LN
Judgment and Lien Documents
LNF
RRR
JG/LN
Judgment and Lien Documents
LNF
SAT
JG/LN
Judgment and Lien Documents
LNF
TER
JG/LN
Judgment and Lien Documents
LNF
WDW
JG/LN
Judgment and Lien Documents
LNI
JG/LN
Judgment and Lien Documents
LNI
AMD
JG/LN
Judgment and Lien Documents
LNI
MOD
JG/LN
Judgment and Lien Documents
LNI
PAR
JG/LN
Judgment and Lien Documents
LNI
REL
JG/LN
Judgment and Lien Documents
LNI
RRR
JG/LN
Judgment and Lien Documents
LNI
TER
JG/LN
Judgment and Lien Documents
LNN
JG/LN
Judgment and Lien Documents
LNN
AMD
JG/LN
Judgment and Lien Documents
LNN
ASN
JG/LN
Judgment and Lien Documents
LNN
CAN
JG/LN
Judgment and Lien Documents
LNN
CNT
JG/LN
Judgment and Lien Documents
LNN
COR
JG/LN
Judgment and Lien Documents
LNN
DFL
JG/LN
Judgment and Lien Documents
LNN
EXT
JG/LN
Judgment and Lien Documents
LNN
FCL
JG/LN
Judgment and Lien Documents
LNN
HOA
JG/LN
Judgment and Lien Documents
LNN
MOD
JG/LN
Judgment and Lien Documents
LNN
PAR
JG/LN
Judgment and Lien Documents
LNN
REI
JG/LN
Judgment and Lien Documents
LNN
REL
JG/LN
Judgment and Lien Documents
LNN
REV
JG/LN
Judgment and Lien Documents
LNN
RND
JG/LN
Judgment and Lien Documents
LNN
RRR
JG/LN
Judgment and Lien Documents
LNN
RSN
JG/LN
Judgment and Lien Documents
LNN
SAT
JG/LN
Judgment and Lien Documents
LNN
SBD
JG/LN
Judgment and Lien Documents
LNN
TER
JG/LN
Judgment and Lien Documents
LNN
TSL
JG/LN
Judgment and Lien Documents
LNN
VAC
JG/LN
Judgment and Lien Documents
LNN
WDW
JG/LN
Judgment and Lien Documents
LNP
JG/LN
Judgment and Lien Documents
LNP
AMD
JG/LN
Judgment and Lien Documents
LNP
ASN
JG/LN
Judgment and Lien Documents
LNP
CAN
JG/LN
Judgment and Lien Documents
LNP
CNT
JG/LN
Judgment and Lien Documents
LNP
COR
JG/LN
Judgment and Lien Documents
LNP
DFL
JG/LN
Judgment and Lien Documents
LNP
EXT
JG/LN
Judgment and Lien Documents
LNP
FCL
JG/LN
Judgment and Lien Documents
LNP
MOD
JG/LN
Judgment and Lien Documents
LNP
PAR
JG/LN
Judgment and Lien Documents
LNP
REI
JG/LN
Judgment and Lien Documents
LNP
REL
JG/LN
Judgment and Lien Documents
LNP
REV
JG/LN
Judgment and Lien Documents
LNP
RND
JG/LN
Judgment and Lien Documents
LNP
RRR
JG/LN
Judgment and Lien Documents
LNP
RSN
JG/LN
Judgment and Lien Documents
LNP
SAT
JG/LN
Judgment and Lien Documents
LNP
SBD
JG/LN
Judgment and Lien Documents
LNP
TER
JG/LN
Judgment and Lien Documents
LNP
TSL
JG/LN
Judgment and Lien Documents
LNP
VAC
JG/LN
Judgment and Lien Documents
LNP
WDW
JG/LN
Judgment and Lien Documents
LNR
JG/LN
Judgment and Lien Documents
LNR
CAN
JG/LN
Judgment and Lien Documents
LNR
CNT
JG/LN
Judgment and Lien Documents
LNR
EXT
JG/LN
Judgment and Lien Documents
LNR
MOD
JG/LN
Judgment and Lien Documents
LNR
REL
JG/LN
Judgment and Lien Documents
LNR
RML
JG/LN
Judgment and Lien Documents
LNR
RRR
JG/LN
Judgment and Lien Documents
LNR
SAT
JG/LN
Judgment and Lien Documents
LNR
TER
JG/LN
Judgment and Lien Documents
LNR
WDW
JG/LN
Judgment and Lien Documents
LNS
JG/LN
Judgment and Lien Documents
LNS
AMD
JG/LN
Judgment and Lien Documents
LNS
CAN
JG/LN
Judgment and Lien Documents
LNS
CNT
JG/LN
Judgment and Lien Documents
LNS
EXT
JG/LN
Judgment and Lien Documents
LNS
MOD
JG/LN
Judgment and Lien Documents
LNS
REL
JG/LN
Judgment and Lien Documents
LNS
RML
JG/LN
Judgment and Lien Documents
LNS
RRR
JG/LN
Judgment and Lien Documents
LNS
SAT
JG/LN
Judgment and Lien Documents
LNS
TER
JG/LN
Judgment and Lien Documents
LNS
WDW
JG/LN
Judgment and Lien Documents
LNU
JG/LN
Judgment and Lien Documents
LNU
CAN
JG/LN
Judgment and Lien Documents
LNU
CNT
JG/LN
Judgment and Lien Documents
LNU
EXT
JG/LN
Judgment and Lien Documents
LNU
MOD
JG/LN
Judgment and Lien Documents
LNU
PAR
JG/LN
Judgment and Lien Documents
LNU
REL
JG/LN
Judgment and Lien Documents
LNU
RML
JG/LN
Judgment and Lien Documents
LNU
RRR
JG/LN
Judgment and Lien Documents
LNU
SAT
JG/LN
Judgment and Lien Documents
LNU
TER
JG/LN
Judgment and Lien Documents
LNU
WDW
JG/LN
Judgment and Lien Documents
LNW
JG/LN
Judgment and Lien Documents
LNW
CAN
JG/LN
Judgment and Lien Documents
LNW
CNT
JG/LN
Judgment and Lien Documents
LNW
EXT
JG/LN
Judgment and Lien Documents
LNW
MOD
JG/LN
Judgment and Lien Documents
LNW
PAR
JG/LN
Judgment and Lien Documents
LNW
REL
JG/LN
Judgment and Lien Documents
LNW
RML
JG/LN
Judgment and Lien Documents
LNW
RRR
JG/LN
Judgment and Lien Documents
LNW
SAT
JG/LN
Judgment and Lien Documents
LNW
TER
JG/LN
Judgment and Lien Documents
LNW
WDW
JG/LN
Judgment and Lien Documents
LNY
JG/LN
Judgment and Lien Documents
LNY
AMD
JG/LN
Judgment and Lien Documents
LNY
ASN
JG/LN
Judgment and Lien Documents
LNY
CAN
JG/LN
Judgment and Lien Documents
LNY
CNT
JG/LN
Judgment and Lien Documents
LNY
COR
JG/LN
Judgment and Lien Documents
LNY
DFL
JG/LN
Judgment and Lien Documents
LNY
EXT
JG/LN
Judgment and Lien Documents
LNY
FCL
JG/LN
Judgment and Lien Documents
LNY
MOD
JG/LN
Judgment and Lien Documents
LNY
PAR
JG/LN
Judgment and Lien Documents
LNY
REI
JG/LN
Judgment and Lien Documents
LNY
REL
JG/LN
Judgment and Lien Documents
LNY
REV
JG/LN
Judgment and Lien Documents
LNY
RND
JG/LN
Judgment and Lien Documents
LNY
RRR
JG/LN
Judgment and Lien Documents
LNY
RSN
JG/LN
Judgment and Lien Documents
LNY
SAT
JG/LN
Judgment and Lien Documents
LNY
SBD
JG/LN
Judgment and Lien Documents
LNY
TER
JG/LN
Judgment and Lien Documents
LNY
TSL
JG/LN
Judgment and Lien Documents
LNY
VAC
JG/LN
Judgment and Lien Documents
LNY
WDW
JG/LN
Judgment and Lien Documents
LVY
JG/LN
Judgment and Lien Documents
LVY
AMD
JG/LN
Judgment and Lien Documents
LVY
CAN
JG/LN
Judgment and Lien Documents
LVY
COR
JG/LN
Judgment and Lien Documents
LVY
EXT
JG/LN
Judgment and Lien Documents
LVY
PAR
JG/LN
Judgment and Lien Documents
LVY
REL
JG/LN
Judgment and Lien Documents
LVY
RRR
JG/LN
Judgment and Lien Documents
LVY
RVC
JG/LN
Judgment and Lien Documents
LVY
SAT
JG/LN
Judgment and Lien Documents
LVY
TER
JG/LN
Judgment and Lien Documents
LVY
WDW
JG/LN
Judgment and Lien Documents
MEJ
JG/LN
Judgment and Lien Documents
MEJ
AMD
JG/LN
Judgment and Lien Documents
MEJ
ASN
JG/LN
Judgment and Lien Documents
MEJ
CNT
JG/LN
Judgment and Lien Documents
MEJ
COR
JG/LN
Judgment and Lien Documents
MEJ
DFL
JG/LN
Judgment and Lien Documents
MEJ
DSM
JG/LN
Judgment and Lien Documents
MEJ
EXT
JG/LN
Judgment and Lien Documents
MEJ
FCL
JG/LN
Judgment and Lien Documents
MEJ
MOD
JG/LN
Judgment and Lien Documents
MEJ
PAR
JG/LN
Judgment and Lien Documents
MEJ
REI
JG/LN
Judgment and Lien Documents
MEJ
REL
JG/LN
Judgment and Lien Documents
MEJ
REV
JG/LN
Judgment and Lien Documents
MEJ
RRR
JG/LN
Judgment and Lien Documents
MEJ
RVC
JG/LN
Judgment and Lien Documents
MEJ
SAT
JG/LN
Judgment and Lien Documents
MEJ
SBD
JG/LN
Judgment and Lien Documents
MEJ
TER
JG/LN
Judgment and Lien Documents
MEJ
VAC
JG/LN
Judgment and Lien Documents
MEJ
WDW
JG/LN
Judgment and Lien Documents
MLB
JG/LN
Judgment and Lien Documents
MLB
AMD
JG/LN
Judgment and Lien Documents
MLB
MOD
JG/LN
Judgment and Lien Documents
MLB
PAR
JG/LN
Judgment and Lien Documents
MLB
REL
JG/LN
Judgment and Lien Documents
MLB
RRR
JG/LN
Judgment and Lien Documents
MLB
TER
JG/LN
Judgment and Lien Documents
MLN
JG/LN
Judgment and Lien Documents
MLN
AMD
JG/LN
Judgment and Lien Documents
MLN
ASN
JG/LN
Judgment and Lien Documents
MLN
CAN
JG/LN
Judgment and Lien Documents
MLN
CNT
JG/LN
Judgment and Lien Documents
MLN
COR
JG/LN
Judgment and Lien Documents
MLN
EXT
JG/LN
Judgment and Lien Documents
MLN
FCL
JG/LN
Judgment and Lien Documents
MLN
MOD
JG/LN
Judgment and Lien Documents
MLN
PAR
JG/LN
Judgment and Lien Documents
MLN
REA
JG/LN
Judgment and Lien Documents
MLN
REI
JG/LN
Judgment and Lien Documents
MLN
REL
JG/LN
Judgment and Lien Documents
MLN
REV
JG/LN
Judgment and Lien Documents
MLN
RML
JG/LN
Judgment and Lien Documents
MLN
RRR
JG/LN
Judgment and Lien Documents
MLN
SAT
JG/LN
Judgment and Lien Documents
MLN
TER
JG/LN
Judgment and Lien Documents
MNG
JG/LN
Judgment and Lien Documents
MNG
AMD
JG/LN
Judgment and Lien Documents
MNG
MOD
JG/LN
Judgment and Lien Documents
MNG
PAR
JG/LN
Judgment and Lien Documents
MNG
REL
JG/LN
Judgment and Lien Documents
MNG
RRR
JG/LN
Judgment and Lien Documents
MNG
TER
JG/LN
Judgment and Lien Documents
NOL
JG/LN
Judgment and Lien Documents
NOL
AMD
JG/LN
Judgment and Lien Documents
NOL
ASN
JG/LN
Judgment and Lien Documents
NOL
CAN
JG/LN
Judgment and Lien Documents
NOL
CNT
JG/LN
Judgment and Lien Documents
NOL
COR
JG/LN
Judgment and Lien Documents
NOL
DFL
JG/LN
Judgment and Lien Documents
NOL
EXT
JG/LN
Judgment and Lien Documents
NOL
FCL
JG/LN
Judgment and Lien Documents
NOL
MOD
JG/LN
Judgment and Lien Documents
NOL
PAR
JG/LN
Judgment and Lien Documents
NOL
REI
JG/LN
Judgment and Lien Documents
NOL
REL
JG/LN
Judgment and Lien Documents
NOL
REV
JG/LN
Judgment and Lien Documents
NOL
RND
JG/LN
Judgment and Lien Documents
NOL
RRR
JG/LN
Judgment and Lien Documents
NOL
RSN
JG/LN
Judgment and Lien Documents
NOL
SAT
JG/LN
Judgment and Lien Documents
NOL
SBD
JG/LN
Judgment and Lien Documents
NOL
TER
JG/LN
Judgment and Lien Documents
NOL
TSL
JG/LN
Judgment and Lien Documents
NOL
VAC
JG/LN
Judgment and Lien Documents
NOL
WDW
JG/LN
Judgment and Lien Documents
PPT
JG/LN
Judgment and Lien Documents
PPT
AMD
JG/LN
Judgment and Lien Documents
PPT
ASN
JG/LN
Judgment and Lien Documents
PPT
CAN
JG/LN
Judgment and Lien Documents
PPT
CNT
JG/LN
Judgment and Lien Documents
PPT
COR
JG/LN
Judgment and Lien Documents
PPT
DFL
JG/LN
Judgment and Lien Documents
PPT
EXT
JG/LN
Judgment and Lien Documents
PPT
FCL
JG/LN
Judgment and Lien Documents
PPT
MOD
JG/LN
Judgment and Lien Documents
PPT
PAR
JG/LN
Judgment and Lien Documents
PPT
REI
JG/LN
Judgment and Lien Documents
PPT
REL
JG/LN
Judgment and Lien Documents
PPT
REV
JG/LN
Judgment and Lien Documents
PPT
RND
JG/LN
Judgment and Lien Documents
PPT
RRR
JG/LN
Judgment and Lien Documents
PPT
RSN
JG/LN
Judgment and Lien Documents
PPT
SAT
JG/LN
Judgment and Lien Documents
PPT
SBD
JG/LN
Judgment and Lien Documents
PPT
TER
JG/LN
Judgment and Lien Documents
PPT
TSL
JG/LN
Judgment and Lien Documents
PPT
VAC
JG/LN
Judgment and Lien Documents
PPT
WDW
JG/LN
Judgment and Lien Documents
SAL
JG/LN
Judgment and Lien Documents
SAL
AMD
JG/LN
Judgment and Lien Documents
SAL
MOD
JG/LN
Judgment and Lien Documents
SAL
PAR
JG/LN
Judgment and Lien Documents
SAL
REL
JG/LN
Judgment and Lien Documents
SAL
RRR
JG/LN
Judgment and Lien Documents
SAL
TER
JG/LN
Judgment and Lien Documents
JDG
RNW
JG/LN
Judgment and Lien Documents
ASE
RVC
JG/LN
Judgment and Lien Documents
LNH
JG/LN
Judgment and Lien Documents
JDG
STP
JG/LN
Judgment and Lien Documents
ASE
DLQ
JG/LN
Judgment and Lien Documents
ASE
RND
JG/LN
Judgment and Lien Documents
JDG
EXP
JG/LN
Judgment and Lien Documents
NOL
SPC
JG/LN
Judgment and Lien Documents
NOL
DCH
JG/LN
Judgment and Lien Documents
LNF
REF
JG/LN
Judgment and Lien Documents
LNN
RDM
JG/LN
Judgment and Lien Documents
ASE
CLA
JG/LN
Judgment and Lien Documents
JDC
SBD
JG/LN
Judgment and Lien Documents
JDG
QUI
JG/LN
Judgment and Lien Documents
LNF
SUB
JG/LN
Judgment and Lien Documents
LNF
AMR
JG/LN
Judgment and Lien Documents
LNS
SBD
JG/LN
Judgment and Lien Documents
LNF
SBD
JG/LN
Judgment and Lien Documents
JDG
RSU
JG/LN
Judgment and Lien Documents
ASE
HOA
JG/LN
Judgment and Lien Documents
ASE
REV
JG/LN
Judgment and Lien Documents
ASE
RML
JG/LN
Judgment and Lien Documents
ASE
TXA
JG/LN
Judgment and Lien Documents
ASE
WAT
JG/LN
Judgment and Lien Documents
BND
ASA
JG/LN
Judgment and Lien Documents
BND
ATT
JG/LN
Judgment and Lien Documents
BND
DCH
JG/LN
Judgment and Lien Documents
BND
PAY
JG/LN
Judgment and Lien Documents
BND
PER
JG/LN
Judgment and Lien Documents
BND
SUB
JG/LN
Judgment and Lien Documents
BND
TER
JG/LN
Judgment and Lien Documents
BND
WAT
JG/LN
Judgment and Lien Documents
CLM
DCH
JG/LN
Judgment and Lien Documents
CLM
FNL
JG/LN
Judgment and Lien Documents
CLM
RNC
JG/LN
Judgment and Lien Documents
CRJ
DSM
JG/LN
Judgment and Lien Documents
CRJ
ERR
JG/LN
Judgment and Lien Documents
CRJ
FOR
JG/LN
Judgment and Lien Documents
CRJ
MOD
JG/LN
Judgment and Lien Documents
CRJ
RNW
JG/LN
Judgment and Lien Documents
CRJ
SZE
JG/LN
Judgment and Lien Documents
CRJ
VAC
JG/LN
Judgment and Lien Documents
FTP
PAR
JG/LN
Judgment and Lien Documents
FTP
REL
JG/LN
Judgment and Lien Documents
JDC
AMD
JG/LN
Judgment and Lien Documents
JDC
ASN
JG/LN
Judgment and Lien Documents
JDC
MOD
JG/LN
Judgment and Lien Documents
JDC
RNW
JG/LN
Judgment and Lien Documents
JDG
ABD
JG/LN
Judgment and Lien Documents
JDG
ADR
JG/LN
Judgment and Lien Documents
JDG
ANM
JG/LN
Judgment and Lien Documents
JDG
APS
JG/LN
Judgment and Lien Documents
JDG
APT
JG/LN
Judgment and Lien Documents
JDG
ASA
JG/LN
Judgment and Lien Documents
JDG
ATY
JG/LN
Judgment and Lien Documents
JDG
CAN
JG/LN
Judgment and Lien Documents
JDG
CDM
JG/LN
Judgment and Lien Documents
JDG
CFS
JG/LN
Judgment and Lien Documents
JDG
CRD
JG/LN
Judgment and Lien Documents
JDG
CST
JG/LN
Judgment and Lien Documents
JDG
CVS
JG/LN
Judgment and Lien Documents
JDG
DCH
JG/LN
Judgment and Lien Documents
JDG
DSC
JG/LN
Judgment and Lien Documents
JDG
EAS
JG/LN
Judgment and Lien Documents
JDG
ERR
JG/LN
Judgment and Lien Documents
JDG
FCR
JG/LN
Judgment and Lien Documents
JDG
FNL
JG/LN
Judgment and Lien Documents
JDG
FOR
JG/LN
Judgment and Lien Documents
JDG
GDN
JG/LN
Judgment and Lien Documents
JDG
INA
JG/LN
Judgment and Lien Documents
JDG
INT
JG/LN
Judgment and Lien Documents
JDG
NAM
JG/LN
Judgment and Lien Documents
JDG
NUL
JG/LN
Judgment and Lien Documents
JDG
OSL
JG/LN
Judgment and Lien Documents
JDG
PAA
JG/LN
Judgment and Lien Documents
JDG
POS
JG/LN
Judgment and Lien Documents
JDG
RAS
JG/LN
Judgment and Lien Documents
JDG
REA
JG/LN
Judgment and Lien Documents
JDG
REF
JG/LN
Judgment and Lien Documents
JDG
RML
JG/LN
Judgment and Lien Documents
JDG
ROA
JG/LN
Judgment and Lien Documents
JDG
RSN
JG/LN
Judgment and Lien Documents
JDG
SCC
JG/LN
Judgment and Lien Documents
JDG
SCR
JG/LN
Judgment and Lien Documents
JDG
SET
JG/LN
Judgment and Lien Documents
JDG
SUP
JG/LN
Judgment and Lien Documents
JDG
SZE
JG/LN
Judgment and Lien Documents
JDG
TRF
JG/LN
Judgment and Lien Documents
JDG
TXA
JG/LN
Judgment and Lien Documents
LNE
ASN
JG/LN
Judgment and Lien Documents
LNE
COR
JG/LN
Judgment and Lien Documents
LNE
DSC
JG/LN
Judgment and Lien Documents
LNE
ERR
JG/LN
Judgment and Lien Documents
LNE
SBD
JG/LN
Judgment and Lien Documents
LNE
VAC
JG/LN
Judgment and Lien Documents
LNF
ASN
JG/LN
Judgment and Lien Documents
LNF
COR
JG/LN
Judgment and Lien Documents
LNF
DCH
JG/LN
Judgment and Lien Documents
LNF
ERR
JG/LN
Judgment and Lien Documents
LNF
EXP
JG/LN
Judgment and Lien Documents
LNF
INV
JG/LN
Judgment and Lien Documents
LNF
NAT
JG/LN
Judgment and Lien Documents
LNF
PAA
JG/LN
Judgment and Lien Documents
LNF
RNW
JG/LN
Judgment and Lien Documents
LNF
RVC
JG/LN
Judgment and Lien Documents
LNF
RVR
JG/LN
Judgment and Lien Documents
LNH
RRR
JG/LN
Judgment and Lien Documents
LNH
TER
JG/LN
Judgment and Lien Documents
LNI
RSU
JG/LN
Judgment and Lien Documents
LNI
SBD
JG/LN
Judgment and Lien Documents
LNI
TES
JG/LN
Judgment and Lien Documents
LNN
AME
JG/LN
Judgment and Lien Documents
LNN
ATY
JG/LN
Judgment and Lien Documents
LNN
BRC
JG/LN
Judgment and Lien Documents
LNN
BRL
JG/LN
Judgment and Lien Documents
LNN
CDR
JG/LN
Judgment and Lien Documents
LNN
DCH
JG/LN
Judgment and Lien Documents
LNN
DFR
JG/LN
Judgment and Lien Documents
LNN
DSC
JG/LN
Judgment and Lien Documents
LNN
ERR
JG/LN
Judgment and Lien Documents
LNN
INV
JG/LN
Judgment and Lien Documents
LNN
RAS
JG/LN
Judgment and Lien Documents
LNN
RED
JG/LN
Judgment and Lien Documents
LNN
RML
JG/LN
Judgment and Lien Documents
LNN
RNW
JG/LN
Judgment and Lien Documents
LNN
RSR
JG/LN
Judgment and Lien Documents
LNN
RSU
JG/LN
Judgment and Lien Documents
LNN
RVC
JG/LN
Judgment and Lien Documents
LNN
RVR
JG/LN
Judgment and Lien Documents
LNN
STT
JG/LN
Judgment and Lien Documents
LNN
SZE
JG/LN
Judgment and Lien Documents
LNN
TRF
JG/LN
Judgment and Lien Documents
LNN
WAT
JG/LN
Judgment and Lien Documents
LNS
ASN
JG/LN
Judgment and Lien Documents
LNS
ATY
JG/LN
Judgment and Lien Documents
LNS
COR
JG/LN
Judgment and Lien Documents
LNS
ERR
JG/LN
Judgment and Lien Documents
LNS
INT
JG/LN
Judgment and Lien Documents
LNS
PAR
JG/LN
Judgment and Lien Documents
LNS
RNW
JG/LN
Judgment and Lien Documents
LVY
SBD
JG/LN
Judgment and Lien Documents
LVY
VAC
JG/LN
Judgment and Lien Documents
MLN
ADR
JG/LN
Judgment and Lien Documents
MLN
AMR
JG/LN
Judgment and Lien Documents
MLN
BRL
JG/LN
Judgment and Lien Documents
MLN
CDR
JG/LN
Judgment and Lien Documents
MLN
DCH
JG/LN
Judgment and Lien Documents
MLN
ERR
JG/LN
Judgment and Lien Documents
MLN
INT
JG/LN
Judgment and Lien Documents
MLN
PNT
JG/LN
Judgment and Lien Documents
MLN
RAT
JG/LN
Judgment and Lien Documents
MLN
RNW
JG/LN
Judgment and Lien Documents
MLN
SBD
JG/LN
Judgment and Lien Documents
MLN
SUP
JG/LN
Judgment and Lien Documents
JDC
SUB
JG/LN
Judgment and Lien Documents
MLN
WDW
JG/LN
Judgment and Lien Documents
LNN
COM
JG/LN
Judgment and Lien Documents
MLN
RAD
JG/LN
Judgment and Lien Documents
MLN
PRA
JG/LN
Judgment and Lien Documents
BND
AMD
JG/LN
Judgment and Lien Documents
BND
ASN
JG/LN
Judgment and Lien Documents
BND
CAN
JG/LN
Judgment and Lien Documents
BND
CLA
JG/LN
Judgment and Lien Documents
BND
FOR
JG/LN
Judgment and Lien Documents
BND
SAT
JG/LN
Judgment and Lien Documents
CLM
ASN
JG/LN
Judgment and Lien Documents
CLM
PAA
JG/LN
Judgment and Lien Documents
CLM
REV
JG/LN
Judgment and Lien Documents
ETL
PRE
JG/LN
Judgment and Lien Documents
JDG
CLA
JG/LN
Judgment and Lien Documents
LNH
SAT
JG/LN
Judgment and Lien Documents
LNN
AMR
JG/LN
Judgment and Lien Documents
LNN
CLA
JG/LN
Judgment and Lien Documents
LNN
DIS
JG/LN
Judgment and Lien Documents
LNN
STP
JG/LN
Judgment and Lien Documents
LNN
SUP
JG/LN
Judgment and Lien Documents
CLM
ATY
JG/LN
Judgment and Lien Documents
LNC
RDM
JG/LN
Judgment and Lien Documents
MLB
DCH
JG/LN
Judgment and Lien Documents
JDC
TER
JG/LN
Judgment and Lien Documents
LNH
REL
JG/LN
Judgment and Lien Documents
CRJ
COR
JG/LN
Judgment and Lien Documents
JDC
DFL
JG/LN
Judgment and Lien Documents
MNG
RLQ
JG/LN
Judgment and Lien Documents
BND
MNT
JG/LN
Judgment and Lien Documents
BND
MOD
JG/LN
Judgment and Lien Documents
BND
TRF
JG/LN
Judgment and Lien Documents
JDC
DLQ
JG/LN
Judgment and Lien Documents
JDC
SAT
JG/LN
Judgment and Lien Documents
JDG
AMR
JG/LN
Judgment and Lien Documents
JDG
DLQ
JG/LN
Judgment and Lien Documents
NOL
TXA
JG/LN
Judgment and Lien Documents
CLM
AMD
JG/LN
Judgment and Lien Documents
ASE
ADR
JG/LN
Judgment and Lien Documents
ASE
EXT
JG/LN
Judgment and Lien Documents
ASE
STT
JG/LN
Judgment and Lien Documents
ETL
PRC
JG/LN
Judgment and Lien Documents
JDC
AMR
JG/LN
Judgment and Lien Documents
JDC
COR
JG/LN
Judgment and Lien Documents
JDC
CST
JG/LN
Judgment and Lien Documents
JDC
DSM
JG/LN
Judgment and Lien Documents
JDC
SBA
JG/LN
Judgment and Lien Documents
JDC
STP
JG/LN
Judgment and Lien Documents
JDC
SUP
JG/LN
Judgment and Lien Documents
JDC
VAC
JG/LN
Judgment and Lien Documents
JDC
WDW
JG/LN
Judgment and Lien Documents
JDG
ATT
JG/LN
Judgment and Lien Documents
JDG
DIS
JG/LN
Judgment and Lien Documents
JDG
DTH
JG/LN
Judgment and Lien Documents
JDG
INL
JG/LN
Judgment and Lien Documents
JDG
NCP
JG/LN
Judgment and Lien Documents
JDG
PVA
JG/LN
Judgment and Lien Documents
JDG
SBA
JG/LN
Judgment and Lien Documents
JDG
SUB
JG/LN
Judgment and Lien Documents
JDG
TSL
JG/LN
Judgment and Lien Documents
LNC
AMD
JG/LN
Judgment and Lien Documents
LNC
COR
JG/LN
Judgment and Lien Documents
LNC
INV
JG/LN
Judgment and Lien Documents
LNC
POP
JG/LN
Judgment and Lien Documents
LNC
REF
JG/LN
Judgment and Lien Documents
LNC
RNW
JG/LN
Judgment and Lien Documents
LND
WDW
JG/LN
Judgment and Lien Documents
LNF
REC
JG/LN
Judgment and Lien Documents
LNH
PAR
JG/LN
Judgment and Lien Documents
LNN
DLQ
JG/LN
Judgment and Lien Documents
LNS
NCP
JG/LN
Judgment and Lien Documents
MNG
ABD
JG/LN
Judgment and Lien Documents
MNG
ASN
JG/LN
Judgment and Lien Documents
MNG
RAS
JG/LN
Judgment and Lien Documents
BND
STP
JG/LN
Judgment and Lien Documents
LNC
ERR
JG/LN
Judgment and Lien Documents
LNH
RNW
JG/LN
Judgment and Lien Documents
MLN
EXP
JG/LN
Judgment and Lien Documents
MNG
TRF
JG/LN
Judgment and Lien Documents
LNC
DFL
JG/LN
Judgment and Lien Documents
LNS
DFL
JG/LN
Judgment and Lien Documents
LNF
DFL
JG/LN
Judgment and Lien Documents
ASE
COA
JG/LN
Judgment and Lien Documents
ASE
COR
JG/LN
Judgment and Lien Documents
ASE
PAA
JG/LN
Judgment and Lien Documents
BND
COA
JG/LN
Judgment and Lien Documents
BND
COR
JG/LN
Judgment and Lien Documents
BRA
AMD
JG/LN
Judgment and Lien Documents
BRA
ASN
JG/LN
Judgment and Lien Documents
BRA
COA
JG/LN
Judgment and Lien Documents
BRA
COR
JG/LN
Judgment and Lien Documents
BRA
REL
JG/LN
Judgment and Lien Documents
BRA
RRR
JG/LN
Judgment and Lien Documents
BRA
SAT
JG/LN
Judgment and Lien Documents
CJG
AMD
JG/LN
Judgment and Lien Documents
CJG
ASN
JG/LN
Judgment and Lien Documents
CJG
COA
JG/LN
Judgment and Lien Documents
CJG
COR
JG/LN
Judgment and Lien Documents
CJG
REL
JG/LN
Judgment and Lien Documents
CJG
RRR
JG/LN
Judgment and Lien Documents
CJG
SAT
JG/LN
Judgment and Lien Documents
CLM
COA
JG/LN
Judgment and Lien Documents
CLM
COR
JG/LN
Judgment and Lien Documents
CRB
AMD
JG/LN
Judgment and Lien Documents
CRB
ASN
JG/LN
Judgment and Lien Documents
CRB
COA
JG/LN
Judgment and Lien Documents
CRB
COR
JG/LN
Judgment and Lien Documents
CRB
SAT
JG/LN
Judgment and Lien Documents
CRJ
COA
JG/LN
Judgment and Lien Documents
ETL
COA
JG/LN
Judgment and Lien Documents
ETL
DCH
JG/LN
Judgment and Lien Documents
ETL
PAA
JG/LN
Judgment and Lien Documents
FTP
AMD
JG/LN
Judgment and Lien Documents
FTP
ASN
JG/LN
Judgment and Lien Documents
FTP
COA
JG/LN
Judgment and Lien Documents
FTP
COR
JG/LN
Judgment and Lien Documents
FTP
RRR
JG/LN
Judgment and Lien Documents
FTP
SAT
JG/LN
Judgment and Lien Documents
JDG
COA
JG/LN
Judgment and Lien Documents
LNC
ASN
JG/LN
Judgment and Lien Documents
LNC
COA
JG/LN
Judgment and Lien Documents
LNC
PAA
JG/LN
Judgment and Lien Documents
LND
COA
JG/LN
Judgment and Lien Documents
LND
DCH
JG/LN
Judgment and Lien Documents
LND
PAA
JG/LN
Judgment and Lien Documents
LNE
COA
JG/LN
Judgment and Lien Documents
LNE
DCH
JG/LN
Judgment and Lien Documents
LNE
PAA
JG/LN
Judgment and Lien Documents
LNE
SAT
JG/LN
Judgment and Lien Documents
LNF
COA
JG/LN
Judgment and Lien Documents
LNH
AMD
JG/LN
Judgment and Lien Documents
LNH
ASN
JG/LN
Judgment and Lien Documents
LNH
COA
JG/LN
Judgment and Lien Documents
LNH
COR
JG/LN
Judgment and Lien Documents
LNH
DCH
JG/LN
Judgment and Lien Documents
LNH
PAA
JG/LN
Judgment and Lien Documents
LNI
ASN
JG/LN
Judgment and Lien Documents
LNI
COA
JG/LN
Judgment and Lien Documents
LNI
COR
JG/LN
Judgment and Lien Documents
LNI
SAT
JG/LN
Judgment and Lien Documents
LNN
COA
JG/LN
Judgment and Lien Documents
LNN
PAA
JG/LN
Judgment and Lien Documents
LNP
COA
JG/LN
Judgment and Lien Documents
LNP
DCH
JG/LN
Judgment and Lien Documents
LNP
PAA
JG/LN
Judgment and Lien Documents
LNR
AMD
JG/LN
Judgment and Lien Documents
LNR
ASN
JG/LN
Judgment and Lien Documents
LNR
COA
JG/LN
Judgment and Lien Documents
LNR
COR
JG/LN
Judgment and Lien Documents
LNR
DCH
JG/LN
Judgment and Lien Documents
LNR
PAA
JG/LN
Judgment and Lien Documents
LNS
COA
JG/LN
Judgment and Lien Documents
LNS
DCH
JG/LN
Judgment and Lien Documents
LNS
PAA
JG/LN
Judgment and Lien Documents
LNU
AMD
JG/LN
Judgment and Lien Documents
LNU
ASN
JG/LN
Judgment and Lien Documents
LNU
COA
JG/LN
Judgment and Lien Documents
LNU
COR
JG/LN
Judgment and Lien Documents
LNU
DCH
JG/LN
Judgment and Lien Documents
LNU
PAA
JG/LN
Judgment and Lien Documents
LNW
AMD
JG/LN
Judgment and Lien Documents
LNW
ASN
JG/LN
Judgment and Lien Documents
LNW
COA
JG/LN
Judgment and Lien Documents
LNW
COR
JG/LN
Judgment and Lien Documents
LNW
DCH
JG/LN
Judgment and Lien Documents
LNW
PAA
JG/LN
Judgment and Lien Documents
LNY
COA
JG/LN
Judgment and Lien Documents
LNY
DCH
JG/LN
Judgment and Lien Documents
LNY
PAA
JG/LN
Judgment and Lien Documents
MEJ
COA
JG/LN
Judgment and Lien Documents
MEJ
DCH
JG/LN
Judgment and Lien Documents
MEJ
PAA
JG/LN
Judgment and Lien Documents
MLB
ASN
JG/LN
Judgment and Lien Documents
MLB
COA
JG/LN
Judgment and Lien Documents
MLB
COR
JG/LN
Judgment and Lien Documents
MLB
PAA
JG/LN
Judgment and Lien Documents
MLB
SAT
JG/LN
Judgment and Lien Documents
MLN
COA
JG/LN
Judgment and Lien Documents
MLN
PAA
JG/LN
Judgment and Lien Documents
MNG
COA
JG/LN
Judgment and Lien Documents
MNG
COR
JG/LN
Judgment and Lien Documents
MNG
PAA
JG/LN
Judgment and Lien Documents
MNG
SAT
JG/LN
Judgment and Lien Documents
NOL
COA
JG/LN
Judgment and Lien Documents
NOL
PAA
JG/LN
Judgment and Lien Documents
PPT
COA
JG/LN
Judgment and Lien Documents
PPT
DCH
JG/LN
Judgment and Lien Documents
PPT
PAA
JG/LN
Judgment and Lien Documents
SAL
ASN
JG/LN
Judgment and Lien Documents
SAL
COA
JG/LN
Judgment and Lien Documents
SAL
COR
JG/LN
Judgment and Lien Documents
SAL
DCH
JG/LN
Judgment and Lien Documents
SAL
PAA
JG/LN
Judgment and Lien Documents
SAL
SAT
JG/LN
Judgment and Lien Documents
ETL
MOD
JG/LN
Judgment and Lien Documents
LNN
ATT
JG/LN
Judgment and Lien Documents
ASE
RAD
JG/LN
Judgment and Lien Documents
CRJ
AMR
JG/LN
Judgment and Lien Documents
ASE
DCH
JG/LN
Judgment and Lien Documents
CRJ
ATY
JG/LN
Judgment and Lien Documents
CRJ
CAN
JG/LN
Judgment and Lien Documents
CRJ
FNL
JG/LN
Judgment and Lien Documents
CRJ
PAA
JG/LN
Judgment and Lien Documents
CRJ
RAS
JG/LN
Judgment and Lien Documents
JDC
CAN
JG/LN
Judgment and Lien Documents
JDC
COA
JG/LN
Judgment and Lien Documents
JDC
DCH
JG/LN
Judgment and Lien Documents
JDC
EXT
JG/LN
Judgment and Lien Documents
JDC
PAA
JG/LN
Judgment and Lien Documents
JDC
RAS
JG/LN
Judgment and Lien Documents
JDJ
AMR
JG/LN
Judgment and Lien Documents
JDJ
ATY
JG/LN
Judgment and Lien Documents
JDJ
CAN
JG/LN
Judgment and Lien Documents
JDJ
COA
JG/LN
Judgment and Lien Documents
JDJ
DCH
JG/LN
Judgment and Lien Documents
JDJ
FNL
JG/LN
Judgment and Lien Documents
JDJ
PAA
JG/LN
Judgment and Lien Documents
JDJ
RAS
JG/LN
Judgment and Lien Documents
LVY
AME
JG/LN
Judgment and Lien Documents
LVY
AMR
JG/LN
Judgment and Lien Documents
LVY
ASN
JG/LN
Judgment and Lien Documents
LVY
ATT
JG/LN
Judgment and Lien Documents
LVY
ATY
JG/LN
Judgment and Lien Documents
LVY
BRC
JG/LN
Judgment and Lien Documents
LVY
BRL
JG/LN
Judgment and Lien Documents
LVY
CDR
JG/LN
Judgment and Lien Documents
LVY
CLA
JG/LN
Judgment and Lien Documents
LVY
CNT
JG/LN
Judgment and Lien Documents
LVY
DCH
JG/LN
Judgment and Lien Documents
LVY
DIS
JG/LN
Judgment and Lien Documents
LVY
DLQ
JG/LN
Judgment and Lien Documents
LVY
DSC
JG/LN
Judgment and Lien Documents
LVY
ERR
JG/LN
Judgment and Lien Documents
LVY
FCL
JG/LN
Judgment and Lien Documents
LVY
HOA
JG/LN
Judgment and Lien Documents
LVY
INV
JG/LN
Judgment and Lien Documents
LVY
MOD
JG/LN
Judgment and Lien Documents
LVY
PAA
JG/LN
Judgment and Lien Documents
LVY
RAS
JG/LN
Judgment and Lien Documents
LVY
RDM
JG/LN
Judgment and Lien Documents
LVY
RED
JG/LN
Judgment and Lien Documents
LVY
REI
JG/LN
Judgment and Lien Documents
LVY
REV
JG/LN
Judgment and Lien Documents
LVY
RML
JG/LN
Judgment and Lien Documents
LVY
RND
JG/LN
Judgment and Lien Documents
LVY
RNW
JG/LN
Judgment and Lien Documents
LVY
RSN
JG/LN
Judgment and Lien Documents
LVY
RSR
JG/LN
Judgment and Lien Documents
LVY
RSU
JG/LN
Judgment and Lien Documents
LVY
RVR
JG/LN
Judgment and Lien Documents
LVY
STT
JG/LN
Judgment and Lien Documents
LVY
SZE
JG/LN
Judgment and Lien Documents
LVY
TRF
JG/LN
Judgment and Lien Documents
LVY
WAT
JG/LN
Judgment and Lien Documents
ASE
ERR
JG/LN
Judgment and Lien Documents
SAL
RSR
JG/LN
Judgment and Lien Documents
BND
EXM
JG/LN
Judgment and Lien Documents
BND
EXP
JG/LN
Judgment and Lien Documents
BND
EXT
JG/LN
Judgment and Lien Documents
BND
PAA
JG/LN
Judgment and Lien Documents
BND
PAC
JG/LN
Judgment and Lien Documents
BND
REA
JG/LN
Judgment and Lien Documents
BND
RND
JG/LN
Judgment and Lien Documents
BND
RNW
JG/LN
Judgment and Lien Documents
BND
RSM
JG/LN
Judgment and Lien Documents
BND
RSN
JG/LN
Judgment and Lien Documents
BND
RSR
JG/LN
Judgment and Lien Documents
BND
RSU
JG/LN
Judgment and Lien Documents
BND
SBD
JG/LN
Judgment and Lien Documents
BND
SET
JG/LN
Judgment and Lien Documents
BND
TEA
JG/LN
Judgment and Lien Documents
BND
TES
JG/LN
Judgment and Lien Documents
ETL
AME
JG/LN
Judgment and Lien Documents
ETL
ATY
JG/LN
Judgment and Lien Documents
ETL
BRC
JG/LN
Judgment and Lien Documents
ETL
BRL
JG/LN
Judgment and Lien Documents
ETL
CDR
JG/LN
Judgment and Lien Documents
ETL
COM
JG/LN
Judgment and Lien Documents
ETL
DFL
JG/LN
Judgment and Lien Documents
ETL
DFR
JG/LN
Judgment and Lien Documents
ETL
DSC
JG/LN
Judgment and Lien Documents
ETL
ERR
JG/LN
Judgment and Lien Documents
ETL
FCL
JG/LN
Judgment and Lien Documents
ETL
HOA
JG/LN
Judgment and Lien Documents
ETL
INV
JG/LN
Judgment and Lien Documents
ETL
RAS
JG/LN
Judgment and Lien Documents
ETL
RDM
JG/LN
Judgment and Lien Documents
ETL
RED
JG/LN
Judgment and Lien Documents
ETL
REI
JG/LN
Judgment and Lien Documents
ETL
RML
JG/LN
Judgment and Lien Documents
ETL
RND
JG/LN
Judgment and Lien Documents
ETL
RNW
JG/LN
Judgment and Lien Documents
ETL
RSN
JG/LN
Judgment and Lien Documents
ETL
RSR
JG/LN
Judgment and Lien Documents
ETL
RSU
JG/LN
Judgment and Lien Documents
ETL
RVC
JG/LN
Judgment and Lien Documents
ETL
RVR
JG/LN
Judgment and Lien Documents
ETL
STT
JG/LN
Judgment and Lien Documents
ETL
SZE
JG/LN
Judgment and Lien Documents
ETL
TRF
JG/LN
Judgment and Lien Documents
ETL
TSL
JG/LN
Judgment and Lien Documents
ETL
VAC
JG/LN
Judgment and Lien Documents
ETL
WAT
JG/LN
Judgment and Lien Documents
ETL
WDW
JG/LN
Judgment and Lien Documents
JDC
ABD
JG/LN
Judgment and Lien Documents
JDC
ADR
JG/LN
Judgment and Lien Documents
JDC
ANM
JG/LN
Judgment and Lien Documents
JDC
APS
JG/LN
Judgment and Lien Documents
JDC
APT
JG/LN
Judgment and Lien Documents
JDC
ASA
JG/LN
Judgment and Lien Documents
JDC
ATY
JG/LN
Judgment and Lien Documents
JDC
CDM
JG/LN
Judgment and Lien Documents
JDC
CFS
JG/LN
Judgment and Lien Documents
JDC
CNT
JG/LN
Judgment and Lien Documents
JDC
CRD
JG/LN
Judgment and Lien Documents
JDC
CVS
JG/LN
Judgment and Lien Documents
JDC
DSC
JG/LN
Judgment and Lien Documents
JDC
EAS
JG/LN
Judgment and Lien Documents
JDC
ERR
JG/LN
Judgment and Lien Documents
JDC
EXP
JG/LN
Judgment and Lien Documents
JDC
FCL
JG/LN
Judgment and Lien Documents
JDC
FCR
JG/LN
Judgment and Lien Documents
JDC
FNL
JG/LN
Judgment and Lien Documents
JDC
FOR
JG/LN
Judgment and Lien Documents
JDC
GDN
JG/LN
Judgment and Lien Documents
JDC
INA
JG/LN
Judgment and Lien Documents
JDC
INT
JG/LN
Judgment and Lien Documents
JDC
NAM
JG/LN
Judgment and Lien Documents
JDC
NUL
JG/LN
Judgment and Lien Documents
JDC
OSL
JG/LN
Judgment and Lien Documents
JDC
POS
JG/LN
Judgment and Lien Documents
JDC
QUI
JG/LN
Judgment and Lien Documents
JDC
REA
JG/LN
Judgment and Lien Documents
JDC
REF
JG/LN
Judgment and Lien Documents
JDC
REI
JG/LN
Judgment and Lien Documents
JDC
REV
JG/LN
Judgment and Lien Documents
JDC
RML
JG/LN
Judgment and Lien Documents
JDC
ROA
JG/LN
Judgment and Lien Documents
JDC
RSN
JG/LN
Judgment and Lien Documents
JDC
RSU
JG/LN
Judgment and Lien Documents
JDC
RVC
JG/LN
Judgment and Lien Documents
JDC
SCC
JG/LN
Judgment and Lien Documents
JDC
SCR
JG/LN
Judgment and Lien Documents
JDC
SET
JG/LN
Judgment and Lien Documents
JDC
SZE
JG/LN
Judgment and Lien Documents
JDC
TRF
JG/LN
Judgment and Lien Documents
JDC
TXA
JG/LN
Judgment and Lien Documents
JDJ
ABD
JG/LN
Judgment and Lien Documents
JDJ
ADR
JG/LN
Judgment and Lien Documents
JDJ
ANM
JG/LN
Judgment and Lien Documents
JDJ
APS
JG/LN
Judgment and Lien Documents
JDJ
APT
JG/LN
Judgment and Lien Documents
JDJ
ASA
JG/LN
Judgment and Lien Documents
JDJ
CDM
JG/LN
Judgment and Lien Documents
JDJ
CFS
JG/LN
Judgment and Lien Documents
JDJ
CRD
JG/LN
Judgment and Lien Documents
JDJ
CST
JG/LN
Judgment and Lien Documents
JDJ
CVS
JG/LN
Judgment and Lien Documents
JDJ
DSC
JG/LN
Judgment and Lien Documents
JDJ
EAS
JG/LN
Judgment and Lien Documents
JDJ
ERR
JG/LN
Judgment and Lien Documents
JDJ
EXP
JG/LN
Judgment and Lien Documents
JDJ
FCR
JG/LN
Judgment and Lien Documents
JDJ
FOR
JG/LN
Judgment and Lien Documents
JDJ
GDN
JG/LN
Judgment and Lien Documents
JDJ
INA
JG/LN
Judgment and Lien Documents
JDJ
INT
JG/LN
Judgment and Lien Documents
JDJ
NAM
JG/LN
Judgment and Lien Documents
JDJ
NUL
JG/LN
Judgment and Lien Documents
JDJ
OSL
JG/LN
Judgment and Lien Documents
JDJ
POS
JG/LN
Judgment and Lien Documents
JDJ
QUI
JG/LN
Judgment and Lien Documents
JDJ
REA
JG/LN
Judgment and Lien Documents
JDJ
REF
JG/LN
Judgment and Lien Documents
JDJ
RML
JG/LN
Judgment and Lien Documents
JDJ
RNW
JG/LN
Judgment and Lien Documents
JDJ
ROA
JG/LN
Judgment and Lien Documents
JDJ
RSN
JG/LN
Judgment and Lien Documents
JDJ
RSU
JG/LN
Judgment and Lien Documents
JDJ
SCC
JG/LN
Judgment and Lien Documents
JDJ
SCR
JG/LN
Judgment and Lien Documents
JDJ
SET
JG/LN
Judgment and Lien Documents
JDJ
STP
JG/LN
Judgment and Lien Documents
JDJ
SUP
JG/LN
Judgment and Lien Documents
JDJ
SZE
JG/LN
Judgment and Lien Documents
JDJ
TRF
JG/LN
Judgment and Lien Documents
JDJ
TXA
JG/LN
Judgment and Lien Documents
JDS
ABD
JG/LN
Judgment and Lien Documents
JDS
ADR
JG/LN
Judgment and Lien Documents
JDS
ANM
JG/LN
Judgment and Lien Documents
JDS
APS
JG/LN
Judgment and Lien Documents
JDS
APT
JG/LN
Judgment and Lien Documents
JDS
ASA
JG/LN
Judgment and Lien Documents
JDS
ATY
JG/LN
Judgment and Lien Documents
JDS
CAN
JG/LN
Judgment and Lien Documents
JDS
CDM
JG/LN
Judgment and Lien Documents
JDS
CFS
JG/LN
Judgment and Lien Documents
JDS
CRD
JG/LN
Judgment and Lien Documents
JDS
CST
JG/LN
Judgment and Lien Documents
JDS
CVS
JG/LN
Judgment and Lien Documents
JDS
DCH
JG/LN
Judgment and Lien Documents
JDS
DSC
JG/LN
Judgment and Lien Documents
JDS
EAS
JG/LN
Judgment and Lien Documents
JDS
ERR
JG/LN
Judgment and Lien Documents
JDS
EXP
JG/LN
Judgment and Lien Documents
JDS
FCR
JG/LN
Judgment and Lien Documents
JDS
FNL
JG/LN
Judgment and Lien Documents
JDS
FOR
JG/LN
Judgment and Lien Documents
JDS
GDN
JG/LN
Judgment and Lien Documents
JDS
INA
JG/LN
Judgment and Lien Documents
JDS
INT
JG/LN
Judgment and Lien Documents
JDS
NAM
JG/LN
Judgment and Lien Documents
JDS
NUL
JG/LN
Judgment and Lien Documents
JDS
OSL
JG/LN
Judgment and Lien Documents
JDS
PAA
JG/LN
Judgment and Lien Documents
JDS
POS
JG/LN
Judgment and Lien Documents
JDS
QUI
JG/LN
Judgment and Lien Documents
JDS
RAS
JG/LN
Judgment and Lien Documents
JDS
REA
JG/LN
Judgment and Lien Documents
JDS
REF
JG/LN
Judgment and Lien Documents
JDS
RML
JG/LN
Judgment and Lien Documents
JDS
RNW
JG/LN
Judgment and Lien Documents
JDS
ROA
JG/LN
Judgment and Lien Documents
JDS
RSN
JG/LN
Judgment and Lien Documents
JDS
RSU
JG/LN
Judgment and Lien Documents
JDS
SCC
JG/LN
Judgment and Lien Documents
JDS
SCR
JG/LN
Judgment and Lien Documents
JDS
SET
JG/LN
Judgment and Lien Documents
JDS
STP
JG/LN
Judgment and Lien Documents
JDS
SUP
JG/LN
Judgment and Lien Documents
JDS
SZE
JG/LN
Judgment and Lien Documents
JDS
TRF
JG/LN
Judgment and Lien Documents
JDS
TXA
JG/LN
Judgment and Lien Documents
LNC
AME
JG/LN
Judgment and Lien Documents
LNC
ATY
JG/LN
Judgment and Lien Documents
LNC
BRC
JG/LN
Judgment and Lien Documents
LNC
BRL
JG/LN
Judgment and Lien Documents
LNC
CDR
JG/LN
Judgment and Lien Documents
LNC
COM
JG/LN
Judgment and Lien Documents
LNC
DCH
JG/LN
Judgment and Lien Documents
LNC
DFR
JG/LN
Judgment and Lien Documents
LNC
DSC
JG/LN
Judgment and Lien Documents
LNC
FCL
JG/LN
Judgment and Lien Documents
LNC
HOA
JG/LN
Judgment and Lien Documents
LNC
RAS
JG/LN
Judgment and Lien Documents
LNC
RED
JG/LN
Judgment and Lien Documents
LNC
REI
JG/LN
Judgment and Lien Documents
LNC
REV
JG/LN
Judgment and Lien Documents
LNC
RND
JG/LN
Judgment and Lien Documents
LNC
RSN
JG/LN
Judgment and Lien Documents
LNC
RSR
JG/LN
Judgment and Lien Documents
LNC
RSU
JG/LN
Judgment and Lien Documents
LNC
RVC
JG/LN
Judgment and Lien Documents
LNC
RVR
JG/LN
Judgment and Lien Documents
LNC
SBD
JG/LN
Judgment and Lien Documents
LNC
STT
JG/LN
Judgment and Lien Documents
LNC
SZE
JG/LN
Judgment and Lien Documents
LNC
TRF
JG/LN
Judgment and Lien Documents
LNC
TSL
JG/LN
Judgment and Lien Documents
LNC
VAC
JG/LN
Judgment and Lien Documents
LNC
WAT
JG/LN
Judgment and Lien Documents
LNF
AME
JG/LN
Judgment and Lien Documents
LNF
ATY
JG/LN
Judgment and Lien Documents
LNF
BRC
JG/LN
Judgment and Lien Documents
LNF
BRL
JG/LN
Judgment and Lien Documents
LNF
CDR
JG/LN
Judgment and Lien Documents
LNF
COM
JG/LN
Judgment and Lien Documents
LNF
DFR
JG/LN
Judgment and Lien Documents
LNF
DSC
JG/LN
Judgment and Lien Documents
LNF
FCL
JG/LN
Judgment and Lien Documents
LNF
HOA
JG/LN
Judgment and Lien Documents
LNF
RAS
JG/LN
Judgment and Lien Documents
LNF
RDM
JG/LN
Judgment and Lien Documents
LNF
RED
JG/LN
Judgment and Lien Documents
LNF
REV
JG/LN
Judgment and Lien Documents
LNF
RND
JG/LN
Judgment and Lien Documents
LNF
RSN
JG/LN
Judgment and Lien Documents
LNF
RSR
JG/LN
Judgment and Lien Documents
LNF
RSU
JG/LN
Judgment and Lien Documents
LNF
STT
JG/LN
Judgment and Lien Documents
LNF
SZE
JG/LN
Judgment and Lien Documents
LNF
TRF
JG/LN
Judgment and Lien Documents
LNF
TSL
JG/LN
Judgment and Lien Documents
LNF
WAT
JG/LN
Judgment and Lien Documents
LNH
AME
JG/LN
Judgment and Lien Documents
LNH
ATY
JG/LN
Judgment and Lien Documents
LNH
BRC
JG/LN
Judgment and Lien Documents
LNH
BRL
JG/LN
Judgment and Lien Documents
LNH
CAN
JG/LN
Judgment and Lien Documents
LNH
CDR
JG/LN
Judgment and Lien Documents
LNH
CNT
JG/LN
Judgment and Lien Documents
LNH
COM
JG/LN
Judgment and Lien Documents
LNH
DFL
JG/LN
Judgment and Lien Documents
LNH
DFR
JG/LN
Judgment and Lien Documents
LNH
DSC
JG/LN
Judgment and Lien Documents
LNH
ERR
JG/LN
Judgment and Lien Documents
LNH
EXT
JG/LN
Judgment and Lien Documents
LNH
FCL
JG/LN
Judgment and Lien Documents
LNH
HOA
JG/LN
Judgment and Lien Documents
LNH
INV
JG/LN
Judgment and Lien Documents
LNH
MOD
JG/LN
Judgment and Lien Documents
LNH
RAS
JG/LN
Judgment and Lien Documents
LNH
RDM
JG/LN
Judgment and Lien Documents
LNH
RED
JG/LN
Judgment and Lien Documents
LNH
REI
JG/LN
Judgment and Lien Documents
LNH
REV
JG/LN
Judgment and Lien Documents
LNH
RML
JG/LN
Judgment and Lien Documents
LNH
RND
JG/LN
Judgment and Lien Documents
LNH
RSN
JG/LN
Judgment and Lien Documents
LNH
RSR
JG/LN
Judgment and Lien Documents
LNH
RSU
JG/LN
Judgment and Lien Documents
LNH
RVC
JG/LN
Judgment and Lien Documents
LNH
RVR
JG/LN
Judgment and Lien Documents
LNH
SBD
JG/LN
Judgment and Lien Documents
LNH
STT
JG/LN
Judgment and Lien Documents
LNH
SZE
JG/LN
Judgment and Lien Documents
LNH
TRF
JG/LN
Judgment and Lien Documents
LNH
TSL
JG/LN
Judgment and Lien Documents
LNH
VAC
JG/LN
Judgment and Lien Documents
LNH
WAT
JG/LN
Judgment and Lien Documents
LNH
WDW
JG/LN
Judgment and Lien Documents
LVY
ABD
JG/LN
Judgment and Lien Documents
LVY
COM
JG/LN
Judgment and Lien Documents
LVY
DFL
JG/LN
Judgment and Lien Documents
LVY
DFR
JG/LN
Judgment and Lien Documents
LVY
DSM
JG/LN
Judgment and Lien Documents
LVY
EXP
JG/LN
Judgment and Lien Documents
LVY
QUI
JG/LN
Judgment and Lien Documents
LVY
RAD
JG/LN
Judgment and Lien Documents
LVY
SUP
JG/LN
Judgment and Lien Documents
LVY
TSL
JG/LN
Judgment and Lien Documents
MLB
ABD
JG/LN
Judgment and Lien Documents
MLB
AME
JG/LN
Judgment and Lien Documents
MLB
ATY
JG/LN
Judgment and Lien Documents
MLB
BRC
JG/LN
Judgment and Lien Documents
MLB
BRL
JG/LN
Judgment and Lien Documents
MLB
CDR
JG/LN
Judgment and Lien Documents
MLB
CNT
JG/LN
Judgment and Lien Documents
MLB
COM
JG/LN
Judgment and Lien Documents
MLB
DFL
JG/LN
Judgment and Lien Documents
MLB
DFR
JG/LN
Judgment and Lien Documents
MLB
DSC
JG/LN
Judgment and Lien Documents
MLB
DSM
JG/LN
Judgment and Lien Documents
MLB
ERR
JG/LN
Judgment and Lien Documents
MLB
EXP
JG/LN
Judgment and Lien Documents
MLB
EXT
JG/LN
Judgment and Lien Documents
MLB
HOA
JG/LN
Judgment and Lien Documents
MLB
INV
JG/LN
Judgment and Lien Documents
MLB
QUI
JG/LN
Judgment and Lien Documents
MLB
RAD
JG/LN
Judgment and Lien Documents
MLB
RAS
JG/LN
Judgment and Lien Documents
MLB
RDM
JG/LN
Judgment and Lien Documents
MLB
RED
JG/LN
Judgment and Lien Documents
MLB
REI
JG/LN
Judgment and Lien Documents
MLB
RND
JG/LN
Judgment and Lien Documents
MLB
RNW
JG/LN
Judgment and Lien Documents
MLB
RSN
JG/LN
Judgment and Lien Documents
MLB
RSR
JG/LN
Judgment and Lien Documents
MLB
RSU
JG/LN
Judgment and Lien Documents
MLB
RVR
JG/LN
Judgment and Lien Documents
MLB
STT
JG/LN
Judgment and Lien Documents
MLB
SUP
JG/LN
Judgment and Lien Documents
MLB
SZE
JG/LN
Judgment and Lien Documents
MLB
TRF
JG/LN
Judgment and Lien Documents
MLB
TSL
JG/LN
Judgment and Lien Documents
MLB
VAC
JG/LN
Judgment and Lien Documents
MLB
WAT
JG/LN
Judgment and Lien Documents
MLN
ABD
JG/LN
Judgment and Lien Documents
MLN
AME
JG/LN
Judgment and Lien Documents
MLN
ATY
JG/LN
Judgment and Lien Documents
MLN
BRC
JG/LN
Judgment and Lien Documents
MLN
COM
JG/LN
Judgment and Lien Documents
MLN
DFL
JG/LN
Judgment and Lien Documents
MLN
DFR
JG/LN
Judgment and Lien Documents
MLN
DSC
JG/LN
Judgment and Lien Documents
MLN
DSM
JG/LN
Judgment and Lien Documents
MLN
HOA
JG/LN
Judgment and Lien Documents
MLN
INV
JG/LN
Judgment and Lien Documents
MLN
QUI
JG/LN
Judgment and Lien Documents
MLN
RAS
JG/LN
Judgment and Lien Documents
MLN
RDM
JG/LN
Judgment and Lien Documents
MLN
RED
JG/LN
Judgment and Lien Documents
MLN
RND
JG/LN
Judgment and Lien Documents
MLN
RSN
JG/LN
Judgment and Lien Documents
MLN
RSR
JG/LN
Judgment and Lien Documents
MLN
RSU
JG/LN
Judgment and Lien Documents
MLN
RVR
JG/LN
Judgment and Lien Documents
MLN
STT
JG/LN
Judgment and Lien Documents
MLN
SZE
JG/LN
Judgment and Lien Documents
MLN
TRF
JG/LN
Judgment and Lien Documents
MLN
TSL
JG/LN
Judgment and Lien Documents
MLN
WAT
JG/LN
Judgment and Lien Documents
MNG
AME
JG/LN
Judgment and Lien Documents
MNG
ATY
JG/LN
Judgment and Lien Documents
MNG
BRC
JG/LN
Judgment and Lien Documents
MNG
BRL
JG/LN
Judgment and Lien Documents
MNG
CDR
JG/LN
Judgment and Lien Documents
MNG
COM
JG/LN
Judgment and Lien Documents
MNG
DCH
JG/LN
Judgment and Lien Documents
MNG
DFL
JG/LN
Judgment and Lien Documents
MNG
DFR
JG/LN
Judgment and Lien Documents
MNG
DSC
JG/LN
Judgment and Lien Documents
MNG
ERR
JG/LN
Judgment and Lien Documents
MNG
FCL
JG/LN
Judgment and Lien Documents
MNG
HOA
JG/LN
Judgment and Lien Documents
MNG
INV
JG/LN
Judgment and Lien Documents
MNG
RDM
JG/LN
Judgment and Lien Documents
MNG
RED
JG/LN
Judgment and Lien Documents
MNG
RND
JG/LN
Judgment and Lien Documents
MNG
RNW
JG/LN
Judgment and Lien Documents
MNG
RSN
JG/LN
Judgment and Lien Documents
MNG
RSR
JG/LN
Judgment and Lien Documents
MNG
RSU
JG/LN
Judgment and Lien Documents
MNG
RVC
JG/LN
Judgment and Lien Documents
MNG
RVR
JG/LN
Judgment and Lien Documents
MNG
STT
JG/LN
Judgment and Lien Documents
MNG
SZE
JG/LN
Judgment and Lien Documents
MNG
TSL
JG/LN
Judgment and Lien Documents
MNG
VAC
JG/LN
Judgment and Lien Documents
MNG
WAT
JG/LN
Judgment and Lien Documents
NOL
ABD
JG/LN
Judgment and Lien Documents
NOL
AME
JG/LN
Judgment and Lien Documents
NOL
ATY
JG/LN
Judgment and Lien Documents
NOL
BRC
JG/LN
Judgment and Lien Documents
NOL
BRL
JG/LN
Judgment and Lien Documents
NOL
CDR
JG/LN
Judgment and Lien Documents
NOL
COM
JG/LN
Judgment and Lien Documents
NOL
DFR
JG/LN
Judgment and Lien Documents
NOL
DSC
JG/LN
Judgment and Lien Documents
NOL
DSM
JG/LN
Judgment and Lien Documents
NOL
ERR
JG/LN
Judgment and Lien Documents
NOL
EXP
JG/LN
Judgment and Lien Documents
NOL
HOA
JG/LN
Judgment and Lien Documents
NOL
INV
JG/LN
Judgment and Lien Documents
NOL
QUI
JG/LN
Judgment and Lien Documents
NOL
RAD
JG/LN
Judgment and Lien Documents
NOL
RAS
JG/LN
Judgment and Lien Documents
NOL
RDM
JG/LN
Judgment and Lien Documents
NOL
RED
JG/LN
Judgment and Lien Documents
NOL
RNW
JG/LN
Judgment and Lien Documents
NOL
RSR
JG/LN
Judgment and Lien Documents
NOL
RSU
JG/LN
Judgment and Lien Documents
NOL
RVR
JG/LN
Judgment and Lien Documents
NOL
STT
JG/LN
Judgment and Lien Documents
NOL
SUP
JG/LN
Judgment and Lien Documents
NOL
SZE
JG/LN
Judgment and Lien Documents
NOL
TRF
JG/LN
Judgment and Lien Documents
NOL
WAT
JG/LN
Judgment and Lien Documents
PPT
ABD
JG/LN
Judgment and Lien Documents
PPT
ADR
JG/LN
Judgment and Lien Documents
PPT
ANM
JG/LN
Judgment and Lien Documents
PPT
APS
JG/LN
Judgment and Lien Documents
PPT
APT
JG/LN
Judgment and Lien Documents
PPT
ASA
JG/LN
Judgment and Lien Documents
PPT
ATY
JG/LN
Judgment and Lien Documents
PPT
CDM
JG/LN
Judgment and Lien Documents
PPT
CFS
JG/LN
Judgment and Lien Documents
PPT
CMP
JG/LN
Judgment and Lien Documents
PPT
CRD
JG/LN
Judgment and Lien Documents
PPT
CVS
JG/LN
Judgment and Lien Documents
PPT
DDC
JG/LN
Judgment and Lien Documents
PPT
DSC
JG/LN
Judgment and Lien Documents
PPT
DSM
JG/LN
Judgment and Lien Documents
PPT
EST
JG/LN
Judgment and Lien Documents
PPT
EXP
JG/LN
Judgment and Lien Documents
PPT
FCR
JG/LN
Judgment and Lien Documents
PPT
FNL
JG/LN
Judgment and Lien Documents
PPT
FOR
JG/LN
Judgment and Lien Documents
PPT
INA
JG/LN
Judgment and Lien Documents
PPT
INT
JG/LN
Judgment and Lien Documents
PPT
OSL
JG/LN
Judgment and Lien Documents
PPT
POS
JG/LN
Judgment and Lien Documents
PPT
QUI
JG/LN
Judgment and Lien Documents
PPT
RAS
JG/LN
Judgment and Lien Documents
PPT
RAT
JG/LN
Judgment and Lien Documents
PPT
RCA
JG/LN
Judgment and Lien Documents
PPT
REA
JG/LN
Judgment and Lien Documents
PPT
REF
JG/LN
Judgment and Lien Documents
PPT
RML
JG/LN
Judgment and Lien Documents
PPT
RNW
JG/LN
Judgment and Lien Documents
PPT
RST
JG/LN
Judgment and Lien Documents
PPT
RSU
JG/LN
Judgment and Lien Documents
PPT
SCC
JG/LN
Judgment and Lien Documents
PPT
SET
JG/LN
Judgment and Lien Documents
PPT
SRN
JG/LN
Judgment and Lien Documents
PPT
STP
JG/LN
Judgment and Lien Documents
PPT
STT
JG/LN
Judgment and Lien Documents
PPT
SUP
JG/LN
Judgment and Lien Documents
PPT
SZE
JG/LN
Judgment and Lien Documents
PPT
TXA
JG/LN
Judgment and Lien Documents
PPT
WAT
JG/LN
Judgment and Lien Documents
MLN
MOP
JG/LN
Judgment and Lien Documents
ASE
TSL
JG/LN
Judgment and Lien Documents
LNC
DLQ
JG/LN
Judgment and Lien Documents
ASE
FCL
JG/LN
Judgment and Lien Documents
MLN
RLQ
JG/LN
Judgment and Lien Documents
ASE
RSR
JG/LN
Judgment and Lien Documents
MLB
AMR
JG/LN
Judgment and Lien Documents
CLM
AMA
JG/LN
Judgment and Lien Documents
ASE
TSC
JG/LN
Judgment and Lien Documents
ASE
TSM
JG/LN
Judgment and Lien Documents
CAE
REL
JG/LN
Judgment and Lien Documents
LNN
DSM
JG/LN
Judgment and Lien Documents
ASE
REA
JG/LN
Judgment and Lien Documents
ASE
ABD
JG/LN
Judgment and Lien Documents
ASE
REM
JG/LN
Judgment and Lien Documents
BND
SUP
JG/LN
Judgment and Lien Documents
CLM
DSC
JG/LN
Judgment and Lien Documents
JDG
PRC
JG/LN
Judgment and Lien Documents
JDG
RQN
JG/LN
Judgment and Lien Documents
JDG
RUF
JG/LN
Judgment and Lien Documents
LNN
ABD
JG/LN
Judgment and Lien Documents
LNN
ASM
JG/LN
Judgment and Lien Documents
LNN
PRC
JG/LN
Judgment and Lien Documents
LNN
REA
JG/LN
Judgment and Lien Documents
LNN
REC
JG/LN
Judgment and Lien Documents
LNN
RQN
JG/LN
Judgment and Lien Documents
LNN
SFR
JG/LN
Judgment and Lien Documents
LNN
SUB
JG/LN
Judgment and Lien Documents
LNS
REI
JG/LN
Judgment and Lien Documents
LNS
REV
JG/LN
Judgment and Lien Documents
LNS
RSN
JG/LN
Judgment and Lien Documents
LNW
NAM
JG/LN
Judgment and Lien Documents
LNW
RVC
JG/LN
Judgment and Lien Documents
LNW
SBD
JG/LN
Judgment and Lien Documents
MLN
PRC
JG/LN
Judgment and Lien Documents
JDG
AMA
JG/LN
Judgment and Lien Documents
CEL
JG/LN
Judgment and Lien Documents
CEL
AMD
JG/LN
Judgment and Lien Documents
CEL
CAN
JG/LN
Judgment and Lien Documents
CEL
COR
JG/LN
Judgment and Lien Documents
CEL
DSM
JG/LN
Judgment and Lien Documents
CEL
MOD
JG/LN
Judgment and Lien Documents
CEL
PAR
JG/LN
Judgment and Lien Documents
CEL
REL
JG/LN
Judgment and Lien Documents
CEL
SAT
JG/LN
Judgment and Lien Documents
CEL
TER
JG/LN
Judgment and Lien Documents
LNN
REF
JG/LN
Judgment and Lien Documents
LNU
RNW
JG/LN
Judgment and Lien Documents
ASE
RTS
JG/LN
Judgment and Lien Documents
LNA
JG/LN
Judgment and Lien Documents
LNA
AMD
JG/LN
Judgment and Lien Documents
LNA
MOD
JG/LN
Judgment and Lien Documents
LNA
REL
JG/LN
Judgment and Lien Documents
LNA
SAT
JG/LN
Judgment and Lien Documents
ASE
SPC
JG/LN
Judgment and Lien Documents
LNA
ASN
JG/LN
Judgment and Lien Documents
LNA
DCH
JG/LN
Judgment and Lien Documents
LNA
EXT
JG/LN
Judgment and Lien Documents
LNA
PAR
JG/LN
Judgment and Lien Documents
LNA
RRR
JG/LN
Judgment and Lien Documents
LNA
SBD
JG/LN
Judgment and Lien Documents
LNU
SBD
JG/LN
Judgment and Lien Documents
MLN
STP
JG/LN
Judgment and Lien Documents
ASE
PAS
JG/LN
Judgment and Lien Documents
ASE
REC
JG/LN
Judgment and Lien Documents
BND
PRC
JG/LN
Judgment and Lien Documents
BND
REC
JG/LN
Judgment and Lien Documents
FAJ
ADA
JG/LN
Judgment and Lien Documents
FAJ
CAN
JG/LN
Judgment and Lien Documents
FAJ
PRC
JG/LN
Judgment and Lien Documents
FAJ
REC
JG/LN
Judgment and Lien Documents
FAJ
RQN
JG/LN
Judgment and Lien Documents
FAJ
STT
JG/LN
Judgment and Lien Documents
JDG
JTV
JG/LN
Judgment and Lien Documents
JDG
REC
JG/LN
Judgment and Lien Documents
JDG
STT
JG/LN
Judgment and Lien Documents
LNC
PRC
JG/LN
Judgment and Lien Documents
LNC
REC
JG/LN
Judgment and Lien Documents
LNC
RQN
JG/LN
Judgment and Lien Documents
LNF
PRC
JG/LN
Judgment and Lien Documents
LNF
RQN
JG/LN
Judgment and Lien Documents
LNN
APT
JG/LN
Judgment and Lien Documents
LNN
PAY
JG/LN
Judgment and Lien Documents
LNS
JTV
JG/LN
Judgment and Lien Documents
LNS
PRC
JG/LN
Judgment and Lien Documents
LNS
REC
JG/LN
Judgment and Lien Documents
LNS
RQN
JG/LN
Judgment and Lien Documents
LNS
STT
JG/LN
Judgment and Lien Documents
MLN
REC
JG/LN
Judgment and Lien Documents
MLN
RQN
JG/LN
Judgment and Lien Documents
MLN
RSG
JG/LN
Judgment and Lien Documents
ITL
JG/LN
Judgment and Lien Documents
ITL
AMD
JG/LN
Judgment and Lien Documents
ITL
COR
JG/LN
Judgment and Lien Documents
ITL
MOD
JG/LN
Judgment and Lien Documents
ITL
REL
JG/LN
Judgment and Lien Documents
LNO
JG/LN
Judgment and Lien Documents
LNO
AMD
JG/LN
Judgment and Lien Documents
LNO
COR
JG/LN
Judgment and Lien Documents
LNO
MOD
JG/LN
Judgment and Lien Documents
LNO
REL
JG/LN
Judgment and Lien Documents
CAE
SAT
JG/LN
Judgment and Lien Documents
CJG
PAR
JG/LN
Judgment and Lien Documents
FTP
DCH
JG/LN
Judgment and Lien Documents
FTP
MOD
JG/LN
Judgment and Lien Documents
LNA
TER
JG/LN
Judgment and Lien Documents
LNW
RNW
JG/LN
Judgment and Lien Documents
JDG
RVR
JG/LN
Judgment and Lien Documents
MEJ
RVR
JG/LN
Judgment and Lien Documents
JDF
JG/LN
Judgment and Lien Documents
JDF
CAN
JG/LN
Judgment and Lien Documents
JDF
CDM
JG/LN
Judgment and Lien Documents
JDF
DFL
JG/LN
Judgment and Lien Documents
JDF
FCL
JG/LN
Judgment and Lien Documents
JDF
QUI
JG/LN
Judgment and Lien Documents
JDF
REL
JG/LN
Judgment and Lien Documents
JDF
STP
JG/LN
Judgment and Lien Documents
JDF
WDW
JG/LN
Judgment and Lien Documents
JDG
AOA
JG/LN
Judgment and Lien Documents
ASE
SUP
JG/LN
Judgment and Lien Documents
ITL
PAR
JG/LN
Judgment and Lien Documents
ITL
REF
JG/LN
Judgment and Lien Documents
JDG
PAC
JG/LN
Judgment and Lien Documents
JDG
RAD
JG/LN
Judgment and Lien Documents
JDG
TST
JG/LN
Judgment and Lien Documents
LNF
RAD
JG/LN
Judgment and Lien Documents
LNF
SDV
JG/LN
Judgment and Lien Documents
LNN
ANX
JG/LN
Judgment and Lien Documents
LNS
RAD
JG/LN
Judgment and Lien Documents
LNS
REF
JG/LN
Judgment and Lien Documents
ASE
ACC
JG/LN
Judgment and Lien Documents
ASE
ANX
JG/LN
Judgment and Lien Documents
ASE
ASA
JG/LN
Judgment and Lien Documents
ASE
DIS
JG/LN
Judgment and Lien Documents
ASE
RAM
JG/LN
Judgment and Lien Documents
ASE
SFR
JG/LN
Judgment and Lien Documents
BND
SFR
JG/LN
Judgment and Lien Documents
JDC
PAY
JG/LN
Judgment and Lien Documents
JDC
REC
JG/LN
Judgment and Lien Documents
JDC
SFR
JG/LN
Judgment and Lien Documents
JDG
ACC
JG/LN
Judgment and Lien Documents
JDG
ADD
JG/LN
Judgment and Lien Documents
JDG
CMP
JG/LN
Judgment and Lien Documents
JDG
PRE
JG/LN
Judgment and Lien Documents
JDG
QSH
JG/LN
Judgment and Lien Documents
JDG
RAM
JG/LN
Judgment and Lien Documents
JDG
RPR
JG/LN
Judgment and Lien Documents
JDG
SFR
JG/LN
Judgment and Lien Documents
LNA
REC
JG/LN
Judgment and Lien Documents
LNA
SFR
JG/LN
Judgment and Lien Documents
LNC
ACC
JG/LN
Judgment and Lien Documents
LNC
AMA
JG/LN
Judgment and Lien Documents
LNC
ASA
JG/LN
Judgment and Lien Documents
LNC
EXP
JG/LN
Judgment and Lien Documents
LNC
RAM
JG/LN
Judgment and Lien Documents
LNC
SFR
JG/LN
Judgment and Lien Documents
LNF
ACC
JG/LN
Judgment and Lien Documents
LNF
ASA
JG/LN
Judgment and Lien Documents
LNF
PAY
JG/LN
Judgment and Lien Documents
LNF
SFR
JG/LN
Judgment and Lien Documents
LNF
SUP
JG/LN
Judgment and Lien Documents
LNN
ACC
JG/LN
Judgment and Lien Documents
LNN
EXP
JG/LN
Judgment and Lien Documents
LNN
RAM
JG/LN
Judgment and Lien Documents
LNP
RAS
JG/LN
Judgment and Lien Documents
LNP
REC
JG/LN
Judgment and Lien Documents
LNP
SFR
JG/LN
Judgment and Lien Documents
LNS
ACC
JG/LN
Judgment and Lien Documents
LNS
ASA
JG/LN
Judgment and Lien Documents
LNS
AST
JG/LN
Judgment and Lien Documents
LNS
SFR
JG/LN
Judgment and Lien Documents
LNW
REC
JG/LN
Judgment and Lien Documents
LNW
REI
JG/LN
Judgment and Lien Documents
LVY
REC
JG/LN
Judgment and Lien Documents
MLN
ACC
JG/LN
Judgment and Lien Documents
MLN
ADD
JG/LN
Judgment and Lien Documents
MLN
ASA
JG/LN
Judgment and Lien Documents
MLN
SFR
JG/LN
Judgment and Lien Documents
MNG
WDW
JG/LN
Judgment and Lien Documents
ASE
RAS
JG/LN
Judgment and Lien Documents
ITL
ACC
JG/LN
Judgment and Lien Documents
ITL
PAY
JG/LN
Judgment and Lien Documents
JDG
MOP
JG/LN
Judgment and Lien Documents
JDG
RCL
JG/LN
Judgment and Lien Documents
LNC
NAT
JG/LN
Judgment and Lien Documents
LNN
NAT
JG/LN
Judgment and Lien Documents
LNS
DIS
JG/LN
Judgment and Lien Documents
LNS
NAT
JG/LN
Judgment and Lien Documents
MLN
NAT
JG/LN
Judgment and Lien Documents
MLN
REF
JG/LN
Judgment and Lien Documents
CJG
SMI
JG/LN
Judgment and Lien Documents
CRJ
SMI
JG/LN
Judgment and Lien Documents
FAJ
SMI
JG/LN
Judgment and Lien Documents
FTP
SMI
JG/LN
Judgment and Lien Documents
JDC
SMI
JG/LN
Judgment and Lien Documents
JDG
SMI
JG/LN
Judgment and Lien Documents
JDJ
SMI
JG/LN
Judgment and Lien Documents
JDS
SMI
JG/LN
Judgment and Lien Documents
MEJ
SMI
JG/LN
Judgment and Lien Documents
JDF
SMI
JG/LN
Judgment and Lien Documents
ADM
JG/LN
Judgment and Lien Documents
ADP
JG/LN
Judgment and Lien Documents
APP
JG/LN
Judgment and Lien Documents
CAV
JG/LN
Judgment and Lien Documents
FTL
JG/LN
Judgment and Lien Documents
HLF
JG/LN
Judgment and Lien Documents
MAG
JG/LN
Judgment and Lien Documents
MLF
JG/LN
Judgment and Lien Documents
MIS
JG/LN
Judgment and Lien Documents
NLF
JG/LN
Judgment and Lien Documents
PTF
JG/LN
Judgment and Lien Documents
LDC
JG/LN
Judgment and Lien Documents
LHA
JG/LN
Judgment and Lien Documents
LHA
ADR
JG/LN
Judgment and Lien Documents
LHA
AMD
JG/LN
Judgment and Lien Documents
LHA
ASN
JG/LN
Judgment and Lien Documents
LHA
CAN
JG/LN
Judgment and Lien Documents
LHA
CLA
JG/LN
Judgment and Lien Documents
LHA
COR
JG/LN
Judgment and Lien Documents
LHA
DFL
JG/LN
Judgment and Lien Documents
LHA
DLQ
JG/LN
Judgment and Lien Documents
LHA
EXT
JG/LN
Judgment and Lien Documents
LHA
MOD
JG/LN
Judgment and Lien Documents
LHA
PAA
JG/LN
Judgment and Lien Documents
LHA
PAR
JG/LN
Judgment and Lien Documents
LHA
RAD
JG/LN
Judgment and Lien Documents
LHA
RAS
JG/LN
Judgment and Lien Documents
LHA
REL
JG/LN
Judgment and Lien Documents
LHA
REM
JG/LN
Judgment and Lien Documents
LHA
RML
JG/LN
Judgment and Lien Documents
LHA
RND
JG/LN
Judgment and Lien Documents
LHA
RNW
JG/LN
Judgment and Lien Documents
LHA
RRR
JG/LN
Judgment and Lien Documents
LHA
RSN
JG/LN
Judgment and Lien Documents
LHA
RSR
JG/LN
Judgment and Lien Documents
LHA
RTS
JG/LN
Judgment and Lien Documents
LHA
RVC
JG/LN
Judgment and Lien Documents
LHA
SAT
JG/LN
Judgment and Lien Documents
LHA
SBD
JG/LN
Judgment and Lien Documents
LHA
STT
JG/LN
Judgment and Lien Documents
LHA
TER
JG/LN
Judgment and Lien Documents
LHA
TSC
JG/LN
Judgment and Lien Documents
LHA
TSL
JG/LN
Judgment and Lien Documents
JDF
DSM
JG/LN
Judgment and Lien Documents
JDF
PAR
JG/LN
Judgment and Lien Documents
JDF
REV
JG/LN
Judgment and Lien Documents
JDF
RNW
JG/LN
Judgment and Lien Documents
JDF
SAT
JG/LN
Judgment and Lien Documents
JDF
SUP
JG/LN
Judgment and Lien Documents
JDF
DIS
JG/LN
Judgment and Lien Documents
LNO
PAR
JG/LN
Judgment and Lien Documents
JDF
MOD
JG/LN
Judgment and Lien Documents
LCF
JG/LN
Judgment and Lien Documents
CLF
JG/LN
Judgment and Lien Documents
CLF
PAR
JG/LN
Judgment and Lien Documents
CLF
REL
JG/LN
Judgment and Lien Documents
CLF
SBD
JG/LN
Judgment and Lien Documents
WAF
JG/LN
Judgment and Lien Documents
WAF
AMD
JG/LN
Judgment and Lien Documents
WAF
ASM
JG/LN
Judgment and Lien Documents
WAF
ASN
JG/LN
Judgment and Lien Documents
WAF
CLA
JG/LN
Judgment and Lien Documents
WAF
COA
JG/LN
Judgment and Lien Documents
WAF
COR
JG/LN
Judgment and Lien Documents
WAF
EXT
JG/LN
Judgment and Lien Documents
WAF
MOD
JG/LN
Judgment and Lien Documents
WAF
PAA
JG/LN
Judgment and Lien Documents
WAF
PAR
JG/LN
Judgment and Lien Documents
WAF
RAS
JG/LN
Judgment and Lien Documents
WAF
REL
JG/LN
Judgment and Lien Documents
WAF
SAT
JG/LN
Judgment and Lien Documents
WAF
SBD
JG/LN
Judgment and Lien Documents
WAF
TER
JG/LN
Judgment and Lien Documents
CLM
SBD
JG/LN
Judgment and Lien Documents
ITL
SAT
JG/LN
Judgment and Lien Documents
JDF
AMD
JG/LN
Judgment and Lien Documents
JDF
ASN
JG/LN
Judgment and Lien Documents
JDF
COR
JG/LN
Judgment and Lien Documents
JDF
EXT
JG/LN
Judgment and Lien Documents
JDF
RRR
JG/LN
Judgment and Lien Documents
JDF
SBD
JG/LN
Judgment and Lien Documents
JDF
TER
JG/LN
Judgment and Lien Documents
JDF
VAC
JG/LN
Judgment and Lien Documents
LNA
COR
JG/LN
Judgment and Lien Documents
PTF
VAC
JG/LN
Judgment and Lien Documents
FJF
JG/LN
Judgment and Lien Documents
STL
JG/LN
Judgment and Lien Documents
LID
PAR
JG/LN
Judgment and Lien Documents
FAJ
FOR
JG/LN
Judgment and Lien Documents
FAJ
RNW
Category
Description
Doc Type
Doc Subtype
Leases
Property Docs Leases
LSE
Leases
Property Docs Leases
LSE
AAS
Leases
Property Docs Leases
LSE
AMD
Leases
Property Docs Leases
LSE
ASA
Leases
Property Docs Leases
LSE
ASB
Leases
Property Docs Leases
LSE
ASM
Leases
Property Docs Leases
LSE
ASN
Leases
Property Docs Leases
LSE
CAN
Leases
Property Docs Leases
LSE
CNT
Leases
Property Docs Leases
LSE
COR
Leases
Property Docs Leases
LSE
DFL
Leases
Property Docs Leases
LSE
EXT
Leases
Property Docs Leases
LSE
MOD
Leases
Property Docs Leases
LSE
PAR
Leases
Property Docs Leases
LSE
RAS
Leases
Property Docs Leases
LSE
REL
Leases
Property Docs Leases
LSE
REV
Leases
Property Docs Leases
LSE
RRR
Leases
Property Docs Leases
LSE
RSN
Leases
Property Docs Leases
LSE
RVC
Leases
Property Docs Leases
LSE
SBD
Leases
Property Docs Leases
LSE
TER
Leases
Property Docs Leases
LSO
Leases
Property Docs Leases
LSO
AAS
Leases
Property Docs Leases
LSO
AMD
Leases
Property Docs Leases
LSO
ASA
Leases
Property Docs Leases
LSO
ASB
Leases
Property Docs Leases
LSO
ASM
Leases
Property Docs Leases
LSO
ASN
Leases
Property Docs Leases
LSO
CAN
Leases
Property Docs Leases
LSO
CNT
Leases
Property Docs Leases
LSO
COR
Leases
Property Docs Leases
LSO
DFL
Leases
Property Docs Leases
LSO
EXT
Leases
Property Docs Leases
LSO
MOD
Leases
Property Docs Leases
LSO
PAR
Leases
Property Docs Leases
LSO
RAS
Leases
Property Docs Leases
LSO
REL
Leases
Property Docs Leases
LSO
REV
Leases
Property Docs Leases
LSO
RRR
Leases
Property Docs Leases
LSO
RSN
Leases
Property Docs Leases
LSO
RVC
Leases
Property Docs Leases
LSO
SBD
Leases
Property Docs Leases
LSO
TER
Leases
Property Docs Leases
LSE
RSU
Leases
Property Docs Leases
LSO
SRN
Leases
Property Docs Leases
LSE
CAA
Leases
Property Docs Leases
LSE
ADR
Leases
Property Docs Leases
LSE
AMA
Leases
Property Docs Leases
LSE
AMB
Leases
Property Docs Leases
LSE
AME
Leases
Property Docs Leases
LSE
AMO
Leases
Property Docs Leases
LSE
ARS
Leases
Property Docs Leases
LSE
CLA
Leases
Property Docs Leases
LSE
COA
Leases
Property Docs Leases
LSE
DSC
Leases
Property Docs Leases
LSE
ERR
Leases
Property Docs Leases
LSE
NDV
Leases
Property Docs Leases
LSE
PAA
Leases
Property Docs Leases
LSE
PAC
Leases
Property Docs Leases
LSE
PCA
Leases
Property Docs Leases
LSE
PTT
Leases
Property Docs Leases
LSE
RAT
Leases
Property Docs Leases
LSE
RCA
Leases
Property Docs Leases
LSE
REA
Leases
Property Docs Leases
LSE
REN
Leases
Property Docs Leases
LSE
RML
Leases
Property Docs Leases
LSE
RNW
Leases
Property Docs Leases
LSE
SRN
Leases
Property Docs Leases
LSE
SUB
Leases
Property Docs Leases
LSE
SUP
Leases
Property Docs Leases
LSE
TEA
Leases
Property Docs Leases
LSE
TRF
Leases
Property Docs Leases
LSE
WAT
Leases
Property Docs Leases
LSE
WDW
Leases
Property Docs Leases
LSO
REA
Leases
Property Docs Leases
LSE
PRA
Leases
Property Docs Leases
LSE
REI
Leases
Property Docs Leases
LSE
VAC
Leases
Property Docs Leases
LSE
TES
Leases
Property Docs Leases
LSE
RAD
Leases
Property Docs Leases
LSE
ABD
Leases
Property Docs Leases
LSE
EXM
Leases
Property Docs Leases
LSE
RFR
Leases
Property Docs Leases
LSE
RUF
Leases
Property Docs Leases
LSO
PAA
Leases
Property Docs Leases
LSO
RAT
Leases
Property Docs Leases
LSO
COA
Leases
Property Docs Leases
LSE
BRC
Leases
Property Docs Leases
LSO
CSL
Leases
Property Docs Leases
LSE
FOR
Leases
Property Docs Leases
LSE
ACC
Leases
Property Docs Leases
LSE
DCH
Leases
Property Docs Leases
LSE
PRC
Leases
Property Docs Leases
LSE
REC
Leases
Property Docs Leases
LSE
RLQ
Leases
Property Docs Leases
LSE
SAT
Leases
Property Docs Leases
LSE
ASR
Leases
Property Docs Leases
LSE
RAF
Leases
Property Docs Leases
LSE
RQN
Leases
Property Docs Leases
LSE
STT
Leases
Property Docs Leases
LSE
AOA
Leases
Property Docs Leases
LSE
EAS
Leases
Property Docs Leases
LSE
RST
Leases
Property Docs Leases
LSO
CAA
Leases
Property Docs Leases
LSO
RLQ
Leases
Property Docs Leases
LSO
SUP
Leases
Property Docs Leases
LSE
AST
Leases
Property Docs Leases
LSE
ATY
Leases
Property Docs Leases
LSE
EXP
Leases
Property Docs Leases
LSE
SBA
Leases
Property Docs Leases
LSE
SFR
Leases
Property Docs Leases
LSE
AMR
Leases
Property Docs Leases
LSE
RSR
Leases
Property Docs Leases
LSO
EXM
Category
Description
Doc Type
Doc Subtype
Loans
Mortgage Documents
AOR
Loans
Mortgage Documents
AOR
AMD
Loans
Mortgage Documents
AOR
ASM
Loans
Mortgage Documents
AOR
ASN
Loans
Mortgage Documents
AOR
CAN
Loans
Mortgage Documents
AOR
MOD
Loans
Mortgage Documents
AOR
PAR
Loans
Mortgage Documents
AOR
PRE
Loans
Mortgage Documents
AOR
REA
Loans
Mortgage Documents
AOR
REL
Loans
Mortgage Documents
AOR
REV
Loans
Mortgage Documents
AOR
RRR
Loans
Mortgage Documents
AOR
TER
Loans
Mortgage Documents
AOR
WDW
Loans
Mortgage Documents
CMT
Loans
Mortgage Documents
CMT
AMD
Loans
Mortgage Documents
CMT
ASN
Loans
Mortgage Documents
CMT
PAR
Loans
Mortgage Documents
CMT
REL
Loans
Mortgage Documents
CMT
RRR
Loans
Mortgage Documents
MTG
Loans
Mortgage Documents
MTG
AAS
Loans
Mortgage Documents
MTG
ADV
Loans
Mortgage Documents
MTG
AMA
Loans
Mortgage Documents
MTG
AMB
Loans
Mortgage Documents
MTG
AMD
Loans
Mortgage Documents
MTG
AME
Loans
Mortgage Documents
MTG
AMO
Loans
Mortgage Documents
MTG
AMR
Loans
Mortgage Documents
MTG
ASA
Loans
Mortgage Documents
MTG
ASB
Loans
Mortgage Documents
MTG
ASM
Loans
Mortgage Documents
MTG
ASN
Loans
Mortgage Documents
MTG
COR
Loans
Mortgage Documents
MTG
EXT
Loans
Mortgage Documents
MTG
FCL
Loans
Mortgage Documents
MTG
MOD
Loans
Mortgage Documents
MTG
MOP
Loans
Mortgage Documents
MTG
PAR
Loans
Mortgage Documents
MTG
RAD
Loans
Mortgage Documents
MTG
RAM
Loans
Mortgage Documents
MTG
RAS
Loans
Mortgage Documents
MTG
RCA
Loans
Mortgage Documents
MTG
REA
Loans
Mortgage Documents
MTG
REL
Loans
Mortgage Documents
MTG
REV
Loans
Mortgage Documents
MTG
RRM
Loans
Mortgage Documents
MTG
RRR
Loans
Mortgage Documents
MTG
RSM
Loans
Mortgage Documents
MTG
RSU
Loans
Mortgage Documents
MTG
SAT
Loans
Mortgage Documents
MTG
SBD
Loans
Mortgage Documents
MTG
SUP
Loans
Mortgage Documents
MTG
TES
Loans
Mortgage Documents
TDA
Loans
Mortgage Documents
TDA
AAS
Loans
Mortgage Documents
TDA
ADA
Loans
Mortgage Documents
TDA
AMA
Loans
Mortgage Documents
TDA
AMB
Loans
Mortgage Documents
TDA
AMD
Loans
Mortgage Documents
TDA
AME
Loans
Mortgage Documents
TDA
AMO
Loans
Mortgage Documents
TDA
AMR
Loans
Mortgage Documents
TDA
ASA
Loans
Mortgage Documents
TDA
ASB
Loans
Mortgage Documents
TDA
ASM
Loans
Mortgage Documents
TDA
ASN
Loans
Mortgage Documents
TDA
ASR
Loans
Mortgage Documents
TDA
AST
Loans
Mortgage Documents
TDA
CAN
Loans
Mortgage Documents
TDA
CDA
Loans
Mortgage Documents
TDA
CLA
Loans
Mortgage Documents
TDA
COA
Loans
Mortgage Documents
TDA
DFL
Loans
Mortgage Documents
TDA
DSC
Loans
Mortgage Documents
TDA
EXT
Loans
Mortgage Documents
TDA
FCL
Loans
Mortgage Documents
TDA
MOD
Loans
Mortgage Documents
TDA
MOP
Loans
Mortgage Documents
TDA
PAA
Loans
Mortgage Documents
TDA
PAR
Loans
Mortgage Documents
TDA
PCA
Loans
Mortgage Documents
TDA
PRC
Loans
Mortgage Documents
TDA
RAD
Loans
Mortgage Documents
TDA
RAM
Loans
Mortgage Documents
TDA
RAS
Loans
Mortgage Documents
TDA
RCA
Loans
Mortgage Documents
TDA
REA
Loans
Mortgage Documents
TDA
REC
Loans
Mortgage Documents
TDA
REI
Loans
Mortgage Documents
TDA
REL
Loans
Mortgage Documents
TDA
REN
Loans
Mortgage Documents
TDA
RQP
Loans
Mortgage Documents
TDA
RQN
Loans
Mortgage Documents
TDA
RRM
Loans
Mortgage Documents
TDA
RRR
Loans
Mortgage Documents
TDA
RSM
Loans
Mortgage Documents
TDA
RSN
Loans
Mortgage Documents
TDA
RSR
Loans
Mortgage Documents
TDA
RSU
Loans
Mortgage Documents
TDA
RVC
Loans
Mortgage Documents
TDA
SAS
Loans
Mortgage Documents
TDA
SAT
Loans
Mortgage Documents
TDA
SBD
Loans
Mortgage Documents
TDA
SFR
Loans
Mortgage Documents
TDA
SPR
Loans
Mortgage Documents
TDA
SRR
Loans
Mortgage Documents
TDA
STT
Loans
Mortgage Documents
TDA
SUB
Loans
Mortgage Documents
TDA
SUP
Loans
Mortgage Documents
TDA
TEA
Loans
Mortgage Documents
TDA
TER
Loans
Mortgage Documents
TDA
TES
Loans
Mortgage Documents
TDD
Loans
Mortgage Documents
TDD
AAS
Loans
Mortgage Documents
TDD
ADA
Loans
Mortgage Documents
TDD
AMA
Loans
Mortgage Documents
TDD
AMB
Loans
Mortgage Documents
TDD
AMD
Loans
Mortgage Documents
TDD
AME
Loans
Mortgage Documents
TDD
AMO
Loans
Mortgage Documents
TDD
AMR
Loans
Mortgage Documents
TDD
ASA
Loans
Mortgage Documents
TDD
ASB
Loans
Mortgage Documents
TDD
ASM
Loans
Mortgage Documents
TDD
ASN
Loans
Mortgage Documents
TDD
ASR
Loans
Mortgage Documents
TDD
AST
Loans
Mortgage Documents
TDD
CAN
Loans
Mortgage Documents
TDD
CDA
Loans
Mortgage Documents
TDD
CLA
Loans
Mortgage Documents
TDD
CNT
Loans
Mortgage Documents
TDD
COA
Loans
Mortgage Documents
TDD
DFL
Loans
Mortgage Documents
TDD
DSC
Loans
Mortgage Documents
TDD
EXT
Loans
Mortgage Documents
TDD
FCL
Loans
Mortgage Documents
TDD
MOD
Loans
Mortgage Documents
TDD
MOP
Loans
Mortgage Documents
TDD
PAA
Loans
Mortgage Documents
TDD
PAR
Loans
Mortgage Documents
TDD
PCA
Loans
Mortgage Documents
TDD
PRC
Loans
Mortgage Documents
TDD
RAD
Loans
Mortgage Documents
TDD
RAM
Loans
Mortgage Documents
TDD
RAS
Loans
Mortgage Documents
TDD
RCA
Loans
Mortgage Documents
TDD
REA
Loans
Mortgage Documents
TDD
REC
Loans
Mortgage Documents
TDD
REI
Loans
Mortgage Documents
TDD
REL
Loans
Mortgage Documents
TDD
REN
Loans
Mortgage Documents
TDD
RND
Loans
Mortgage Documents
TDD
RQP
Loans
Mortgage Documents
TDD
RQN
Loans
Mortgage Documents
TDD
RRM
Loans
Mortgage Documents
TDD
RRR
Loans
Mortgage Documents
TDD
RSM
Loans
Mortgage Documents
TDD
RSN
Loans
Mortgage Documents
TDD
RSR
Loans
Mortgage Documents
TDD
RSU
Loans
Mortgage Documents
TDD
RVC
Loans
Mortgage Documents
TDD
SAS
Loans
Mortgage Documents
TDD
SAT
Loans
Mortgage Documents
TDD
SBD
Loans
Mortgage Documents
TDD
SFR
Loans
Mortgage Documents
TDD
SPR
Loans
Mortgage Documents
TDD
SRR
Loans
Mortgage Documents
TDD
STT
Loans
Mortgage Documents
TDD
SUB
Loans
Mortgage Documents
TDD
SUP
Loans
Mortgage Documents
TDD
TEA
Loans
Mortgage Documents
TDD
TER
Loans
Mortgage Documents
TDD
TES
Loans
Mortgage Documents
TDR
Loans
Mortgage Documents
TDR
AAS
Loans
Mortgage Documents
TDR
ADA
Loans
Mortgage Documents
TDR
AMA
Loans
Mortgage Documents
TDR
AMB
Loans
Mortgage Documents
TDR
AMD
Loans
Mortgage Documents
TDR
AME
Loans
Mortgage Documents
TDR
AMO
Loans
Mortgage Documents
TDR
AMR
Loans
Mortgage Documents
TDR
ASA
Loans
Mortgage Documents
TDR
ASB
Loans
Mortgage Documents
TDR
ASM
Loans
Mortgage Documents
TDR
ASN
Loans
Mortgage Documents
TDR
ASR
Loans
Mortgage Documents
TDR
AST
Loans
Mortgage Documents
TDR
CAN
Loans
Mortgage Documents
TDR
CDA
Loans
Mortgage Documents
TDR
CLA
Loans
Mortgage Documents
TDR
COA
Loans
Mortgage Documents
TDR
DFL
Loans
Mortgage Documents
TDR
DSC
Loans
Mortgage Documents
TDR
EXT
Loans
Mortgage Documents
TDR
FCL
Loans
Mortgage Documents
TDR
MOD
Loans
Mortgage Documents
TDR
MOP
Loans
Mortgage Documents
TDR
PAA
Loans
Mortgage Documents
TDR
PAR
Loans
Mortgage Documents
TDR
PCA
Loans
Mortgage Documents
TDR
PRC
Loans
Mortgage Documents
TDR
RAD
Loans
Mortgage Documents
TDR
RAM
Loans
Mortgage Documents
TDR
RAS
Loans
Mortgage Documents
TDR
RCA
Loans
Mortgage Documents
TDR
REA
Loans
Mortgage Documents
TDR
REC
Loans
Mortgage Documents
TDR
REI
Loans
Mortgage Documents
TDR
REL
Loans
Mortgage Documents
TDR
REN
Loans
Mortgage Documents
TDR
RQP
Loans
Mortgage Documents
TDR
RQN
Loans
Mortgage Documents
TDR
RRM
Loans
Mortgage Documents
TDR
RRR
Loans
Mortgage Documents
TDR
RSM
Loans
Mortgage Documents
TDR
RSN
Loans
Mortgage Documents
TDR
RSR
Loans
Mortgage Documents
TDR
RSU
Loans
Mortgage Documents
TDR
RVC
Loans
Mortgage Documents
TDR
SAS
Loans
Mortgage Documents
TDR
SAT
Loans
Mortgage Documents
TDR
SBD
Loans
Mortgage Documents
TDR
SFR
Loans
Mortgage Documents
TDR
SPR
Loans
Mortgage Documents
TDR
SRR
Loans
Mortgage Documents
TDR
STT
Loans
Mortgage Documents
TDR
SUB
Loans
Mortgage Documents
TDR
SUP
Loans
Mortgage Documents
TDR
TEA
Loans
Mortgage Documents
TDR
TER
Loans
Mortgage Documents
TDR
TES
Loans
Mortgage Documents
AOR
AAS
Loans
Mortgage Documents
TDD
ADV
Loans
Mortgage Documents
MTG
DCH
Loans
Mortgage Documents
TDD
DCH
Loans
Mortgage Documents
TDD
RPR
Loans
Mortgage Documents
TDD
TSC
Loans
Mortgage Documents
TDD
COR
Loans
Mortgage Documents
TDD
EXM
Loans
Mortgage Documents
AOR
COA
Loans
Mortgage Documents
AOR
COR
Loans
Mortgage Documents
AOR
PAA
Loans
Mortgage Documents
AOR
PTT
Loans
Mortgage Documents
AOR
RAS
Loans
Mortgage Documents
AOR
SAT
Loans
Mortgage Documents
AOR
SBD
Loans
Mortgage Documents
AOR
STT
Loans
Mortgage Documents
AOR
TRF
Loans
Mortgage Documents
MTG
ADR
Loans
Mortgage Documents
MTG
ASR
Loans
Mortgage Documents
MTG
AST
Loans
Mortgage Documents
MTG
ATT
Loans
Mortgage Documents
MTG
BRC
Loans
Mortgage Documents
MTG
CLA
Loans
Mortgage Documents
MTG
COA
Loans
Mortgage Documents
MTG
DSC
Loans
Mortgage Documents
MTG
ERR
Loans
Mortgage Documents
MTG
EXM
Loans
Mortgage Documents
MTG
MLA
Loans
Mortgage Documents
MTG
MSR
Loans
Mortgage Documents
MTG
PAA
Loans
Mortgage Documents
MTG
PCA
Loans
Mortgage Documents
MTG
REI
Loans
Mortgage Documents
MTG
RML
Loans
Mortgage Documents
MTG
RQN
Loans
Mortgage Documents
MTG
STT
Loans
Mortgage Documents
MTG
SUB
Loans
Mortgage Documents
MTG
TER
Loans
Mortgage Documents
MTG
TSL
Loans
Mortgage Documents
TDD
ABD
Loans
Mortgage Documents
TDD
ADD
Loans
Mortgage Documents
TDD
ADR
Loans
Mortgage Documents
TDD
APT
Loans
Mortgage Documents
TDD
ARS
Loans
Mortgage Documents
TDD
ATT
Loans
Mortgage Documents
TDD
BRC
Loans
Mortgage Documents
TDD
CAA
Loans
Mortgage Documents
TDD
CAR
Loans
Mortgage Documents
TDD
CCO
Loans
Mortgage Documents
TDD
ERR
Loans
Mortgage Documents
TDD
EST
Loans
Mortgage Documents
TDD
MLA
Loans
Mortgage Documents
TDD
MSR
Loans
Mortgage Documents
TDD
PAC
Loans
Mortgage Documents
TDD
PAS
Loans
Mortgage Documents
TDD
POT
Loans
Mortgage Documents
TDD
PRA
Loans
Mortgage Documents
TDD
PTT
Loans
Mortgage Documents
TDD
PUD
Loans
Mortgage Documents
TDD
RAF
Loans
Mortgage Documents
TDD
RAT
Loans
Mortgage Documents
TDD
REV
Loans
Mortgage Documents
TDD
RNC
Loans
Mortgage Documents
TDD
RNW
Loans
Mortgage Documents
TDD
RQR
Loans
Mortgage Documents
TDD
RSG
Loans
Mortgage Documents
TDD
RTS
Loans
Mortgage Documents
TDD
RVR
Loans
Mortgage Documents
TDD
SAC
Loans
Mortgage Documents
TDD
SCR
Loans
Mortgage Documents
TDD
TSL
Loans
Mortgage Documents
TDD
TSM
Loans
Mortgage Documents
TDD
TSP
Loans
Mortgage Documents
AOR
TEA
Loans
Mortgage Documents
AOR
ADR
Loans
Mortgage Documents
AOR
DCH
Loans
Mortgage Documents
AOR
EXT
Loans
Mortgage Documents
AOR
RAT
Loans
Mortgage Documents
AOR
RNW
Loans
Mortgage Documents
AOR
RVC
Loans
Mortgage Documents
AOR
SUP
Loans
Mortgage Documents
MTG
CAN
Loans
Mortgage Documents
MTG
RAT
Loans
Mortgage Documents
MTG
RNW
Loans
Mortgage Documents
MTG
RSR
Loans
Mortgage Documents
MTG
RVC
Loans
Mortgage Documents
MTG
WDW
Loans
Mortgage Documents
TDR
RAT
Loans
Mortgage Documents
AOR
ASA
Loans
Mortgage Documents
TDR
RQR
Loans
Mortgage Documents
TDR
COR
Loans
Mortgage Documents
AOR
CLA
Loans
Mortgage Documents
TDR
DCH
Loans
Mortgage Documents
MTG
TRF
Loans
Mortgage Documents
AOR
RAM
Loans
Mortgage Documents
AOR
AMA
Loans
Mortgage Documents
TDD
DLQ
Loans
Mortgage Documents
TDD
NDV
Loans
Mortgage Documents
TDD
RST
Loans
Mortgage Documents
MTG
SFR
Loans
Mortgage Documents
CMT
COR
Loans
Mortgage Documents
CMT
SAT
Loans
Mortgage Documents
TDA
COR
Loans
Mortgage Documents
TDD
TSA
Loans
Mortgage Documents
TDR
EXM
Loans
Mortgage Documents
TDR
TSL
Loans
Mortgage Documents
TDR
CCO
Loans
Mortgage Documents
MTG
RFR
Loans
Mortgage Documents
MTG
RSN
Loans
Mortgage Documents
TDR
ADR
Loans
Mortgage Documents
TDR
TSC
Loans
Mortgage Documents
AOR
SFR
Loans
Mortgage Documents
TDR
RPR
Loans
Mortgage Documents
MTG
CCO
Loans
Mortgage Documents
TDD
ASP
Loans
Mortgage Documents
AOR
CAR
Loans
Mortgage Documents
TDR
TSM
Loans
Mortgage Documents
AOR
REC
Loans
Mortgage Documents
MTG
POP
Loans
Mortgage Documents
TDR
PAS
Loans
Mortgage Documents
MTG
PRC
Loans
Mortgage Documents
TDR
ARS
Loans
Mortgage Documents
AOR
AMO
Loans
Mortgage Documents
TDD
RLQ
Loans
Mortgage Documents
MTG
PRC
Loans
Mortgage Documents
TDR
RVR
Loans
Mortgage Documents
TDA
TSL
Loans
Mortgage Documents
TDR
RND
Loans
Mortgage Documents
TDR
RNW
Loans
Mortgage Documents
TDD
POP
Loans
Mortgage Documents
TDR
RAF
Loans
Mortgage Documents
AOR
ABD
Loans
Mortgage Documents
TDA
RND
Loans
Mortgage Documents
TDD
NAM
Loans
Mortgage Documents
TDD
RDM
Loans
Mortgage Documents
TDD
RUF
Loans
Mortgage Documents
TDR
ADV
Loans
Mortgage Documents
TDD
CAF
Loans
Mortgage Documents
TDR
ASP
Loans
Mortgage Documents
AOR
PRA
Loans
Mortgage Documents
TDD
ADF
Loans
Mortgage Documents
AOR
RCA
Loans
Mortgage Documents
AOR
PCA
Loans
Mortgage Documents
AOR
RAD
Loans
Mortgage Documents
MTG
RAF
Loans
Mortgage Documents
AOR
TSL
Loans
Mortgage Documents
MTG
STP
Loans
Mortgage Documents
MTG
DSM
Loans
Mortgage Documents
TDD
STP
Loans
Mortgage Documents
TDD
OSL
Loans
Mortgage Documents
AOR
PRC
Loans
Mortgage Documents
AOR
RQN
Loans
Mortgage Documents
MTG
APT
Loans
Mortgage Documents
MTG
REC
Loans
Mortgage Documents
TDD
ANM
Loans
Mortgage Documents
TDD
JTV
Loans
Mortgage Documents
MTG
CAA
Loans
Mortgage Documents
TDA
AOA
Loans
Mortgage Documents
MTG
AOA
Loans
Mortgage Documents
TDD
AOA
Loans
Mortgage Documents
TDR
AOA
Loans
Mortgage Documents
AOR
CCO
Loans
Mortgage Documents
AOR
EXM
Loans
Mortgage Documents
MTG
RVR
Loans
Mortgage Documents
AOR
RRM
Loans
Mortgage Documents
TDR
RTS
Loans
Mortgage Documents
TDA
ADV
Loans
Mortgage Documents
TDA
CAR
Loans
Mortgage Documents
TDA
CCO
Loans
Mortgage Documents
TDA
DCH
Loans
Mortgage Documents
TDA
DLQ
Loans
Mortgage Documents
TDA
EXM
Loans
Mortgage Documents
TDA
POP
Loans
Mortgage Documents
TDA
RQR
Loans
Mortgage Documents
TDA
RTS
Loans
Mortgage Documents
TDA
TSC
Loans
Mortgage Documents
TDA
TSM
Loans
Mortgage Documents
AOR
AOA
Loans
Mortgage Documents
MTG
DFL
Loans
Mortgage Documents
TDD
ACC
Loans
Mortgage Documents
TDD
ATY
Loans
Mortgage Documents
TDD
DIS
Loans
Mortgage Documents
TDD
INV
Loans
Mortgage Documents
TDD
PRP
Loans
Mortgage Documents
TDD
RFR
Loans
Mortgage Documents
TDD
STD
Loans
Mortgage Documents
TDD
WDW
Loans
Mortgage Documents
AOR
RAF
Loans
Mortgage Documents
AOR
RPR
Loans
Mortgage Documents
MTG
ADA
Loans
Mortgage Documents
AOR
RSU
Loans
Mortgage Documents
MTG
ARS
Loans
Mortgage Documents
AOR
REI
Category
Description
Doc Type
Doc Subtype
Miscellaneous
Miscellaneous
ABN
Miscellaneous
Miscellaneous
ACC
Miscellaneous
Miscellaneous
AFE
Miscellaneous
Miscellaneous
AFF
Miscellaneous
Miscellaneous
AFF
ACC
Miscellaneous
Miscellaneous
AFF
ATY
Miscellaneous
Miscellaneous
AFF
EXP
Miscellaneous
Miscellaneous
AFF
RRR
Miscellaneous
Miscellaneous
AGR
Miscellaneous
Miscellaneous
AGR
ABD
Miscellaneous
Miscellaneous
AGR
AMD
Miscellaneous
Miscellaneous
AGR
AMO
Miscellaneous
Miscellaneous
AGR
ANP
Miscellaneous
Miscellaneous
AGR
ASA
Miscellaneous
Miscellaneous
AGR
ASB
Miscellaneous
Miscellaneous
AGR
ASM
Miscellaneous
Miscellaneous
AGR
ASN
Miscellaneous
Miscellaneous
AGR
CAN
Miscellaneous
Miscellaneous
AGR
CMP
Miscellaneous
Miscellaneous
AGR
COR
Miscellaneous
Miscellaneous
AGR
DCH
Miscellaneous
Miscellaneous
AGR
DFL
Miscellaneous
Miscellaneous
AGR
EST
Miscellaneous
Miscellaneous
AGR
EXM
Miscellaneous
Miscellaneous
AGR
EXP
Miscellaneous
Miscellaneous
AGR
EXT
Miscellaneous
Miscellaneous
AGR
JTV
Miscellaneous
Miscellaneous
AGR
MER
Miscellaneous
Miscellaneous
AGR
MOD
Miscellaneous
Miscellaneous
AGR
PAR
Miscellaneous
Miscellaneous
AGR
PON
Miscellaneous
Miscellaneous
AGR
PRP
Miscellaneous
Miscellaneous
AGR
REL
Miscellaneous
Miscellaneous
AGR
RLQ
Miscellaneous
Miscellaneous
AGR
RML
Miscellaneous
Miscellaneous
AGR
RRR
Miscellaneous
Miscellaneous
AGR
RSN
Miscellaneous
Miscellaneous
AGR
RVC
Miscellaneous
Miscellaneous
AGR
SAT
Miscellaneous
Miscellaneous
AGR
SBD
Miscellaneous
Miscellaneous
AGR
SUP
Miscellaneous
Miscellaneous
AGR
TER
Miscellaneous
Miscellaneous
AGR
WDW
Miscellaneous
Miscellaneous
AGT
Miscellaneous
Miscellaneous
AGT
ACC
Miscellaneous
Miscellaneous
AGT
AMD
Miscellaneous
Miscellaneous
AGT
ASN
Miscellaneous
Miscellaneous
AGT
CAN
Miscellaneous
Miscellaneous
AGT
COR
Miscellaneous
Miscellaneous
AGT
MOD
Miscellaneous
Miscellaneous
AGT
PAR
Miscellaneous
Miscellaneous
AGT
REL
Miscellaneous
Miscellaneous
AGT
RML
Miscellaneous
Miscellaneous
AGT
RRR
Miscellaneous
Miscellaneous
AGT
RVC
Miscellaneous
Miscellaneous
AGT
TER
Miscellaneous
Miscellaneous
ANX
Miscellaneous
Miscellaneous
ANX
AMD
Miscellaneous
Miscellaneous
ANX
SUP
Miscellaneous
Miscellaneous
APL
Miscellaneous
Miscellaneous
APL
AMD
Miscellaneous
Miscellaneous
APL
WDW
Miscellaneous
Miscellaneous
ARI
Miscellaneous
Miscellaneous
ARI
AMD
Miscellaneous
Miscellaneous
ARI
RRR
Miscellaneous
Miscellaneous
ARO
Miscellaneous
Miscellaneous
ARO
AMD
Miscellaneous
Miscellaneous
ART
Miscellaneous
Miscellaneous
ART
AMD
Miscellaneous
Miscellaneous
ART
TER
Miscellaneous
Miscellaneous
BKR
Miscellaneous
Miscellaneous
BKR
AMD
Miscellaneous
Miscellaneous
BKY
Miscellaneous
Miscellaneous
BYL
Miscellaneous
Miscellaneous
BYL
AMD
Miscellaneous
Miscellaneous
BYL
RRR
Miscellaneous
Miscellaneous
CAE
Miscellaneous
Miscellaneous
CML
Miscellaneous
Miscellaneous
CML
AMD
Miscellaneous
Miscellaneous
CML
COR
Miscellaneous
Miscellaneous
CML
RRR
Miscellaneous
Miscellaneous
CNS
Miscellaneous
Miscellaneous
CPN
Miscellaneous
Miscellaneous
CPN
AMD
Miscellaneous
Miscellaneous
CPN
PAR
Miscellaneous
Miscellaneous
CPN
RRR
Miscellaneous
Miscellaneous
CPT
Miscellaneous
Miscellaneous
CTA
Miscellaneous
Miscellaneous
CTA
AMD
Miscellaneous
Miscellaneous
CTF
Miscellaneous
Miscellaneous
CTF
ACC
Miscellaneous
Miscellaneous
CTF
AMD
Miscellaneous
Miscellaneous
CTF
ASN
Miscellaneous
Miscellaneous
CTF
CAN
Miscellaneous
Miscellaneous
CTF
COR
Miscellaneous
Miscellaneous
CTF
DCH
Miscellaneous
Miscellaneous
CTF
DIS
Miscellaneous
Miscellaneous
CTF
MER
Miscellaneous
Miscellaneous
CTF
NAT
Miscellaneous
Miscellaneous
CTF
NCP
Miscellaneous
Miscellaneous
CTF
PAR
Miscellaneous
Miscellaneous
CTF
PAY
Miscellaneous
Miscellaneous
CTF
RDM
Miscellaneous
Miscellaneous
CTF
REI
Miscellaneous
Miscellaneous
CTF
REL
Miscellaneous
Miscellaneous
CTF
RRR
Miscellaneous
Miscellaneous
CTF
RVC
Miscellaneous
Miscellaneous
CTF
TER
Miscellaneous
Miscellaneous
CTF
WDW
Miscellaneous
Miscellaneous
CTI
Miscellaneous
Miscellaneous
CTI
AMD
Miscellaneous
Miscellaneous
CTR
Miscellaneous
Miscellaneous
DCL
Miscellaneous
Miscellaneous
DCL
AMD
Miscellaneous
Miscellaneous
DCL
COR
Miscellaneous
Miscellaneous
DCL
PAR
Miscellaneous
Miscellaneous
DCL
REL
Miscellaneous
Miscellaneous
DCL
RRR
Miscellaneous
Miscellaneous
DCL
TER
Miscellaneous
Miscellaneous
DLR
Miscellaneous
Miscellaneous
ETT
Miscellaneous
Miscellaneous
FIC
Miscellaneous
Miscellaneous
HMS
Miscellaneous
Miscellaneous
HMS
ABD
Miscellaneous
Miscellaneous
HMS
REL
Miscellaneous
Miscellaneous
HMS
RRR
Miscellaneous
Miscellaneous
ICM
AMD
Miscellaneous
Miscellaneous
INS
Miscellaneous
Miscellaneous
LOC
Miscellaneous
Miscellaneous
LOC
RRR
Miscellaneous
Miscellaneous
LOT
Miscellaneous
Miscellaneous
LOT
AMD
Miscellaneous
Miscellaneous
LOT
COR
Miscellaneous
Miscellaneous
LOT
RRR
Miscellaneous
Miscellaneous
LTR
Miscellaneous
Miscellaneous
LTR
ADM
Miscellaneous
Miscellaneous
LTR
AMD
Miscellaneous
Miscellaneous
LTR
RRR
Miscellaneous
Miscellaneous
LTR
SPC
Miscellaneous
Miscellaneous
LTR
TST
Miscellaneous
Miscellaneous
MEM
Miscellaneous
Miscellaneous
MEM
AMD
Miscellaneous
Miscellaneous
MEM
ASN
Miscellaneous
Miscellaneous
MEM
CAN
Miscellaneous
Miscellaneous
MEM
COR
Miscellaneous
Miscellaneous
MEM
EXT
Miscellaneous
Miscellaneous
MEM
MOD
Miscellaneous
Miscellaneous
MEM
PAR
Miscellaneous
Miscellaneous
MEM
REL
Miscellaneous
Miscellaneous
MEM
RRR
Miscellaneous
Miscellaneous
MEM
SAT
Miscellaneous
Miscellaneous
MEM
SBD
Miscellaneous
Miscellaneous
MEM
TER
Miscellaneous
Miscellaneous
MOT
Miscellaneous
Miscellaneous
MSC
Miscellaneous
Miscellaneous
MSC
REL
Miscellaneous
Miscellaneous
NCM
Miscellaneous
Miscellaneous
NOC
Miscellaneous
Miscellaneous
NOC
AMD
Miscellaneous
Miscellaneous
NOC
RRR
Miscellaneous
Miscellaneous
NON
Miscellaneous
Miscellaneous
NON
AMD
Miscellaneous
Miscellaneous
NON
REL
Miscellaneous
Miscellaneous
NOO
Miscellaneous
Miscellaneous
NOT
Miscellaneous
Miscellaneous
NOT
ABD
Miscellaneous
Miscellaneous
NOT
ACC
Miscellaneous
Miscellaneous
NOT
AMD
Miscellaneous
Miscellaneous
NOT
APT
Miscellaneous
Miscellaneous
NOT
ASN
Miscellaneous
Miscellaneous
NOT
BRC
Miscellaneous
Miscellaneous
NOT
BUT
Miscellaneous
Miscellaneous
NOT
CAN
Miscellaneous
Miscellaneous
NOT
COR
Miscellaneous
Miscellaneous
NOT
CRD
Miscellaneous
Miscellaneous
NOT
CSL
Miscellaneous
Miscellaneous
NOT
DCH
Miscellaneous
Miscellaneous
NOT
INT
Miscellaneous
Miscellaneous
NOT
MER
Miscellaneous
Miscellaneous
NOT
MOD
Miscellaneous
Miscellaneous
NOT
NAC
Miscellaneous
Miscellaneous
NOT
NDV
Miscellaneous
Miscellaneous
NOT
PAR
Miscellaneous
Miscellaneous
NOT
PAY
Miscellaneous
Miscellaneous
NOT
POS
Miscellaneous
Miscellaneous
NOT
REI
Miscellaneous
Miscellaneous
NOT
REL
Miscellaneous
Miscellaneous
NOT
RML
Miscellaneous
Miscellaneous
NOT
RNC
Miscellaneous
Miscellaneous
NOT
RQN
Miscellaneous
Miscellaneous
NOT
RRR
Miscellaneous
Miscellaneous
NOT
RSG
Miscellaneous
Miscellaneous
NOT
RSN
Miscellaneous
Miscellaneous
NOT
RSR
Miscellaneous
Miscellaneous
NOT
RUF
Miscellaneous
Miscellaneous
NOT
RVC
Miscellaneous
Miscellaneous
NOT
SAT
Miscellaneous
Miscellaneous
NOT
STP
Miscellaneous
Miscellaneous
NOT
TER
Miscellaneous
Miscellaneous
NOT
VAC
Miscellaneous
Miscellaneous
NOT
WDW
Miscellaneous
Miscellaneous
NOV
Miscellaneous
Miscellaneous
OAT
Miscellaneous
Miscellaneous
OFI
Miscellaneous
Miscellaneous
ORD
Miscellaneous
Miscellaneous
ORD
ABD
Miscellaneous
Miscellaneous
ORD
AMD
Miscellaneous
Miscellaneous
ORD
APT
Miscellaneous
Miscellaneous
ORD
COR
Miscellaneous
Miscellaneous
ORD
DCH
Miscellaneous
Miscellaneous
ORD
DSM
Miscellaneous
Miscellaneous
ORD
GDN
Miscellaneous
Miscellaneous
ORD
NCP
Miscellaneous
Miscellaneous
ORD
POS
Miscellaneous
Miscellaneous
ORD
RRR
Miscellaneous
Miscellaneous
ORD
SAT
Miscellaneous
Miscellaneous
ORD
STP
Miscellaneous
Miscellaneous
ORD
TER
Miscellaneous
Miscellaneous
ORD
VAC
Miscellaneous
Miscellaneous
PET
Miscellaneous
Miscellaneous
PET
RSN
Miscellaneous
Miscellaneous
PET
VAC
Miscellaneous
Miscellaneous
POA
Miscellaneous
Miscellaneous
POA
COR
Miscellaneous
Miscellaneous
POA
REL
Miscellaneous
Miscellaneous
POA
RRR
Miscellaneous
Miscellaneous
POA
RSG
Miscellaneous
Miscellaneous
POA
RVC
Miscellaneous
Miscellaneous
POA
TER
Miscellaneous
Miscellaneous
PRO
Miscellaneous
Miscellaneous
PTP
Miscellaneous
Miscellaneous
PTP
AMD
Miscellaneous
Miscellaneous
PTP
CAN
Miscellaneous
Miscellaneous
PTP
DIS
Miscellaneous
Miscellaneous
PTP
MER
Miscellaneous
Miscellaneous
PTP
RRR
Miscellaneous
Miscellaneous
PTP
TER
Miscellaneous
Miscellaneous
PTP
WDW
Miscellaneous
Miscellaneous
STR
Miscellaneous
Miscellaneous
WVR
Miscellaneous
Miscellaneous
ORD
RVC
Miscellaneous
Miscellaneous
OOR
Miscellaneous
Miscellaneous
POL
Miscellaneous
Miscellaneous
AGR
AMA
Miscellaneous
Miscellaneous
PRN
Miscellaneous
Miscellaneous
LTR
CVS
Miscellaneous
Miscellaneous
AGR
PTT
Miscellaneous
Miscellaneous
AGR
DFR
Miscellaneous
Miscellaneous
PTP
LTD
Miscellaneous
Miscellaneous
ACC
RRR
Miscellaneous
Miscellaneous
CTF
TRF
Miscellaneous
Miscellaneous
NOT
ADR
Miscellaneous
Miscellaneous
AGR
ANX
Miscellaneous
Miscellaneous
CNS
RVC
Miscellaneous
Miscellaneous
NOT
EXP
Miscellaneous
Miscellaneous
POA
LTD
Miscellaneous
Miscellaneous
SDN
Miscellaneous
Miscellaneous
DCL
SUP
Miscellaneous
Miscellaneous
AGR
RAF
Miscellaneous
Miscellaneous
DCL
ANX
Miscellaneous
Miscellaneous
CNS
REL
Miscellaneous
Miscellaneous
POA
SPC
Miscellaneous
Miscellaneous
CPN
REV
Miscellaneous
Miscellaneous
AGR
ADR
Miscellaneous
Miscellaneous
ABN
AMD
Miscellaneous
Miscellaneous
ABN
CAN
Miscellaneous
Miscellaneous
ABN
COR
Miscellaneous
Miscellaneous
ABN
RRR
Miscellaneous
Miscellaneous
ACC
CMP
Miscellaneous
Miscellaneous
AFE
RRR
Miscellaneous
Miscellaneous
AFF
ABD
Miscellaneous
Miscellaneous
AFF
AFX
Miscellaneous
Miscellaneous
AFF
AMD
Miscellaneous
Miscellaneous
AFF
CMP
Miscellaneous
Miscellaneous
AFF
COR
Miscellaneous
Miscellaneous
AFF
EST
Miscellaneous
Miscellaneous
AFF
FOR
Miscellaneous
Miscellaneous
AFF
HEI
Miscellaneous
Miscellaneous
AFF
MOD
Miscellaneous
Miscellaneous
AFF
NAM
Miscellaneous
Miscellaneous
AFF
NAT
Miscellaneous
Miscellaneous
AFF
ONE
Miscellaneous
Miscellaneous
AFF
POP
Miscellaneous
Miscellaneous
AFF
POS
Miscellaneous
Miscellaneous
AFF
SAT
Miscellaneous
Miscellaneous
AFF
SCC
Miscellaneous
Miscellaneous
AFF
SCR
Miscellaneous
Miscellaneous
AFF
SUR
Miscellaneous
Miscellaneous
AFF
TRF
Miscellaneous
Miscellaneous
AGR
AAS
Miscellaneous
Miscellaneous
AGR
AMB
Miscellaneous
Miscellaneous
AGR
APS
Miscellaneous
Miscellaneous
AGR
ARS
Miscellaneous
Miscellaneous
AGR
ASP
Miscellaneous
Miscellaneous
AGR
FOR
Miscellaneous
Miscellaneous
AGR
PAA
Miscellaneous
Miscellaneous
AGR
RAS
Miscellaneous
Miscellaneous
AGR
RAT
Miscellaneous
Miscellaneous
AGR
RNW
Miscellaneous
Miscellaneous
AGR
RRM
Miscellaneous
Miscellaneous
AGR
RSU
Miscellaneous
Miscellaneous
AGR
SEP
Miscellaneous
Miscellaneous
AGR
SUB
Miscellaneous
Miscellaneous
AGR
TES
Miscellaneous
Miscellaneous
AGR
TRF
Miscellaneous
Miscellaneous
AGT
RSG
Miscellaneous
Miscellaneous
AGT
STT
Miscellaneous
Miscellaneous
ARI
REI
Miscellaneous
Miscellaneous
ART
DIS
Miscellaneous
Miscellaneous
ART
MER
Miscellaneous
Miscellaneous
BYL
REV
Miscellaneous
Miscellaneous
CNS
AMD
Miscellaneous
Miscellaneous
CNS
ASN
Miscellaneous
Miscellaneous
CNS
RML
Miscellaneous
Miscellaneous
CNS
RRR
Miscellaneous
Miscellaneous
CNS
TER
Miscellaneous
Miscellaneous
CPN
TER
Miscellaneous
Miscellaneous
CTF
APS
Miscellaneous
Miscellaneous
CTF
APT
Miscellaneous
Miscellaneous
CTF
DTH
Miscellaneous
Miscellaneous
CTF
EST
Miscellaneous
Miscellaneous
CTF
NAM
Miscellaneous
Miscellaneous
CTF
SCC
Miscellaneous
Miscellaneous
CTF
WAT
Miscellaneous
Miscellaneous
DCL
ABD
Miscellaneous
Miscellaneous
DCL
DNX
Miscellaneous
Miscellaneous
DCL
FOR
Miscellaneous
Miscellaneous
DCL
NAM
Miscellaneous
Miscellaneous
DCL
RSN
Miscellaneous
Miscellaneous
DCL
RVC
Miscellaneous
Miscellaneous
DCL
WDW
Miscellaneous
Miscellaneous
ETT
ASN
Miscellaneous
Miscellaneous
ETT
REL
Miscellaneous
Miscellaneous
FIC
AMD
Miscellaneous
Miscellaneous
FIC
RRR
Miscellaneous
Miscellaneous
FIC
RVC
Miscellaneous
Miscellaneous
FIC
TER
Miscellaneous
Miscellaneous
HMS
AMD
Miscellaneous
Miscellaneous
HMS
ASN
Miscellaneous
Miscellaneous
HMS
COR
Miscellaneous
Miscellaneous
HMS
RVC
Miscellaneous
Miscellaneous
INS
SCR
Miscellaneous
Miscellaneous
LOT
REV
Miscellaneous
Miscellaneous
LOT
RSN
Miscellaneous
Miscellaneous
LTR
APT
Miscellaneous
Miscellaneous
LTR
GDN
Miscellaneous
Miscellaneous
LTR
INT
Miscellaneous
Miscellaneous
NOC
COR
Miscellaneous
Miscellaneous
NOT
HOA
Miscellaneous
Miscellaneous
NOT
PNT
Miscellaneous
Miscellaneous
NOT
RLQ
Miscellaneous
Miscellaneous
NOT
SAC
Miscellaneous
Miscellaneous
NOT
SBD
Miscellaneous
Miscellaneous
NOT
TRF
Miscellaneous
Miscellaneous
ORD
APS
Miscellaneous
Miscellaneous
ORD
CAN
Miscellaneous
Miscellaneous
ORD
CVS
Miscellaneous
Miscellaneous
ORD
PAR
Miscellaneous
Miscellaneous
ORD
REL
Miscellaneous
Miscellaneous
ORD
RML
Miscellaneous
Miscellaneous
PET
ANX
Miscellaneous
Miscellaneous
PET
NAM
Miscellaneous
Miscellaneous
POA
AMD
Miscellaneous
Miscellaneous
PRO
AMD
Miscellaneous
Miscellaneous
PRO
RRR
Miscellaneous
Miscellaneous
PTP
ASN
Miscellaneous
Miscellaneous
WVR
AMD
Miscellaneous
Miscellaneous
WVR
PAR
Miscellaneous
Miscellaneous
WVR
REL
Miscellaneous
Miscellaneous
WVR
RFR
Miscellaneous
Miscellaneous
WVR
RRR
Miscellaneous
Miscellaneous
NCM
TER
Miscellaneous
Miscellaneous
MEM
RVC
Miscellaneous
Miscellaneous
ORD
SUP
Miscellaneous
Miscellaneous
AGR
STP
Miscellaneous
Miscellaneous
NCM
RRR
Miscellaneous
Miscellaneous
ORD
ASN
Miscellaneous
Miscellaneous
ORD
RSN
Miscellaneous
Miscellaneous
MEM
PTT
Miscellaneous
Miscellaneous
NOT
RQR
Miscellaneous
Miscellaneous
DCL
ASN
Miscellaneous
Miscellaneous
DCL
ASA
Miscellaneous
Miscellaneous
NCM
REL
Miscellaneous
Miscellaneous
ORD
TRF
Miscellaneous
Miscellaneous
PET
AMD
Miscellaneous
Miscellaneous
AGR
PRC
Miscellaneous
Miscellaneous
AGR
REC
Miscellaneous
Miscellaneous
AGR
RQN
Miscellaneous
Miscellaneous
CPT
REL
Miscellaneous
Miscellaneous
MOT
DSM
Miscellaneous
Miscellaneous
ORD
EXP
Miscellaneous
Miscellaneous
CIV
Miscellaneous
Miscellaneous
ARO
COR
Miscellaneous
Miscellaneous
CIV
REL
Miscellaneous
Miscellaneous
CPN
COR
Miscellaneous
Miscellaneous
JTY
SAT
Miscellaneous
Miscellaneous
MOT
SAT
Miscellaneous
Miscellaneous
NON
COR
Miscellaneous
Miscellaneous
CPT
QUI
Miscellaneous
Miscellaneous
PET
GDN
Miscellaneous
Miscellaneous
CRI
Miscellaneous
Miscellaneous
DCL
ARS
Miscellaneous
Miscellaneous
CPT
POS
Miscellaneous
Miscellaneous
NOO
REL
Miscellaneous
Miscellaneous
NOT
PAC
Miscellaneous
Miscellaneous
AGR
RAD
Miscellaneous
Miscellaneous
CAE
REL
Miscellaneous
Miscellaneous
CPN
RSN
Miscellaneous
Miscellaneous
MEM
RSN
Miscellaneous
Miscellaneous
MEM
ASA
Miscellaneous
Miscellaneous
IMG
Miscellaneous
Miscellaneous
MEM
ADR
Miscellaneous
Miscellaneous
CML
RSN
Miscellaneous
Miscellaneous
DCL
APT
Miscellaneous
Miscellaneous
ORD
EXT
Miscellaneous
Miscellaneous
LOT
MER
Miscellaneous
Miscellaneous
AGR
SEV
Miscellaneous
Miscellaneous
NOT
PTT
Miscellaneous
Miscellaneous
DCL
ADD
Miscellaneous
Miscellaneous
LTR
EXT
Miscellaneous
Miscellaneous
ABR
Miscellaneous
Miscellaneous
DOI
Miscellaneous
Miscellaneous
ETT
DPP
Miscellaneous
Miscellaneous
DOI
DCH
Miscellaneous
Miscellaneous
DOI
RRR
Miscellaneous
Miscellaneous
NON
ASN
Miscellaneous
Miscellaneous
PRF
Miscellaneous
Miscellaneous
PRF
ADM
Miscellaneous
Miscellaneous
PRF
APT
Miscellaneous
Miscellaneous
PRF
CVS
Miscellaneous
Miscellaneous
PRF
DPP
Miscellaneous
Miscellaneous
PRF
GDN
Miscellaneous
Miscellaneous
PRF
SPC
Miscellaneous
Miscellaneous
PRF
TST
Miscellaneous
Miscellaneous
CIV
ABD
Miscellaneous
Miscellaneous
CIV
ATY
Miscellaneous
Miscellaneous
CIV
DML
Miscellaneous
Miscellaneous
CIV
NAM
Miscellaneous
Miscellaneous
CIV
STP
Miscellaneous
Miscellaneous
CIV
TER
Miscellaneous
Miscellaneous
CIV
VAC
Miscellaneous
Miscellaneous
CRI
AMD
Miscellaneous
Miscellaneous
CRI
DCH
Miscellaneous
Miscellaneous
CRI
SAT
Miscellaneous
Miscellaneous
CIV
POS
Miscellaneous
Miscellaneous
TOD
Miscellaneous
Miscellaneous
TOD
ACC
Miscellaneous
Miscellaneous
TOD
AMD
Miscellaneous
Miscellaneous
TOD
COR
Miscellaneous
Miscellaneous
TOD
RRR
Miscellaneous
Miscellaneous
TOD
RVC
Miscellaneous
Miscellaneous
CVU
Miscellaneous
Miscellaneous
CVU
AMD
Miscellaneous
Miscellaneous
CVU
COR
Miscellaneous
Miscellaneous
CVU
DIS
Miscellaneous
Miscellaneous
CVU
MOD
Miscellaneous
Miscellaneous
CVU
RRR
Miscellaneous
Miscellaneous
CVU
RVC
Miscellaneous
Miscellaneous
CVU
TER
Miscellaneous
Miscellaneous
DPP
Miscellaneous
Miscellaneous
DPP
AMD
Miscellaneous
Miscellaneous
DPP
COR
Miscellaneous
Miscellaneous
DPP
DIS
Miscellaneous
Miscellaneous
DPP
MOD
Miscellaneous
Miscellaneous
DPP
RRR
Miscellaneous
Miscellaneous
DPP
RVC
Miscellaneous
Miscellaneous
DPP
TER
Miscellaneous
Miscellaneous
ADM
Miscellaneous
Miscellaneous
ADP
Miscellaneous
Miscellaneous
APP
Miscellaneous
Miscellaneous
CAV
Miscellaneous
Miscellaneous
MIS
Miscellaneous
Miscellaneous
PTF
Miscellaneous
Miscellaneous
FSE
Miscellaneous
Miscellaneous
PRF
COR
Miscellaneous
Miscellaneous
PRO
RSG
Miscellaneous
Miscellaneous
AFF
TSL
Miscellaneous
Miscellaneous
ORD
HEI
Miscellaneous
Miscellaneous
ABN
DIS
Category
Description
Doc Type
Doc Subtype
NME
Non-Monetary Encumbrances
ACP
NME
Non-Monetary Encumbrances
ACP
CAN
NME
Non-Monetary Encumbrances
ACP
MOD
NME
Non-Monetary Encumbrances
AGR
EAS
NME
Non-Monetary Encumbrances
AGR
MNT
NME
Non-Monetary Encumbrances
AGR
REG
NME
Non-Monetary Encumbrances
ANX
NME
Non-Monetary Encumbrances
ANX
AMD
NME
Non-Monetary Encumbrances
ANX
SUP
NME
Non-Monetary Encumbrances
BYL
NME
Non-Monetary Encumbrances
BYL
AMD
NME
Non-Monetary Encumbrances
BYL
RRR
NME
Non-Monetary Encumbrances
CCR
NME
Non-Monetary Encumbrances
CCR
AMD
NME
Non-Monetary Encumbrances
CCR
COR
NME
Non-Monetary Encumbrances
CCR
MOD
NME
Non-Monetary Encumbrances
CCR
PAR
NME
Non-Monetary Encumbrances
CCR
REL
NME
Non-Monetary Encumbrances
CCR
REV
NME
Non-Monetary Encumbrances
CCR
RRR
NME
Non-Monetary Encumbrances
CCR
RSN
NME
Non-Monetary Encumbrances
CCR
SBD
NME
Non-Monetary Encumbrances
CCV
NME
Non-Monetary Encumbrances
CCV
AMD
NME
Non-Monetary Encumbrances
CCV
COR
NME
Non-Monetary Encumbrances
CCV
MOD
NME
Non-Monetary Encumbrances
CCV
REL
NME
Non-Monetary Encumbrances
CCV
RRR
NME
Non-Monetary Encumbrances
CDM
NME
Non-Monetary Encumbrances
COV
NME
Non-Monetary Encumbrances
COV
AMD
NME
Non-Monetary Encumbrances
COV
COR
NME
Non-Monetary Encumbrances
COV
MOD
NME
Non-Monetary Encumbrances
COV
PAR
NME
Non-Monetary Encumbrances
COV
REL
NME
Non-Monetary Encumbrances
COV
RML
NME
Non-Monetary Encumbrances
COV
RRR
NME
Non-Monetary Encumbrances
COV
RSN
NME
Non-Monetary Encumbrances
COV
SBD
NME
Non-Monetary Encumbrances
CPN
NME
Non-Monetary Encumbrances
CPN
AMD
NME
Non-Monetary Encumbrances
CPN
PAR
NME
Non-Monetary Encumbrances
CPN
RRR
NME
Non-Monetary Encumbrances
CTF
CDM
NME
Non-Monetary Encumbrances
CTF
NCP
NME
Non-Monetary Encumbrances
DCL
NME
Non-Monetary Encumbrances
DCL
AMD
NME
Non-Monetary Encumbrances
DCL
COR
NME
Non-Monetary Encumbrances
DCL
PAR
NME
Non-Monetary Encumbrances
DCL
REL
NME
Non-Monetary Encumbrances
DCL
RRR
NME
Non-Monetary Encumbrances
DCL
TER
NME
Non-Monetary Encumbrances
DED
EAS
NME
Non-Monetary Encumbrances
DEG
EAS
NME
Non-Monetary Encumbrances
DEQ
EAS
NME
Non-Monetary Encumbrances
EAS
NME
Non-Monetary Encumbrances
EAS
ABD
NME
Non-Monetary Encumbrances
EAS
AMD
NME
Non-Monetary Encumbrances
EAS
COR
NME
Non-Monetary Encumbrances
EAS
MOD
NME
Non-Monetary Encumbrances
EAS
PAR
NME
Non-Monetary Encumbrances
EAS
REL
NME
Non-Monetary Encumbrances
EAS
RLQ
NME
Non-Monetary Encumbrances
EAS
RRR
NME
Non-Monetary Encumbrances
EAS
RVC
NME
Non-Monetary Encumbrances
EAS
TER
NME
Non-Monetary Encumbrances
EAS
VAC
NME
Non-Monetary Encumbrances
ENC
NME
Non-Monetary Encumbrances
ENC
AMD
NME
Non-Monetary Encumbrances
ENC
MOD
NME
Non-Monetary Encumbrances
ENC
TER
NME
Non-Monetary Encumbrances
FAC
NME
Non-Monetary Encumbrances
FAC
AMD
NME
Non-Monetary Encumbrances
FAC
RRR
NME
Non-Monetary Encumbrances
FAC
TER
NME
Non-Monetary Encumbrances
GRT
NME
Non-Monetary Encumbrances
GRT
ASN
NME
Non-Monetary Encumbrances
GRT
REL
NME
Non-Monetary Encumbrances
GRT
TER
NME
Non-Monetary Encumbrances
INJ
NME
Non-Monetary Encumbrances
INJ
WDW
NME
Non-Monetary Encumbrances
LCS
NME
Non-Monetary Encumbrances
LCS
AMD
NME
Non-Monetary Encumbrances
LCS
REL
NME
Non-Monetary Encumbrances
LCS
RRR
NME
Non-Monetary Encumbrances
LCS
RVC
NME
Non-Monetary Encumbrances
LCS
TER
NME
Non-Monetary Encumbrances
LCT
NME
Non-Monetary Encumbrances
MAP
NME
Non-Monetary Encumbrances
MAP
AMD
NME
Non-Monetary Encumbrances
MAP
COR
NME
Non-Monetary Encumbrances
MAP
RRR
NME
Non-Monetary Encumbrances
MNG
NME
Non-Monetary Encumbrances
MNG
AMD
NME
Non-Monetary Encumbrances
MNG
RRR
NME
Non-Monetary Encumbrances
NOT
ANX
NME
Non-Monetary Encumbrances
NOT
DDC
NME
Non-Monetary Encumbrances
NOT
DML
NME
Non-Monetary Encumbrances
NOT
NCP
NME
Non-Monetary Encumbrances
NOT
RST
NME
Non-Monetary Encumbrances
NOT
STD
NME
Non-Monetary Encumbrances
NOT
VIO
NME
Non-Monetary Encumbrances
ODN
NME
Non-Monetary Encumbrances
ODN
AMD
NME
Non-Monetary Encumbrances
ODN
COR
NME
Non-Monetary Encumbrances
ODN
RRR
NME
Non-Monetary Encumbrances
ODN
RVC
NME
Non-Monetary Encumbrances
ODN
VAC
NME
Non-Monetary Encumbrances
ORD
DML
NME
Non-Monetary Encumbrances
PLN
NME
Non-Monetary Encumbrances
PLN
REV
NME
Non-Monetary Encumbrances
PLT
NME
Non-Monetary Encumbrances
PLT
AMD
NME
Non-Monetary Encumbrances
PLT
COM
NME
Non-Monetary Encumbrances
PLT
COR
NME
Non-Monetary Encumbrances
PLT
CSL
NME
Non-Monetary Encumbrances
PLT
DDC
NME
Non-Monetary Encumbrances
PLT
EAS
NME
Non-Monetary Encumbrances
PLT
PVA
NME
Non-Monetary Encumbrances
PLT
RRR
NME
Non-Monetary Encumbrances
PLT
RSB
NME
Non-Monetary Encumbrances
PLT
SDV
NME
Non-Monetary Encumbrances
PLT
SVY
NME
Non-Monetary Encumbrances
PLT
VAC
NME
Non-Monetary Encumbrances
PMT
NME
Non-Monetary Encumbrances
PMT
AMD
NME
Non-Monetary Encumbrances
PMT
MOD
NME
Non-Monetary Encumbrances
PMT
REL
NME
Non-Monetary Encumbrances
PMT
RRR
NME
Non-Monetary Encumbrances
PMT
TER
NME
Non-Monetary Encumbrances
PWA
NME
Non-Monetary Encumbrances
PWA
RRR
NME
Non-Monetary Encumbrances
RES
NME
Non-Monetary Encumbrances
RES
AMD
NME
Non-Monetary Encumbrances
RES
COR
NME
Non-Monetary Encumbrances
RES
REL
NME
Non-Monetary Encumbrances
RES
RRR
NME
Non-Monetary Encumbrances
ROW
NME
Non-Monetary Encumbrances
ROW
ABD
NME
Non-Monetary Encumbrances
ROW
AMD
NME
Non-Monetary Encumbrances
ROW
COR
NME
Non-Monetary Encumbrances
ROW
MOD
NME
Non-Monetary Encumbrances
ROW
RLQ
NME
Non-Monetary Encumbrances
ROW
RRR
NME
Non-Monetary Encumbrances
ROW
TER
NME
Non-Monetary Encumbrances
ROW
VAC
NME
Non-Monetary Encumbrances
RRT
NME
Non-Monetary Encumbrances
RRT
TER
NME
Non-Monetary Encumbrances
ZON
NME
Non-Monetary Encumbrances
ZON
AMD
NME
Non-Monetary Encumbrances
ZON
RRR
NME
Non-Monetary Encumbrances
DCE
NME
Non-Monetary Encumbrances
DRS
NME
Non-Monetary Encumbrances
GRE
NME
Non-Monetary Encumbrances
DCC
NME
Non-Monetary Encumbrances
DCC
AMD
NME
Non-Monetary Encumbrances
DCC
ASN
NME
Non-Monetary Encumbrances
DCC
MOD
NME
Non-Monetary Encumbrances
DCC
RRR
NME
Non-Monetary Encumbrances
DCC
TER
NME
Non-Monetary Encumbrances
MEM
RFR
NME
Non-Monetary Encumbrances
AGR
RFR
NME
Non-Monetary Encumbrances
ACC
DDC
NME
Non-Monetary Encumbrances
CCR
EAS
NME
Non-Monetary Encumbrances
GRE
AMD
NME
Non-Monetary Encumbrances
ACC
EAS
NME
Non-Monetary Encumbrances
AGR
ANX
NME
Non-Monetary Encumbrances
AGR
SDV
NME
Non-Monetary Encumbrances
CCR
SUP
NME
Non-Monetary Encumbrances
CNS
EAS
NME
Non-Monetary Encumbrances
COV
EAS
NME
Non-Monetary Encumbrances
DRS
AMD
NME
Non-Monetary Encumbrances
CCR
DNX
NME
Non-Monetary Encumbrances
CCR
ASA
NME
Non-Monetary Encumbrances
GRT
RFR
NME
Non-Monetary Encumbrances
DCL
SUP
NME
Non-Monetary Encumbrances
GRE
TER
NME
Non-Monetary Encumbrances
CCR
ASM
NME
Non-Monetary Encumbrances
AGR
RST
NME
Non-Monetary Encumbrances
DCL
ANX
NME
Non-Monetary Encumbrances
GRE
SBD
NME
Non-Monetary Encumbrances
EAS
SBD
NME
Non-Monetary Encumbrances
EAS
PAA
NME
Non-Monetary Encumbrances
CPN
REV
NME
Non-Monetary Encumbrances
GRE
ASN
NME
Non-Monetary Encumbrances
AFF
ABD
NME
Non-Monetary Encumbrances
AGR
DDC
NME
Non-Monetary Encumbrances
AGR
FOR
NME
Non-Monetary Encumbrances
BYL
REV
NME
Non-Monetary Encumbrances
CCR
ADR
NME
Non-Monetary Encumbrances
CCR
ANX
NME
Non-Monetary Encumbrances
CCR
ARS
NME
Non-Monetary Encumbrances
CCR
ASN
NME
Non-Monetary Encumbrances
CCR
CAN
NME
Non-Monetary Encumbrances
CCR
PAA
NME
Non-Monetary Encumbrances
CCR
RAT
NME
Non-Monetary Encumbrances
CCR
RVC
NME
Non-Monetary Encumbrances
CCR
TER
NME
Non-Monetary Encumbrances
CCR
VAC
NME
Non-Monetary Encumbrances
CCR
WDW
NME
Non-Monetary Encumbrances
COV
SUP
NME
Non-Monetary Encumbrances
COV
TER
NME
Non-Monetary Encumbrances
CPN
TER
NME
Non-Monetary Encumbrances
DCL
ABD
NME
Non-Monetary Encumbrances
DCL
DNX
NME
Non-Monetary Encumbrances
DCL
EAS
NME
Non-Monetary Encumbrances
DCL
RSN
NME
Non-Monetary Encumbrances
DCL
RVC
NME
Non-Monetary Encumbrances
DCL
WDW
NME
Non-Monetary Encumbrances
DED
RST
NME
Non-Monetary Encumbrances
DRS
ABD
NME
Non-Monetary Encumbrances
DRS
ANX
NME
Non-Monetary Encumbrances
DRS
ASA
NME
Non-Monetary Encumbrances
DRS
DNX
NME
Non-Monetary Encumbrances
DRS
EAS
NME
Non-Monetary Encumbrances
DRS
MOD
NME
Non-Monetary Encumbrances
DRS
PAR
NME
Non-Monetary Encumbrances
DRS
REL
NME
Non-Monetary Encumbrances
DRS
RRR
NME
Non-Monetary Encumbrances
DRS
RSN
NME
Non-Monetary Encumbrances
DRS
RVC
NME
Non-Monetary Encumbrances
DRS
SUP
NME
Non-Monetary Encumbrances
DRS
TER
NME
Non-Monetary Encumbrances
DRS
WDW
NME
Non-Monetary Encumbrances
EAS
ADR
NME
Non-Monetary Encumbrances
EAS
ASA
NME
Non-Monetary Encumbrances
EAS
ASN
NME
Non-Monetary Encumbrances
EAS
CDM
NME
Non-Monetary Encumbrances
EAS
DDC
NME
Non-Monetary Encumbrances
EAS
DSC
NME
Non-Monetary Encumbrances
EAS
EXP
NME
Non-Monetary Encumbrances
EAS
EXT
NME
Non-Monetary Encumbrances
EAS
MNT
NME
Non-Monetary Encumbrances
EAS
PAB
NME
Non-Monetary Encumbrances
EAS
PTT
NME
Non-Monetary Encumbrances
EAS
RAT
NME
Non-Monetary Encumbrances
EAS
RST
NME
Non-Monetary Encumbrances
LCS
ASN
NME
Non-Monetary Encumbrances
MAP
RAT
NME
Non-Monetary Encumbrances
MAP
ROA
NME
Non-Monetary Encumbrances
MAP
SDV
NME
Non-Monetary Encumbrances
MAP
SVY
NME
Non-Monetary Encumbrances
NOT
RFR
NME
Non-Monetary Encumbrances
ODN
ANX
NME
Non-Monetary Encumbrances
ODN
REL
NME
Non-Monetary Encumbrances
PLN
AMD
NME
Non-Monetary Encumbrances
PLT
ANX
NME
Non-Monetary Encumbrances
PLT
PAR
NME
Non-Monetary Encumbrances
PLT
RAT
NME
Non-Monetary Encumbrances
PLT
REL
NME
Non-Monetary Encumbrances
PMT
ASN
NME
Non-Monetary Encumbrances
PMT
RVC
NME
Non-Monetary Encumbrances
ROW
ASN
NME
Non-Monetary Encumbrances
ROW
DDC
NME
Non-Monetary Encumbrances
ROW
EAS
NME
Non-Monetary Encumbrances
ROW
PAR
NME
Non-Monetary Encumbrances
ZON
REL
NME
Non-Monetary Encumbrances
GRE
RRR
NME
Non-Monetary Encumbrances
AGR
STP
NME
Non-Monetary Encumbrances
DCC
RML
NME
Non-Monetary Encumbrances
DCC
RVC
NME
Non-Monetary Encumbrances
DCC
SUP
NME
Non-Monetary Encumbrances
DCE
AMD
NME
Non-Monetary Encumbrances
DCC
COR
NME
Non-Monetary Encumbrances
COV
RST
NME
Non-Monetary Encumbrances
COV
PTT
NME
Non-Monetary Encumbrances
DCL
ASN
NME
Non-Monetary Encumbrances
DCL
ASA
NME
Non-Monetary Encumbrances
MNG
RLQ
NME
Non-Monetary Encumbrances
CCR
EXT
NME
Non-Monetary Encumbrances
CCV
TER
NME
Non-Monetary Encumbrances
GRE
COR
NME
Non-Monetary Encumbrances
CCR
RCA
NME
Non-Monetary Encumbrances
LCS
ASA
NME
Non-Monetary Encumbrances
DCC
ANX
NME
Non-Monetary Encumbrances
CVY
EAS
NME
Non-Monetary Encumbrances
CCR
COA
NME
Non-Monetary Encumbrances
COV
ASN
NME
Non-Monetary Encumbrances
CPN
COR
NME
Non-Monetary Encumbrances
DCE
ASN
NME
Non-Monetary Encumbrances
DCE
COR
NME
Non-Monetary Encumbrances
DCE
RRR
NME
Non-Monetary Encumbrances
FAC
COR
NME
Non-Monetary Encumbrances
GRE
REL
NME
Non-Monetary Encumbrances
LCS
COR
NME
Non-Monetary Encumbrances
MNG
COR
NME
Non-Monetary Encumbrances
ODN
PAR
NME
Non-Monetary Encumbrances
PMT
COR
NME
Non-Monetary Encumbrances
MAP
COM
NME
Non-Monetary Encumbrances
DCL
ARS
NME
Non-Monetary Encumbrances
EAS
RSN
NME
Non-Monetary Encumbrances
GRE
MOD
NME
Non-Monetary Encumbrances
COV
ASA
NME
Non-Monetary Encumbrances
COV
ASM
NME
Non-Monetary Encumbrances
DCC
ARS
NME
Non-Monetary Encumbrances
DCC
ASA
NME
Non-Monetary Encumbrances
DCC
DNX
NME
Non-Monetary Encumbrances
DCC
SBD
NME
Non-Monetary Encumbrances
DCC
WDW
NME
Non-Monetary Encumbrances
DEW
EAS
NME
Non-Monetary Encumbrances
GRT
SBD
NME
Non-Monetary Encumbrances
PWA
ABD
NME
Non-Monetary Encumbrances
RES
SUP
NME
Non-Monetary Encumbrances
ROW
CAN
NME
Non-Monetary Encumbrances
ROW
SUP
NME
Non-Monetary Encumbrances
DCE
RSN
NME
Non-Monetary Encumbrances
DCE
TER
NME
Non-Monetary Encumbrances
CCR
REI
NME
Non-Monetary Encumbrances
CPN
RSN
NME
Non-Monetary Encumbrances
MEM
EAS
NME
Non-Monetary Encumbrances
GRE
ABD
NME
Non-Monetary Encumbrances
DCL
STD
NME
Non-Monetary Encumbrances
EAS
DCH
NME
Non-Monetary Encumbrances
PMT
CAN
NME
Non-Monetary Encumbrances
PMT
EXT
NME
Non-Monetary Encumbrances
DCL
PTT
NME
Non-Monetary Encumbrances
DCE
ASA
NME
Non-Monetary Encumbrances
DCL
ADD
NME
Non-Monetary Encumbrances
GRE
ASA
NME
Non-Monetary Encumbrances
DMD
NME
Non-Monetary Encumbrances
DCE
PAR
NME
Non-Monetary Encumbrances
PLT
ASE
NME
Non-Monetary Encumbrances
CIV
CDM
NME
Non-Monetary Encumbrances
CCR
RAD
NME
Non-Monetary Encumbrances
EAS
TEA
NME
Non-Monetary Encumbrances
DCC
STT
NME
Non-Monetary Encumbrances
DCE
PTT
NME
Non-Monetary Encumbrances
EAS
RSM
NME
Non-Monetary Encumbrances
GRT
RVC
Category
Description
Doc Type
Doc Subtype
VME
Voluntary Monetary Encumbrances
AFF
MLA
VME
Voluntary Monetary Encumbrances
AFF
MSR
VME
Voluntary Monetary Encumbrances
AGR
AMO
VME
Voluntary Monetary Encumbrances
AGR
ASA
VME
Voluntary Monetary Encumbrances
AGR
ASB
VME
Voluntary Monetary Encumbrances
AGR
ASM
VME
Voluntary Monetary Encumbrances
AGR
DFL
VME
Voluntary Monetary Encumbrances
AGR
EXM
VME
Voluntary Monetary Encumbrances
AGR
MOD
VME
Voluntary Monetary Encumbrances
AGR
SBD
VME
Voluntary Monetary Encumbrances
AOR
VME
Voluntary Monetary Encumbrances
AOR
AMD
VME
Voluntary Monetary Encumbrances
AOR
ASM
VME
Voluntary Monetary Encumbrances
AOR
ASN
VME
Voluntary Monetary Encumbrances
AOR
CAN
VME
Voluntary Monetary Encumbrances
AOR
MOD
VME
Voluntary Monetary Encumbrances
AOR
PAR
VME
Voluntary Monetary Encumbrances
AOR
REA
VME
Voluntary Monetary Encumbrances
AOR
REL
VME
Voluntary Monetary Encumbrances
AOR
RRR
VME
Voluntary Monetary Encumbrances
AOR
TER
VME
Voluntary Monetary Encumbrances
BND
VME
Voluntary Monetary Encumbrances
BND
REL
VME
Voluntary Monetary Encumbrances
BND
RRR
VME
Voluntary Monetary Encumbrances
CTF
REI
VME
Voluntary Monetary Encumbrances
DIV
VME
Voluntary Monetary Encumbrances
DIV
AMD
VME
Voluntary Monetary Encumbrances
DOM
VME
Voluntary Monetary Encumbrances
DOM
AMD
VME
Voluntary Monetary Encumbrances
DOM
RRR
VME
Voluntary Monetary Encumbrances
FIN
VME
Voluntary Monetary Encumbrances
FIN
AMD
VME
Voluntary Monetary Encumbrances
FIN
ASN
VME
Voluntary Monetary Encumbrances
FIN
CNT
VME
Voluntary Monetary Encumbrances
FIN
MOD
VME
Voluntary Monetary Encumbrances
FIN
PAR
VME
Voluntary Monetary Encumbrances
FIN
REL
VME
Voluntary Monetary Encumbrances
FIN
RRR
VME
Voluntary Monetary Encumbrances
FIN
SAT
VME
Voluntary Monetary Encumbrances
FIN
SBD
VME
Voluntary Monetary Encumbrances
FIN
TER
VME
Voluntary Monetary Encumbrances
IND
VME
Voluntary Monetary Encumbrances
IND
AMD
VME
Voluntary Monetary Encumbrances
IND
MOD
VME
Voluntary Monetary Encumbrances
IND
PAR
VME
Voluntary Monetary Encumbrances
IND
REL
VME
Voluntary Monetary Encumbrances
IND
RRR
VME
Voluntary Monetary Encumbrances
IND
TER
VME
Voluntary Monetary Encumbrances
LSE
VME
Voluntary Monetary Encumbrances
LSE
AAS
VME
Voluntary Monetary Encumbrances
LSE
AMD
VME
Voluntary Monetary Encumbrances
LSE
ASA
VME
Voluntary Monetary Encumbrances
LSE
ASB
VME
Voluntary Monetary Encumbrances
LSE
ASM
VME
Voluntary Monetary Encumbrances
LSE
ASN
VME
Voluntary Monetary Encumbrances
LSE
CAN
VME
Voluntary Monetary Encumbrances
LSE
COR
VME
Voluntary Monetary Encumbrances
LSE
DFL
VME
Voluntary Monetary Encumbrances
LSE
EXT
VME
Voluntary Monetary Encumbrances
LSE
MOD
VME
Voluntary Monetary Encumbrances
LSE
PAR
VME
Voluntary Monetary Encumbrances
LSE
RAS
VME
Voluntary Monetary Encumbrances
LSE
REL
VME
Voluntary Monetary Encumbrances
LSE
RRR
VME
Voluntary Monetary Encumbrances
LSE
RSN
VME
Voluntary Monetary Encumbrances
LSE
RVC
VME
Voluntary Monetary Encumbrances
LSE
SBD
VME
Voluntary Monetary Encumbrances
LSE
TER
VME
Voluntary Monetary Encumbrances
LSO
VME
Voluntary Monetary Encumbrances
LSO
AMD
VME
Voluntary Monetary Encumbrances
LSO
ASA
VME
Voluntary Monetary Encumbrances
LSO
ASN
VME
Voluntary Monetary Encumbrances
LSO
COR
VME
Voluntary Monetary Encumbrances
LSO
EXT
VME
Voluntary Monetary Encumbrances
LSO
MOD
VME
Voluntary Monetary Encumbrances
LSO
PAR
VME
Voluntary Monetary Encumbrances
LSO
REL
VME
Voluntary Monetary Encumbrances
LSO
SBD
VME
Voluntary Monetary Encumbrances
MLB
VME
Voluntary Monetary Encumbrances
MLB
PAR
VME
Voluntary Monetary Encumbrances
MLB
REL
VME
Voluntary Monetary Encumbrances
MSA
VME
Voluntary Monetary Encumbrances
MTG
VME
Voluntary Monetary Encumbrances
MTG
AAS
VME
Voluntary Monetary Encumbrances
MTG
ADV
VME
Voluntary Monetary Encumbrances
MTG
AMA
VME
Voluntary Monetary Encumbrances
MTG
AMD
VME
Voluntary Monetary Encumbrances
MTG
AME
VME
Voluntary Monetary Encumbrances
MTG
AMO
VME
Voluntary Monetary Encumbrances
MTG
AMR
VME
Voluntary Monetary Encumbrances
MTG
ASA
VME
Voluntary Monetary Encumbrances
MTG
ASM
VME
Voluntary Monetary Encumbrances
MTG
ASN
VME
Voluntary Monetary Encumbrances
MTG
COR
VME
Voluntary Monetary Encumbrances
MTG
EXT
VME
Voluntary Monetary Encumbrances
MTG
MOD
VME
Voluntary Monetary Encumbrances
MTG
MOP
VME
Voluntary Monetary Encumbrances
MTG
PAR
VME
Voluntary Monetary Encumbrances
MTG
RAD
VME
Voluntary Monetary Encumbrances
MTG
RAM
VME
Voluntary Monetary Encumbrances
MTG
RAS
VME
Voluntary Monetary Encumbrances
MTG
RCA
VME
Voluntary Monetary Encumbrances
MTG
REA
VME
Voluntary Monetary Encumbrances
MTG
REL
VME
Voluntary Monetary Encumbrances
MTG
RRM
VME
Voluntary Monetary Encumbrances
MTG
RRR
VME
Voluntary Monetary Encumbrances
MTG
RSU
VME
Voluntary Monetary Encumbrances
MTG
SAT
VME
Voluntary Monetary Encumbrances
MTG
SBD
VME
Voluntary Monetary Encumbrances
MTG
SUP
VME
Voluntary Monetary Encumbrances
NTE
VME
Voluntary Monetary Encumbrances
NTE
AMD
VME
Voluntary Monetary Encumbrances
NTE
MOD
VME
Voluntary Monetary Encumbrances
NTE
REL
VME
Voluntary Monetary Encumbrances
NTE
RRR
VME
Voluntary Monetary Encumbrances
PRM
VME
Voluntary Monetary Encumbrances
PRM
AMD
VME
Voluntary Monetary Encumbrances
PRM
MOD
VME
Voluntary Monetary Encumbrances
PRM
PAR
VME
Voluntary Monetary Encumbrances
PRM
REL
VME
Voluntary Monetary Encumbrances
PRM
RRR
VME
Voluntary Monetary Encumbrances
PRM
TER
VME
Voluntary Monetary Encumbrances
SAG
VME
Voluntary Monetary Encumbrances
SAG
MOD
VME
Voluntary Monetary Encumbrances
SAG
PAR
VME
Voluntary Monetary Encumbrances
SAG
REL
VME
Voluntary Monetary Encumbrances
SAG
RRR
VME
Voluntary Monetary Encumbrances
SAG
TER
VME
Voluntary Monetary Encumbrances
TDA
VME
Voluntary Monetary Encumbrances
TDA
AAS
VME
Voluntary Monetary Encumbrances
TDA
ADA
VME
Voluntary Monetary Encumbrances
TDA
AMA
VME
Voluntary Monetary Encumbrances
TDA
AMB
VME
Voluntary Monetary Encumbrances
TDA
AMD
VME
Voluntary Monetary Encumbrances
TDA
AMO
VME
Voluntary Monetary Encumbrances
TDA
ASA
VME
Voluntary Monetary Encumbrances
TDA
ASM
VME
Voluntary Monetary Encumbrances
TDA
ASN
VME
Voluntary Monetary Encumbrances
TDA
CAN
VME
Voluntary Monetary Encumbrances
TDA
CLA
VME
Voluntary Monetary Encumbrances
TDA
COA
VME
Voluntary Monetary Encumbrances
TDA
DFL
VME
Voluntary Monetary Encumbrances
TDA
DSC
VME
Voluntary Monetary Encumbrances
TDA
EXT
VME
Voluntary Monetary Encumbrances
TDA
MOD
VME
Voluntary Monetary Encumbrances
TDA
MOP
VME
Voluntary Monetary Encumbrances
TDA
PAA
VME
Voluntary Monetary Encumbrances
TDA
PAR
VME
Voluntary Monetary Encumbrances
TDA
PCA
VME
Voluntary Monetary Encumbrances
TDA
PRC
VME
Voluntary Monetary Encumbrances
TDA
RAD
VME
Voluntary Monetary Encumbrances
TDA
RAM
VME
Voluntary Monetary Encumbrances
TDA
RAS
VME
Voluntary Monetary Encumbrances
TDA
RCA
VME
Voluntary Monetary Encumbrances
TDA
REA
VME
Voluntary Monetary Encumbrances
TDA
REC
VME
Voluntary Monetary Encumbrances
TDA
REI
VME
Voluntary Monetary Encumbrances
TDA
REL
VME
Voluntary Monetary Encumbrances
TDA
RQP
VME
Voluntary Monetary Encumbrances
TDA
RQN
VME
Voluntary Monetary Encumbrances
TDA
RRR
VME
Voluntary Monetary Encumbrances
TDA
RSM
VME
Voluntary Monetary Encumbrances
TDA
RSN
VME
Voluntary Monetary Encumbrances
TDA
RSR
VME
Voluntary Monetary Encumbrances
TDA
RSU
VME
Voluntary Monetary Encumbrances
TDA
SAS
VME
Voluntary Monetary Encumbrances
TDA
SAT
VME
Voluntary Monetary Encumbrances
TDA
SBD
VME
Voluntary Monetary Encumbrances
TDA
SFR
VME
Voluntary Monetary Encumbrances
TDA
SPR
VME
Voluntary Monetary Encumbrances
TDA
STT
VME
Voluntary Monetary Encumbrances
TDA
SUB
VME
Voluntary Monetary Encumbrances
TDA
SUP
VME
Voluntary Monetary Encumbrances
TDD
VME
Voluntary Monetary Encumbrances
TDD
AAS
VME
Voluntary Monetary Encumbrances
TDD
ADA
VME
Voluntary Monetary Encumbrances
TDD
AMA
VME
Voluntary Monetary Encumbrances
TDD
AMB
VME
Voluntary Monetary Encumbrances
TDD
AMD
VME
Voluntary Monetary Encumbrances
TDD
AMO
VME
Voluntary Monetary Encumbrances
TDD
AMR
VME
Voluntary Monetary Encumbrances
TDD
ASA
VME
Voluntary Monetary Encumbrances
TDD
ASB
VME
Voluntary Monetary Encumbrances
TDD
ASM
VME
Voluntary Monetary Encumbrances
TDD
ASN
VME
Voluntary Monetary Encumbrances
TDD
ASR
VME
Voluntary Monetary Encumbrances
TDD
AST
VME
Voluntary Monetary Encumbrances
TDD
CAN
VME
Voluntary Monetary Encumbrances
TDD
CLA
VME
Voluntary Monetary Encumbrances
TDD
COA
VME
Voluntary Monetary Encumbrances
TDD
DFL
VME
Voluntary Monetary Encumbrances
TDD
DSC
VME
Voluntary Monetary Encumbrances
TDD
EXT
VME
Voluntary Monetary Encumbrances
TDD
FCL
VME
Voluntary Monetary Encumbrances
TDD
MOD
VME
Voluntary Monetary Encumbrances
TDD
MOP
VME
Voluntary Monetary Encumbrances
TDD
PAA
VME
Voluntary Monetary Encumbrances
TDD
PAR
VME
Voluntary Monetary Encumbrances
TDD
PCA
VME
Voluntary Monetary Encumbrances
TDD
PRC
VME
Voluntary Monetary Encumbrances
TDD
RAD
VME
Voluntary Monetary Encumbrances
TDD
RAM
VME
Voluntary Monetary Encumbrances
TDD
RAS
VME
Voluntary Monetary Encumbrances
TDD
RCA
VME
Voluntary Monetary Encumbrances
TDD
REA
VME
Voluntary Monetary Encumbrances
TDD
REC
VME
Voluntary Monetary Encumbrances
TDD
REI
VME
Voluntary Monetary Encumbrances
TDD
REL
VME
Voluntary Monetary Encumbrances
TDD
RQP
VME
Voluntary Monetary Encumbrances
TDD
RQN
VME
Voluntary Monetary Encumbrances
TDD
RRM
VME
Voluntary Monetary Encumbrances
TDD
RRR
VME
Voluntary Monetary Encumbrances
TDD
RSM
VME
Voluntary Monetary Encumbrances
TDD
RSN
VME
Voluntary Monetary Encumbrances
TDD
RSR
VME
Voluntary Monetary Encumbrances
TDD
RSU
VME
Voluntary Monetary Encumbrances
TDD
RVC
VME
Voluntary Monetary Encumbrances
TDD
SAS
VME
Voluntary Monetary Encumbrances
TDD
SAT
VME
Voluntary Monetary Encumbrances
TDD
SBD
VME
Voluntary Monetary Encumbrances
TDD
SFR
VME
Voluntary Monetary Encumbrances
TDD
SPR
VME
Voluntary Monetary Encumbrances
TDD
SRR
VME
Voluntary Monetary Encumbrances
TDD
STT
VME
Voluntary Monetary Encumbrances
TDD
SUB
VME
Voluntary Monetary Encumbrances
TDD
SUP
VME
Voluntary Monetary Encumbrances
TDD
TEA
VME
Voluntary Monetary Encumbrances
TDD
TES
VME
Voluntary Monetary Encumbrances
TDR
VME
Voluntary Monetary Encumbrances
TDR
AAS
VME
Voluntary Monetary Encumbrances
TDR
ADA
VME
Voluntary Monetary Encumbrances
TDR
AMA
VME
Voluntary Monetary Encumbrances
TDR
AMB
VME
Voluntary Monetary Encumbrances
TDR
AMD
VME
Voluntary Monetary Encumbrances
TDR
AMO
VME
Voluntary Monetary Encumbrances
TDR
AMR
VME
Voluntary Monetary Encumbrances
TDR
ASA
VME
Voluntary Monetary Encumbrances
TDR
ASB
VME
Voluntary Monetary Encumbrances
TDR
ASM
VME
Voluntary Monetary Encumbrances
TDR
ASN
VME
Voluntary Monetary Encumbrances
TDR
ASR
VME
Voluntary Monetary Encumbrances
TDR
AST
VME
Voluntary Monetary Encumbrances
TDR
CAN
VME
Voluntary Monetary Encumbrances
TDR
CLA
VME
Voluntary Monetary Encumbrances
TDR
COA
VME
Voluntary Monetary Encumbrances
TDR
DFL
VME
Voluntary Monetary Encumbrances
TDR
DSC
VME
Voluntary Monetary Encumbrances
TDR
EXT
VME
Voluntary Monetary Encumbrances
TDR
MOD
VME
Voluntary Monetary Encumbrances
TDR
MOP
VME
Voluntary Monetary Encumbrances
TDR
PAA
VME
Voluntary Monetary Encumbrances
TDR
PAR
VME
Voluntary Monetary Encumbrances
TDR
PCA
VME
Voluntary Monetary Encumbrances
TDR
PRC
VME
Voluntary Monetary Encumbrances
TDR
RAD
VME
Voluntary Monetary Encumbrances
TDR
RAM
VME
Voluntary Monetary Encumbrances
TDR
RAS
VME
Voluntary Monetary Encumbrances
TDR
RCA
VME
Voluntary Monetary Encumbrances
TDR
REA
VME
Voluntary Monetary Encumbrances
TDR
REC
VME
Voluntary Monetary Encumbrances
TDR
REI
VME
Voluntary Monetary Encumbrances
TDR
REL
VME
Voluntary Monetary Encumbrances
TDR
RQP
VME
Voluntary Monetary Encumbrances
TDR
RQN
VME
Voluntary Monetary Encumbrances
TDR
RRM
VME
Voluntary Monetary Encumbrances
TDR
RRR
VME
Voluntary Monetary Encumbrances
TDR
RSN
VME
Voluntary Monetary Encumbrances
TDR
RSR
VME
Voluntary Monetary Encumbrances
TDR
RSU
VME
Voluntary Monetary Encumbrances
TDR
RVC
VME
Voluntary Monetary Encumbrances
TDR
SAT
VME
Voluntary Monetary Encumbrances
TDR
SBD
VME
Voluntary Monetary Encumbrances
TDR
SFR
VME
Voluntary Monetary Encumbrances
TDR
SPR
VME
Voluntary Monetary Encumbrances
TDR
SRR
VME
Voluntary Monetary Encumbrances
TDR
STT
VME
Voluntary Monetary Encumbrances
TDR
SUP
VME
Voluntary Monetary Encumbrances
TDR
TEA
VME
Voluntary Monetary Encumbrances
TDR
TES
VME
Voluntary Monetary Encumbrances
TRU
VME
Voluntary Monetary Encumbrances
TRU
AMD
VME
Voluntary Monetary Encumbrances
TRU
MOD
VME
Voluntary Monetary Encumbrances
TRU
PAR
VME
Voluntary Monetary Encumbrances
TRU
REL
VME
Voluntary Monetary Encumbrances
TRU
RRR
VME
Voluntary Monetary Encumbrances
TRU
TER
VME
Voluntary Monetary Encumbrances
AOR
AAS
VME
Voluntary Monetary Encumbrances
TDD
ADV
VME
Voluntary Monetary Encumbrances
AGR
AMA
VME
Voluntary Monetary Encumbrances
IND
SUP
VME
Voluntary Monetary Encumbrances
LSE
RSU
VME
Voluntary Monetary Encumbrances
LSO
SRN
VME
Voluntary Monetary Encumbrances
MTG
DCH
VME
Voluntary Monetary Encumbrances
TDD
DCH
VME
Voluntary Monetary Encumbrances
TDD
RPR
VME
Voluntary Monetary Encumbrances
TDD
TSC
VME
Voluntary Monetary Encumbrances
TDD
COR
VME
Voluntary Monetary Encumbrances
AGR
CCO
VME
Voluntary Monetary Encumbrances
TDD
EXM
VME
Voluntary Monetary Encumbrances
AGR
NDV
VME
Voluntary Monetary Encumbrances
TRU
ASN
VME
Voluntary Monetary Encumbrances
AFF
ASN
VME
Voluntary Monetary Encumbrances
AFF
PAR
VME
Voluntary Monetary Encumbrances
AFF
REL
VME
Voluntary Monetary Encumbrances
AFF
SAT
VME
Voluntary Monetary Encumbrances
AGR
ADA
VME
Voluntary Monetary Encumbrances
AGR
AMB
VME
Voluntary Monetary Encumbrances
AGR
ASP
VME
Voluntary Monetary Encumbrances
AGR
CLA
VME
Voluntary Monetary Encumbrances
AGR
PCA
VME
Voluntary Monetary Encumbrances
AGR
RCA
VME
Voluntary Monetary Encumbrances
AGR
RRM
VME
Voluntary Monetary Encumbrances
AGR
RSU
VME
Voluntary Monetary Encumbrances
AGR
SEP
VME
Voluntary Monetary Encumbrances
AGR
TES
VME
Voluntary Monetary Encumbrances
AOR
COA
VME
Voluntary Monetary Encumbrances
AOR
COR
VME
Voluntary Monetary Encumbrances
AOR
PAA
VME
Voluntary Monetary Encumbrances
AOR
PTT
VME
Voluntary Monetary Encumbrances
AOR
RAS
VME
Voluntary Monetary Encumbrances
AOR
SAT
VME
Voluntary Monetary Encumbrances
AOR
SBD
VME
Voluntary Monetary Encumbrances
AOR
STT
VME
Voluntary Monetary Encumbrances
FIN
ADR
VME
Voluntary Monetary Encumbrances
FIN
AMO
VME
Voluntary Monetary Encumbrances
FIN
ASA
VME
Voluntary Monetary Encumbrances
FIN
ASM
VME
Voluntary Monetary Encumbrances
FIN
DCH
VME
Voluntary Monetary Encumbrances
FIN
PAA
VME
Voluntary Monetary Encumbrances
FIN
RAS
VME
Voluntary Monetary Encumbrances
LSE
ADR
VME
Voluntary Monetary Encumbrances
LSE
AMA
VME
Voluntary Monetary Encumbrances
LSE
AMB
VME
Voluntary Monetary Encumbrances
LSE
ARS
VME
Voluntary Monetary Encumbrances
LSE
CLA
VME
Voluntary Monetary Encumbrances
LSE
COA
VME
Voluntary Monetary Encumbrances
LSE
PAA
VME
Voluntary Monetary Encumbrances
LSE
PCA
VME
Voluntary Monetary Encumbrances
LSE
PTT
VME
Voluntary Monetary Encumbrances
LSE
RAT
VME
Voluntary Monetary Encumbrances
LSE
RCA
VME
Voluntary Monetary Encumbrances
LSE
REA
VME
Voluntary Monetary Encumbrances
LSE
RNW
VME
Voluntary Monetary Encumbrances
LSE
SRN
VME
Voluntary Monetary Encumbrances
LSE
SUP
VME
Voluntary Monetary Encumbrances
LSE
TEA
VME
Voluntary Monetary Encumbrances
MEM
CLA
VME
Voluntary Monetary Encumbrances
MTG
ADR
VME
Voluntary Monetary Encumbrances
MTG
CLA
VME
Voluntary Monetary Encumbrances
MTG
COA
VME
Voluntary Monetary Encumbrances
MTG
DSC
VME
Voluntary Monetary Encumbrances
MTG
EXM
VME
Voluntary Monetary Encumbrances
MTG
PAA
VME
Voluntary Monetary Encumbrances
MTG
PCA
VME
Voluntary Monetary Encumbrances
MTG
REI
VME
Voluntary Monetary Encumbrances
MTG
RQN
VME
Voluntary Monetary Encumbrances
MTG
TER
VME
Voluntary Monetary Encumbrances
NTE
ASN
VME
Voluntary Monetary Encumbrances
NTE
CAN
VME
Voluntary Monetary Encumbrances
PRM
ASM
VME
Voluntary Monetary Encumbrances
PRM
ASN
VME
Voluntary Monetary Encumbrances
PRM
CAN
VME
Voluntary Monetary Encumbrances
PRM
CLA
VME
Voluntary Monetary Encumbrances
PRM
SBD
VME
Voluntary Monetary Encumbrances
SAG
ASN
VME
Voluntary Monetary Encumbrances
SAG
CLA
VME
Voluntary Monetary Encumbrances
SAG
SAT
VME
Voluntary Monetary Encumbrances
SAG
SBD
VME
Voluntary Monetary Encumbrances
TDD
ADR
VME
Voluntary Monetary Encumbrances
TDD
CAA
VME
Voluntary Monetary Encumbrances
TDD
CAR
VME
Voluntary Monetary Encumbrances
TDD
CCO
VME
Voluntary Monetary Encumbrances
TDD
MLA
VME
Voluntary Monetary Encumbrances
TDD
PAS
VME
Voluntary Monetary Encumbrances
TDD
POT
VME
Voluntary Monetary Encumbrances
TDD
RAF
VME
Voluntary Monetary Encumbrances
TDD
RAT
VME
Voluntary Monetary Encumbrances
TDD
REV
VME
Voluntary Monetary Encumbrances
TDD
RQR
VME
Voluntary Monetary Encumbrances
TDD
RSG
VME
Voluntary Monetary Encumbrances
TDD
RTS
VME
Voluntary Monetary Encumbrances
TDD
RVR
VME
Voluntary Monetary Encumbrances
TDD
TSL
VME
Voluntary Monetary Encumbrances
TDD
TSM
VME
Voluntary Monetary Encumbrances
TDD
TSP
VME
Voluntary Monetary Encumbrances
TRU
SUP
VME
Voluntary Monetary Encumbrances
LSO
REA
VME
Voluntary Monetary Encumbrances
TRU
RVC
VME
Voluntary Monetary Encumbrances
AOR
ADR
VME
Voluntary Monetary Encumbrances
AOR
DCH
VME
Voluntary Monetary Encumbrances
AOR
EXT
VME
Voluntary Monetary Encumbrances
AOR
SUP
VME
Voluntary Monetary Encumbrances
BND
AMD
VME
Voluntary Monetary Encumbrances
LSE
REI
VME
Voluntary Monetary Encumbrances
MTG
CAN
VME
Voluntary Monetary Encumbrances
MTG
RAT
VME
Voluntary Monetary Encumbrances
MTG
RSR
VME
Voluntary Monetary Encumbrances
TRU
DIS
VME
Voluntary Monetary Encumbrances
TDR
RAT
VME
Voluntary Monetary Encumbrances
MLB
DCH
VME
Voluntary Monetary Encumbrances
AOR
ASA
VME
Voluntary Monetary Encumbrances
TDR
RQR
VME
Voluntary Monetary Encumbrances
TDR
COR
VME
Voluntary Monetary Encumbrances
AOR
CLA
VME
Voluntary Monetary Encumbrances
LSE
TES
VME
Voluntary Monetary Encumbrances
TDR
DCH
VME
Voluntary Monetary Encumbrances
LSE
RAD
VME
Voluntary Monetary Encumbrances
PRM
SAT
VME
Voluntary Monetary Encumbrances
AOR
RAM
VME
Voluntary Monetary Encumbrances
TRU
COR
VME
Voluntary Monetary Encumbrances
AGR
RQN
VME
Voluntary Monetary Encumbrances
AOR
AMA
VME
Voluntary Monetary Encumbrances
FIN
RAD
VME
Voluntary Monetary Encumbrances
JDG
DIS
VME
Voluntary Monetary Encumbrances
LSE
RFR
VME
Voluntary Monetary Encumbrances
LSO
PAA
VME
Voluntary Monetary Encumbrances
LSO
RAT
VME
Voluntary Monetary Encumbrances
TDD
DLQ
VME
Voluntary Monetary Encumbrances
TRU
RSG
VME
Voluntary Monetary Encumbrances
DMS
VME
Voluntary Monetary Encumbrances
LID
VME
Voluntary Monetary Encumbrances
MTG
SFR
VME
Voluntary Monetary Encumbrances
DOM
COR
VME
Voluntary Monetary Encumbrances
IND
ASN
VME
Voluntary Monetary Encumbrances
IND
COR
VME
Voluntary Monetary Encumbrances
LSO
COA
VME
Voluntary Monetary Encumbrances
NTE
PAA
VME
Voluntary Monetary Encumbrances
PRM
COA
VME
Voluntary Monetary Encumbrances
TDA
COR
VME
Voluntary Monetary Encumbrances
TDR
EXM
VME
Voluntary Monetary Encumbrances
TDR
TSL
VME
Voluntary Monetary Encumbrances
TDR
CCO
VME
Voluntary Monetary Encumbrances
TDR
ADR
VME
Voluntary Monetary Encumbrances
TDR
TSC
VME
Voluntary Monetary Encumbrances
AOR
SFR
VME
Voluntary Monetary Encumbrances
TDR
RPR
VME
Voluntary Monetary Encumbrances
MTG
CCO
VME
Voluntary Monetary Encumbrances
AOR
CAR
VME
Voluntary Monetary Encumbrances
TDR
TSM
VME
Voluntary Monetary Encumbrances
AOR
REC
VME
Voluntary Monetary Encumbrances
TDR
PAS
VME
Voluntary Monetary Encumbrances
MTG
PRC
VME
Voluntary Monetary Encumbrances
AOR
AMO
VME
Voluntary Monetary Encumbrances
MTG
CAR
VME
Voluntary Monetary Encumbrances
TDR
RVR
VME
Voluntary Monetary Encumbrances
TDA
TSL
VME
Voluntary Monetary Encumbrances
TDD
POP
VME
Voluntary Monetary Encumbrances
TDR
RAF
VME
Voluntary Monetary Encumbrances
LSE
SAT
VME
Voluntary Monetary Encumbrances
TDR
ADV
VME
Voluntary Monetary Encumbrances
TRU
REC
VME
Voluntary Monetary Encumbrances
DOM
PAR
VME
Voluntary Monetary Encumbrances
AOR
RAD
VME
Voluntary Monetary Encumbrances
ABI
VME
Voluntary Monetary Encumbrances
LNA
VME
Voluntary Monetary Encumbrances
LNA
AMD
VME
Voluntary Monetary Encumbrances
LNA
REL
VME
Voluntary Monetary Encumbrances
MTG
RAF
VME
Voluntary Monetary Encumbrances
ABI
ASN
VME
Voluntary Monetary Encumbrances
ABI
REL
VME
Voluntary Monetary Encumbrances
ABI
RRR
VME
Voluntary Monetary Encumbrances
ABI
SAT
VME
Voluntary Monetary Encumbrances
LNA
PAR
VME
Voluntary Monetary Encumbrances
LNA
RRR
VME
Voluntary Monetary Encumbrances
LNA
SBD
VME
Voluntary Monetary Encumbrances
FIN
RQN
VME
Voluntary Monetary Encumbrances
LSE
RQN
VME
Voluntary Monetary Encumbrances
MTG
REC
VME
Voluntary Monetary Encumbrances
MTG
CAA
VME
Voluntary Monetary Encumbrances
AOR
CCO
VME
Voluntary Monetary Encumbrances
AOR
EXM
VME
Voluntary Monetary Encumbrances
AOR
RRM
VME
Voluntary Monetary Encumbrances
TDR
RTS
VME
Voluntary Monetary Encumbrances
TDA
ADV
VME
Voluntary Monetary Encumbrances
TDA
CAR
VME
Voluntary Monetary Encumbrances
TDA
CCO
VME
Voluntary Monetary Encumbrances
TDA
DCH
VME
Voluntary Monetary Encumbrances
TDA
DLQ
VME
Voluntary Monetary Encumbrances
TDA
EXM
VME
Voluntary Monetary Encumbrances
TDA
POP
VME
Voluntary Monetary Encumbrances
TDA
RQR
VME
Voluntary Monetary Encumbrances
TDA
RTS
VME
Voluntary Monetary Encumbrances
TDA
TSC
VME
Voluntary Monetary Encumbrances
TDA
TSM
VME
Voluntary Monetary Encumbrances
DMS
ANM
VME
Voluntary Monetary Encumbrances
DMS
DIS
VME
Voluntary Monetary Encumbrances
DMS
NUL
VME
Voluntary Monetary Encumbrances
DMS
SEP
VME
Voluntary Monetary Encumbrances
SAG
ASA
VME
Voluntary Monetary Encumbrances
LSE
AMR
VME
Voluntary Monetary Encumbrances
CVU
DIS
VME
Voluntary Monetary Encumbrances
DPP
DIS
VME
Voluntary Monetary Encumbrances
TRU
SAT
VME
Voluntary Monetary Encumbrances
RCP
VME
Voluntary Monetary Encumbrances
RCP
AMD
VME
Voluntary Monetary Encumbrances
RCP
CAN
VME
Voluntary Monetary Encumbrances
RCP
COR
VME
Voluntary Monetary Encumbrances
RCP
DCH
VME
Voluntary Monetary Encumbrances
RCP
DFL
VME
Voluntary Monetary Encumbrances
RCP
MOD
VME
Voluntary Monetary Encumbrances
RCP
REL
VME
Voluntary Monetary Encumbrances
RCP
RRR
VME
Voluntary Monetary Encumbrances
RCP
RSN
VME
Voluntary Monetary Encumbrances
RCP
SAT
VME
Voluntary Monetary Encumbrances
RCP
TER
VME
Voluntary Monetary Encumbrances
AFF
TSL
VME
Voluntary Monetary Encumbrances
RCP
SBD
VME
Voluntary Monetary Encumbrances
AOR
RAF
VME
Voluntary Monetary Encumbrances
AOR
RPR
VME
Voluntary Monetary Encumbrances
MTG
ADA
VME
Voluntary Monetary Encumbrances
AOR
RSU

## TitlepointRoleNames.html

- Navigation: Title Searching > Reference > Role Names

### Role Names in TitlePoint

The role name abbreviation of each party will be returned in the Role element on the DocumentParty element. A limited number of party numbers for certain party roles on certain types of documents will change. All party numbers will still be 1, 2, or 3, but the actual values will change in some cases
For most users, no changes to your applications should be required unless your application uses the party number for specific purposes, such as to infer something about the party, perhaps its possible role on the document, then you may need to make some application changes in accordance with the changes in party numbers.
If your application makes specific use of the party number in the returned data, please contact Property Insight Support as soon as possible so that we may better understand your use of the party numbers and can provide the specific information you will need to make any needed changes. Given that only a limited number of roles and documents will be affected, it is unlikely that any changes will be needed, but it is important to be certain in order to avoid any potential disruption in service to your customers.
Role names and descriptions
PARTY ROLE DESCRIPTION
PARTY ROLE CODE
3RD PARTY DEFENDANT
3PTYDF
3RD PARTY PLAINTIFF
3PTYPL
4TH PARTY DEFENDANT
4PTYDF
4TH PARTY PLAINTIFF
4PTYPL
5TH PARTY DEFENDANT
5PTYDF
5TH PARTY PLAINTIFF
5PTYPL
6TH PARTY DEFENDANT
6PTYDF
6TH PARTY PLAINTIFF
6PTYPL
7TH PARTY DEFENDANT
7PTYDF
7TH PARTY PLAINTIFF
7PTYPL
ABSENTEE
ABSNTE
ACCEPTEE
ACEPTE
ACCEPTOR
ACEPTR
ADBN.WWA
ADBNWWA
ADMINISTRATOR
ADMSTR
ADMINISTRATOR WWA
ADMRWWA
ADMINISTRATRIX
ADMSTX
ADMINISTRATRIX DBN
ADMXDBN
ADMINISTRATRIX WWA
ADMXWWA
ADMR.WWA
ADMWWA
ADULT CHILD
ADTCHLD
AFFIANT
AFIANT
AGENCY
AGENCY
AGENT
AGENT
AGREEMENT
AGRMNT
ALSO KNOWN AS
AKA
ANCILLARY ADMINISTRATOR WITH WILL ANNEXED
ANADWWA
APPELLANT
APPELL
APPLICANT
APLCNT
APPOINTEE
APNTEE
APPOINTER
APNTOR
ARBITRATOR
ABTRTR
ASSESSEE
ASESEE
ASSIGNEE
ASGNEE
ASSIGNOR
ASSNOR
ASSOCIATION
ASSOC
ASSUMING PARTY
ASMPTY
ATTORNEY
ATTRNY
ATTORNEY (PR)
ATTPR
ATTORNEY FIFTH PARTY DEFENDANT
ATT5DEF
ATTORNEY FIFTH PARTY PLAINTIFF
ATT5PLF
ATTORNEY FOR APPELLANT
ATTAPP
ATTORNEY FOR ASSIGNEE
ATTASG
ATTORNEY FOR COUNTER CLAIMANT
ATTCTC
ATTORNEY FOR COUNTER DEFENDANT
ATTCTD
ATTORNEY FOR CREDITOR
ATTCRE
ATTORNEY FOR DEFENDANT
ATTDEF
ATTORNEY FOR INTERVENOR
ATTINT
ATTORNEY FOR INVOLVED PARTY
ATTINV
ATTORNEY FOR OLD NAME
ATTOLD
ATTORNEY FOR PETITIONER
ATTPET
ATTORNEY FOR PLAINTIFF
ATTPLF
ATTORNEY FOR PLAINTIFF/PETITIONER
ATTPPT
ATTORNEY FOR RESPONDENT
ATTRES
ATTORNEY FOURTH PARTY DEFENDANT
ATT4DEF
ATTORNEY FOURTH PARTY PLAINTIFF
ATT4PLF
ATTORNEY IN FACT
ATTINF
ATTORNEY SEVENTH PARTY DEFENDANT
ATT7DEF
ATTORNEY SEVENTH PARTY PLAINTIFF
ATT7PLF
ATTORNEY SIXTH PARTY DEFENDANT
ATT6DEF
ATTORNEY SIXTH PARTY PLAINTIFF
ATT6PLF
ATTORNEY THIRD PARTY DEFENDANT
ATT3DEF
ATTORNEY THIRD PARTY PLAINTIFF
ATT3PLF
BANK
BANK
BANKRUPTCY TRUSTEE
BKYTEE
BENEFACTOR
BENFCT
BENEFICIARY
BENEFI
BIDDER
BIDDER
BONDHOLDER
BDHLDR
BORROWER
BOROWR
BRIDE
BRIDE
BUILDER
BUILDR
BUSINESS NAME
BUSNAM
BUYER
BUYER
CASEWORKER FOR DEFENDANT/RESPONDENT
CSWKDF
CASEWORKER FOR PLAINTIFF/PETITIONER
CSWKPL
CHANGE NAME TO
CHGNAM
CHILD
CHLD
CITY
CITY
CLAIMANT
CLAMNT
CO-CONSERVATOR
COCNSV
CO-EXECUTOR
COEXCTR
CO-GUARDIAN
COGARD
COMMISSIONER
COMSSNR
COMPANY
CMPNY
COMPLAINANT
CMPLNT
CONSERVATEE
CNSRVE
CONSERVATOR
CNSRVR
CONSULTANT
CNSLNT
CONTESTANT
CNTSNT
CONTRACTOR
CNTROR
CORPORATION
CORP
CO-TRUSTEE
COTRSTEE
COUNTER CLAIMANT
CNTCLA
COUNTER DEFENDANT
CNTDEF
COUNTER PLAINTIFF
CNTPLF
COUNTY
COUNTY
COUNTY TREASURER
COTREA
COURT CLERK
CRTCLK
CREDITOR
CRDTOR
CROSS CLAIMANT
CRSCLA
CROSS DEFENDANT
CRSDEF
CUSTODIAN
CUSTDN
DOING BUSINESS AS
DBA
DEBTOR
DEBTOR
DECEASED
DECEAS
DECEDENT
DECDNT
DECLARANT
DCLRNT
DEFENDANT
DEFNDT
DEPARTMENT
DEPT
DEPOSITOR
DEPSTR
DETAINEE
DTNEE
DEVELOPER
DEVLPR
DISABLED PERSON
DISABL
DISCLAIMER
DSCLMR
DISMISSED CONSERVATOR
DSMCNSRV
DISMISSED FIDUCIARY
DSMFIDCRY
DISMISSED TRUSTEE
DSMTRSTEE
DISSOLVED PARTY
DISPTY
DISTRIBUTEE
DSTBEE
DISTRICT
DSTRCT
EMPLOYER
EMPLYR
ESTATE
ESTATE
EXECUTOR
EXECTR
EXECUTOR DBN
EXECRDBN
EXECUTRIX
EXECTX
FAMILY MEMBER
FAMMEM
FORMERLY DOING BUSINESS AS
FDB
FORMERLY DOING BUSINESS AS
FDBA
FICTITIOUS NAME
FICTNM
FIDUCIARY
FIDCRY
FORMERLY KNOWN AS
FKA
GAL–ALLEGED INCOMPETENT
GUAINC
GARNISHEE
GRNSHEE
GARNISHEE - BEING GARNISHED
GRNSHEE2
GARNISHEE DEFENDANT
GRNDFN
GOVERNMENTAL AGENCY
GVAGCY
GRANTOR
GRANTR
GROOM
GROOM
GUARANTOR
GURNTR
GUARDIAN
GUARD
GUARDIAN AD LITEM
GUARDL
GUARDIAN OF ESTATE
GUARDEST
GUARDIAN OF PERSON AND ESTATE
GUAP&E
HEIR
HEIR
IN RE
INRE
INCAPACITATED PERSON
INCPAC
INCOMPETENT
INCOMP
INCORPORATION
INCORP
INDEMNITOR
INDNTR
INDEPENDENT REPRESENTATIVE
INDREP
INDIVIDUAL & ASSIGNS
INDVAS
INTERESTED PARTY
ITDPTY
INTERVENOR
INTERV
INVOLVED PARTY
INVPTY
INVOLVED PARTY - DEFENDANT
INVDEF
INVOLVED PARTY - PETITIONER
INVPET
INVOLVED PARTY - PLAINTIFF
INVPLT
INVOLVED PARTY - PLAINTIFF / PETITIONER
INVPLF
INVOLVED PARTY - RESPONDENT
INVPRS
JOINED PARTY
JNDPTY
JOINT DEBTOR
JNTDBT
JUDGMENT CREDITOR
JDGCRE
JUDGMENT DEBTOR
JDGDBT
JUDGMENT DEBTOR AND CREDITOR
JDBTCR
JUNIOR LENDER
JRLNDR
JUNIOR LIEN HOLDER
JRLNHR
LANDLORD
LNDLRD
LENDER
LENDER
LESSEE
LESSEE
LESSOR
LESSOR
LICENSEE
LICNSE
LICENSOR
LCNSOR
LOCAL IDENTIFICATION NUMBER
LID
LIEN CLAIMANT
LNCLMT
LIEN HOLDER
LNHLDR
LIENEE
LIENEE
LIFE TENANT
LIFTNT
LIMITED PARTNERSHIP
LPTNRS
LOCALLY DEFINED LANGUAGE IDENTIFIER
LNG
LOCATOR
LOCATR
MAILED TO
MAILTO
MANAGER
MANGER
MEDIATOR
MEDIAT
MEMBER
MEMBER
MERGING CORPORATION
MERGCO
MILITARY BRANCH
MLTBRN
MINOR
MINOR
MORTGAGEE
MTGEE
MORTGAGOR
MTGOR
MOVANT
MOVANT
MUTUAL
MUTUAL
NATURAL PARENT
NTRLPRNT
NEW BORROWER
NEWBOR
NEW NAME
NEWNAM
NEW TRUSTEE
NEWTRS
NEXT OF KIN
NXKIN
NOW KNOWN AS
NKA
NOMINEE
NOMINE
NOTE
NOTE
NOTE HOLDER
NTHLDR
OBJECTOR
OBJCTR
OBLIGEE
OBLGEE
OBLIGOR
OBLGOR
ON BEHALF OF
OBO
OFFICIATOR
OFFCTR
OLD NAME
OLDNAM
OPTIONEE
OPTNEE
OPTIONOR
OPTNOR
ORGANIZATION
ORGAN
OTHER
OTHER
OTHER PARENT
OTPRNT
OWNER
OWNER
PARENT
PARENT
PARTIAL ASSIGNEE
PARASG
PARTNER
PARTNR
PARTNERSHIP
PRTSHP
PARTY OF FIRST PART
FRSPTY
PARTY OF INTEREST
PTYINT
PARTY OF SECOND PART
SCDPTY
PATIENT
PATIEN
PAYEE
PAYEE
PAYOR
PAYOR
PERMITEE
PRMTEE
PERSONAL REPRESENTATIVE
PRSREP
PETITIONER
PETITR
PLAINTIFF
PLNTIF
PLEDGEE
PLGEE
PLEDGOR
PLGOR
PRINCIPAL
PRNCPL
PRINCIPAL CONTRACTOR
PCNTRR
PRO SE DEFENDANT / RESPONDENT
PRODEF
PRO SE INVOLVED PARTY
PROINV
PRO SE PLAINTIFF / PETITIONER
PROPLT
PROBATE INVESTIGATOR
PROIVR
PROBATE REFEREE
PRORFR
PROBATION DEPARTMENT
PROBDEPT
PROMISEE
PRMSEE
PROPOSED CONSERVATOR
PRPSDCNSRV
PROVIDER
PROVDR
PSYCH DEPT
PSYCHDEPT
PUBLIC AUTHORITY
PBAUTH
PURCHASER
PRCHSR
REAL PARTY IN INTEREST
RELPTY
REALTOR
REALTR
RECEIVER
RECIVR
RECEIVING PARTY
RCVPTY
RECIPIENT
RECPNT
RECORDER
RECRDR
REDEEMER
REDEMR
REGISTRANT
RGTRNT
RELATOR
RELTOR
REPRESENTATIVE
RPRSNT
REQUESTER
REQSTR
RESPONDENT
RESPON
SECRETARY OF STATE
SECYST
SECURED PARTY
SECPTY
SELLER
SELLER
SENIOR LENDER
SNRLNDR
SENIOR LIEN HOLDER
SRLNHR
SERVICER
SRVCER
SETTLOR
SETTLR
SHERIFF
SHERIF
SPECIAL NOTICE TO
SPCLNT
SPECIAL OFFICERS
SPLOFF
STANDBY GUARDIAN
SDBYGU
STATE
STATE
STREET
STREET
SUBGRANTEE
SBGNTE
SUBJECT OF PETITION
SBJPTN
SUBORDINATING LENDER
SUBLNDR
SUBORDINATOR
SUBNTR
SUBSTITUTED PAYEE
SUBPYE
SUBSTITUTED TRUSTEE
SUBTRS
SUBCONTRACTOR
SUBCTR
SUCCESSOR
SUCSOR
SUCCESSOR ATTORNEY-IN-FACT
SATINF
SUCCESSOR BENFICIARY
SUCBEN
SUCCESSOR EXECUTOR
SUCEXE
SUCCESSOR SUBGRANTEE
SSBGNT
SUCCESSOR TRUSTEE
SUCTRS
SUED AS
SUEDAS
SUPERIOR LENDER
SUPLND
SURETY
SURETY
SURVEYOR
SURVEY
SURVIVING JOINT TENANT
SURVJT
SURVIVING CORPORATION
SURCOR
SURVIVING SPOUSE
SURSPS
TAX COLLECTOR
TAXCOL
TAXPAYER
TAXPYR
TEMPORARY CONSERVATOR
TMPCNS
TEMPORARY GUARDIAN
TGUARD
TENANT
TENANT
TENANT IN COMMON
TNTCMN
TESTATOR
TESTOR
THIRD PARTY
THRDPTY
THIRD PARTY LENDER
TPLNDR
TRUE NAME
TN
TORTFEASOR
TRTFSR
TRANSFEREE
TRNSFE
TRANSFEROR
TRNSFR
TRUST
TRUST
TRUSTOR
TRSTOR
TRUSTEE
TRSTEE
TRUSTEE OF ESTATE
TRSTEEEST
TRUSTEE OF PERSON & ESTATE
TRSTPRNEST
TST0
TST0
UNDERSIGNED
UNDSGN
UNKNOWN
UNKNWN
UTILITY
UTILTY
VENDEE
VENDEE
VENDOR
VENDOR
VILLAGE
VILAGE
WARD
WARD
WITHDRAWN ATTORNEY
WDA
WITHDRAWN ATTORNEY FOR DEFENDA
WDADEF
WITHDRAWN ATTORNEY FOR INTERVENOR
WDAINT
WITHDRAWN ATTORNEY FOR INVOLVED PARTY
WDAINV
WITHDRAWN ATTORNEY FOR PETITIONER
WDAPET
WITHDRAWN ATTORNEY FOR PLAINTIFF
WDAPLF
WITHDRAWN ATTORNEY FOR RESPONDENT
WDARES
WITHDRAWN ATTORNEY FOURTH PART
WA4PRT
WITHDRAWN ATTORNEY THIRD PARTY
WA3PRT
WITHDRAWN GUARDIAN AD LITEM
WDAGUA
WSD
WSD
WSP0
WSP0

## titleplants.html

- Navigation: Title Searching > Reference > TitlePoint plant Counties

### List of TitlePoint plant counties

State
County
FIPS Code
AZ
La Paz
04012
Maricopa
04013
Mohave
04015
Pinal
04021
Yavapai
04025
CA
Alameda
06001
Butte
06007
Contra Costa
06013
El Dorado
06017
Fresno
06019
Humboldt
06023
Imperial
06025
Kern
06029
Kings
06031
Lake
06033
Lassen
06035
Los Angeles
06037
Madera
06039
Mendocino
06045
Merced
06047
Napa
06055
Nevada
06057
Orange
06059
Placer
06061
Plumas
06063
Riverside
06065
Sacramento
06067
San Benito
06069
San Bernardino
06071
San Diego
06073
San Francisco
06075
San Joaquin
06077
Santa Barbara
06083
Santa Clara
06085
Shasta
06089
Solano
06095
Stanislaus
06099
Sutter
06101
Tehama
06103
Tulare
06107
Ventura
06111
Yolo
06113
Yuba
06115
FL
Brevard
12009
Broward
12011
Hillsborough
12057
Miami-Dade
12086
Orange
12095
Palm Beach
12099
Pasco
12101
Pinellas
12103
Polk
12105
Seminole
12117
Volusia
12127
IL
Cook
17031
DeKalb
17037
DuPage
17043
Kane
17089
Kendall
17093
Lake
17097
McHenry
17111
Will
17197
IN
La Porte
18091
Lake
18089
Porter
18127
MD
Allegany
24001
Anne Arundel
24003
Baltimore
24005
Baltimore City
24510
Calvert
24009
Caroline
24011
Carroll
24013
Cecil
24015
Charles
24017
Dorchester
24019
Frederick
24021
Garrett
24023
Harford
24025
Howard
24027
Kent
24029
Montgomery
24031
Prince Georges
24033
Queen Annes
24035
Saint Marys
24037
Somerset
24039
Talbot
24041
Washington
24043
US Courts (Maryland)
24000
MI
Allegan
26005
Clinton
26037
Eaton
26045
Genesee
26049
Ingham
26065
Kalamazoo
26077
Kent
26081
Livingston
26093
Monroe
26115
Muskegon
26121
Ottawa
26139
Saginaw
26145
Sanilac
26151
St Clair
26147
Washtenaw
26161
MT
Cascade
30013
Lewis and Clark
30049
OH
Cuyahoga
39035
Lake
39085
Summit
39153
OR
Clackamas
41005
Multnomah
41051
Washington
41067
TX
Tarrant
48439
WA
King
53033
Pierce
53053
Snohomish
53061
Thurston
53067
WI
Adams
55001
Columbia
55021
Dane
55025
Fond du Lac
55039
Green Lake
55047
Iowa
55049
Juneau
55057
Milwaukee
55079
Richland
55103
Sauk
55111
Walworth
55127
Waukesha
55133

## TitlePointPlantCountiesTaxes.html

- Navigation: Title Searching > Reference > TitlePoint plant Counties With Taxes

### List of TitlePoint plant counties with taxes

State
County
FIPS Code
AZ
La Paz
04012
Maricopa
04013
Mohave
04015
Pinal
04021
Yavapai
04025
CA
Alameda
06001
Butte
06007
Contra Costa
06013
El Dorado
06017
Fresno
06019
Humboldt
06023
Imperial
06025
Kern
06029
Kings
06031
Lassen
06035
Los Angeles
06037
Madera
06039
Mendocino
06045
Merced
06047
Napa
06055
Nevada
06057
Orange
06059
Placer
06061
Plumas
06063
Riverside
06065
Sacramento
06067
San Benito
06069
San Bernardino
06071
San Diego
06073
San Francisco
06075
San Joaquin
06077
San Mateo
06081
Santa Barbara
06083
Santa Clara
06085
Shasta
06089
Solano
06095
Stanislaus
06099
Sutter
06101
Tehama
06103
Tulare
06107
Ventura
06111
Yolo
06113
Yuba
06115
CO
Arapahoe
08005
Denver
08031
Jefferson
08059
FL
Miami-Dade
12086
IL
Cook
17031
TX
Tarrant
48439

## TpxGeoCounties.html

- Navigation: Title Searching > Reference > TPX Geo counties

### List of TPX Geo counties

State
County
FIPS Code
CO
Adams
08001
Arapahoe
08005
Boulder
08013
Broomfield
08014
Custer
08027
Delta
08029
Denver
08031
Douglas
08035
El Paso
08041
Fremont
08043
Jackson
08057
Jefferson
08059
Larimer
08069
Mesa
08077
Montrose
08085
Ouray
08091
Park
08093
Routt
08107
Summit
08117
Teller
08119
Weld
08123
FL
Clay
12019
Collier
12021
Duval
12031
Flagler
12035
Lake
12069
Lee
12071
Manatee
12081
Martin
12085
Okaloosa
12091
Sarasota
12115
St Johns
12109
Walton
12131
NV
Clark
32003
OR
Benton
41003
Clatsop
41007
Columbia
41009
Coos
41011
Douglas
41019
Jackson
41029
Josephine
41033
Linn
41043
Marion
41047
Polk
41053
Tillamook
41057
Yamhill
41071
TN
Davidson
47037
Rutherford
47149
Sumner
47165
Williamson
47187
Wilson
47189

## TpxGgCounties.html

- Navigation: Title Searching > Reference > TPX GG counties

### List of TPX GG counties

State
County
FIPS Code
AL
Baldwin
01003
AZ
Apache
04001
Graham
04009
Greenlee
04011
Navajo
04017
Pima
04019
CA
Alameda
06001
Contra Costa
06013
El Dorado
06017
Fresno
06019
Los Angeles
06037
Marin
06041
Mendocino
06045
Napa
06055
Orange
06059
Placer
06061
Riverside
06065
Sacramento
06067
San Diego
06073
San Luis Obispo
06079
San Mateo
06081
Santa Clara
06085
Tulare
06107
Tuolumne
06109
Ventura
06111
CO
Clear Creek
08019
Eagle
08037
Elbert
08039
Garfield
08045
Gunnison
08051
Pueblo
08101
FL
Alachua
12001
Baker
12003
Bay
12005
Bradford
12007
Calhoun
12013
Charlotte
12015
Citrus
12017
Columbia
12023
DeSoto
12027
Dixie
12029
Escambia
12033
Franklin
12037
Gadsden
12039
Gilchrist
12041
Glades
12043
Gulf
12045
Hamilton
12047
Hardee
12049
Hendry
12051
Hernando
12053
Highlands
12055
Hillsborough
12057
Holmes
12059
Indian River
12061
Jackson
12063
Jefferson
12065
Lafayette
12067
Leon
12073
Levy
12075
Liberty
12077
Madison
12079
Marion
12083
Monroe
12087
Nassau
12089
Okeechobee
12093
Osceola
12097
Putnam
12107
Santa Rosa
12113
St Lucie
12111
Sumter
12119
Suwannee
12121
Taylor
12123
Union
12125
Wakulla
12129
Washington
12133
NC
Rowan
37159
NM
Bernalillo
35001
NV
Carson City
32510
Douglas
32005
Nye
32023
Washoe
32031
OH
Cuyahoga
39035
Portage
39133
TN
Anderson
47001
Cheatham
47021
Robertson
47147
Shelby
47157
TX
Collin
48085
Denton
48121
El Paso
48141
Kaufman
48257
Liberty
48291
Montgomery
48339
WA
Snohomish
53061

## hybridplants.html

- Navigation: Title Searching > Reference > Hybrid counties

### List of Hybrid counties

State
County
FIPS Code
Alabama
Baldwin
01003
Madison
01089
Mobile
01097
Shelby
01117
Arkansas
Benton
05007
Greene
05055
White
05145
California
Sonoma
06097
Colorado
Adams
08001
Arapahoe
08005
Denver
08031
Jefferson
08059
Florida
Alachua
12001
Bay
12005
Charlotte
12015
Citrus
12017
Columbia
12023
Escambia
12033
Hernando
12053
Highlands
12055
Indian River
12061
Lake
12069
Leon
12073
Marion
12083
Monroe
12087
Nassau
12089
Osceola
12097
Santa Rosa
12113
St Lucie
12111
Sumter
12119
Kentucky
Boone
21015
Bullitt
21029
Campbell
21037
Fayette
21067
Hardin
21093
Henderson
21101
Hopkins
21107
Jefferson
21111
Jessamine
21113
Madison
21151
Nelson
21179
Oldham
21185
Scott
21209
Shelby
21211
Warren
21227
Maryland
Allegany
24001
Anne Arundel
24003
Baltimore
24005
Baltimore City
24510
Calvert
24009
Caroline
24011
Carroll
24013
Cecil
24015
Charles
24017
Dorchester
24019
Frederick
24021
Garrett
24023
Harford
24025
Howard
24027
Kent
24029
Montgomery
24031
Prince Georges
24033
Queen Annes
24035
Saint Marys
24037
Somerset
24039
Talbot
24041
Washington
24043
Wicomico
24045
Worcester
24047
Nevada
Carson City
32510
Douglas
32005
Nye
32023
Washoe
32031
Ohio
Clark
39023
Columbiana
39029
Greene
39057
Hamilton
39061
Jefferson
39081
Lake
39085
Licking
39089
Lorain
39093
Lucas
39095
Medina
39103
Portage
39133
Richland
39139
Stark
39151
Summit
39153
Tuscarawas
39157
Wayne
39169
Pennsylvania
Berks
42011
Centre
42027
Westmoreland
42129
South Carolina
Aiken
45003
Dorchester
45035
Lancaster
45057
Tennessee
Anderson
47001
Bedford
47003
Bradley
47011
Campbell
47013
Carter
47019
Cheatham
47021
Cocke
47029
Coffee
47031
Cumberland
47035
Davidson
47037
Fayette
47047
Franklin
47051
Giles
47055
Greene
47059
Hamblen
47063
Hamilton
47065
Hawkins
47073
Hickman
47081
Jefferson
47089
Lincoln
47103
Loudon
47105
Macon
47111
Madison
47113
Maury
47119
Monroe
47123
Rhea
47143
Roane
47145
Robertson
47147
Rutherford
47149
Sevier
47155
Shelby
47157
Sullivan
47163
Sumner
47165
Union
47173
Washington
47179
Williamson
47187
Wilson
47189
