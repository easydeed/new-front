"""
Legal Knowledge Base for California Real Estate Law
Comprehensive database of legal codes, requirements, validation rules,
risk factors, and best practices for real estate document preparation
Following the WIZARD_ARCHITECTURE_OVERHAUL_PLAN Phase 2.4 specifications
"""
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, date
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

class DocumentType(Enum):
    """Supported document types"""
    GRANT_DEED = "grant_deed"
    QUITCLAIM_DEED = "quitclaim_deed"
    WARRANTY_DEED = "warranty_deed"
    INTERSPOUSAL_TRANSFER = "interspousal_transfer"
    TAX_DEED = "tax_deed"
    PROPERTY_PROFILE = "property_profile"

class Severity(Enum):
    """Severity levels for legal issues"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

@dataclass
class LegalCode:
    """California legal code reference"""
    section: str
    title: str
    description: str
    requirements: List[str]
    penalties: List[str]
    applicable_documents: List[str]
    effective_date: Optional[str] = None
    last_updated: Optional[str] = None

@dataclass
class ValidationRule:
    """Legal validation rule"""
    id: str
    name: str
    description: str
    code_reference: str
    document_types: List[str]
    fields: List[str]
    severity: Severity
    validation_logic: str
    error_message: str
    remediation: str

@dataclass
class RiskFactor:
    """Title and transaction risk factor"""
    id: str
    name: str
    description: str
    category: str
    severity: Severity
    indicators: List[str]
    mitigation: List[str]
    legal_basis: Optional[str] = None

@dataclass
class BestPractice:
    """Legal best practice"""
    id: str
    name: str
    description: str
    document_types: List[str]
    category: str
    importance: str
    implementation: List[str]

class LegalKnowledgeBase:
    """
    Comprehensive legal knowledge base for California real estate law
    Provides structured access to legal codes, validation rules, risk factors,
    and best practices for document preparation and compliance
    """
    
    def __init__(self):
        self.california_codes = self._load_california_codes()
        self.validation_rules = self._load_validation_rules()
        self.risk_factors = self._load_risk_factors()
        self.best_practices = self._load_best_practices()
        self.document_requirements = self._load_document_requirements()
        self.field_definitions = self._load_field_definitions()
        self.county_specific_rules = self._load_county_specific_rules()
        
        logger.info("Legal Knowledge Base initialized successfully")

    def get_applicable_codes(self, document_type: str) -> List[LegalCode]:
        """Get legal codes applicable to a specific document type"""
        return [
            code for code in self.california_codes.values()
            if document_type in code.applicable_documents
        ]

    def get_validation_rules(self, document_type: str, field: Optional[str] = None) -> List[ValidationRule]:
        """Get validation rules for document type and optionally specific field"""
        rules = [
            rule for rule in self.validation_rules.values()
            if document_type in rule.document_types
        ]
        
        if field:
            rules = [rule for rule in rules if field in rule.fields]
        
        return rules

    def get_risk_factors(self, category: Optional[str] = None, severity: Optional[Severity] = None) -> List[RiskFactor]:
        """Get risk factors by category and/or severity"""
        factors = list(self.risk_factors.values())
        
        if category:
            factors = [f for f in factors if f.category == category]
        
        if severity:
            factors = [f for f in factors if f.severity == severity]
        
        return factors

    def get_document_requirements(self, document_type: str) -> Dict[str, Any]:
        """Get comprehensive requirements for a document type"""
        return self.document_requirements.get(document_type, {})

    def validate_field_value(self, document_type: str, field: str, value: Any) -> List[Dict[str, Any]]:
        """Validate a field value against legal requirements"""
        violations = []
        rules = self.get_validation_rules(document_type, field)
        
        for rule in rules:
            if not self._apply_validation_logic(rule, field, value):
                violations.append({
                    "rule_id": rule.id,
                    "severity": rule.severity.value,
                    "message": rule.error_message,
                    "code_reference": rule.code_reference,
                    "remediation": rule.remediation
                })
        
        return violations

    def get_county_rules(self, county: str) -> Dict[str, Any]:
        """Get county-specific legal requirements"""
        return self.county_specific_rules.get(county, {})

    def search_knowledge(self, query: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search the knowledge base for relevant information"""
        results = []
        query_lower = query.lower()
        
        # Search codes
        for code in self.california_codes.values():
            if (query_lower in code.title.lower() or 
                query_lower in code.description.lower() or
                any(query_lower in req.lower() for req in code.requirements)):
                results.append({
                    "type": "legal_code",
                    "relevance": self._calculate_relevance(query, code.title + " " + code.description),
                    "data": asdict(code)
                })
        
        # Search validation rules
        for rule in self.validation_rules.values():
            if (query_lower in rule.name.lower() or 
                query_lower in rule.description.lower()):
                results.append({
                    "type": "validation_rule",
                    "relevance": self._calculate_relevance(query, rule.name + " " + rule.description),
                    "data": asdict(rule)
                })
        
        # Search risk factors
        for factor in self.risk_factors.values():
            if (query_lower in factor.name.lower() or 
                query_lower in factor.description.lower()):
                results.append({
                    "type": "risk_factor",
                    "relevance": self._calculate_relevance(query, factor.name + " " + factor.description),
                    "data": asdict(factor)
                })
        
        # Sort by relevance
        results.sort(key=lambda x: x["relevance"], reverse=True)
        
        return results[:20]  # Return top 20 results

    def _load_california_codes(self) -> Dict[str, LegalCode]:
        """Load California legal codes"""
        codes = {}
        
        # Civil Code §1091 - Grant Deed Requirements
        codes["CC1091"] = LegalCode(
            section="Civil Code §1091",
            title="Grant Deed Requirements",
            description="Establishes the essential elements required for a valid grant deed in California",
            requirements=[
                "Must identify grantor and grantee with sufficient certainty",
                "Must contain words of grant or conveyance",
                "Must describe the property being conveyed",
                "Must be signed by the grantor",
                "Must be acknowledged before a notary public",
                "Must be delivered to the grantee"
            ],
            penalties=[
                "Deed may be void for failure to meet essential elements",
                "Recording may be rejected by county recorder",
                "Title defects may result from improper execution"
            ],
            applicable_documents=[DocumentType.GRANT_DEED.value],
            effective_date="1872-01-01",
            last_updated="2023-01-01"
        )
        
        # Civil Code §1092 - Property Description Requirements
        codes["CC1092"] = LegalCode(
            section="Civil Code §1092",
            title="Property Description Requirements",
            description="Specifies requirements for legal descriptions of real property in deeds",
            requirements=[
                "Description must identify property with reasonable certainty",
                "May reference recorded maps, surveys, or plats",
                "Must include county where property is located",
                "APN alone may be insufficient for legal description",
                "Metes and bounds descriptions must be complete and accurate"
            ],
            penalties=[
                "Deed may be void for uncertainty in property description",
                "Title insurance may be unavailable",
                "Boundary disputes may arise"
            ],
            applicable_documents=[
                DocumentType.GRANT_DEED.value,
                DocumentType.QUITCLAIM_DEED.value,
                DocumentType.WARRANTY_DEED.value
            ],
            effective_date="1872-01-01",
            last_updated="2023-01-01"
        )
        
        # Civil Code §1095 - Grantor Authority and Capacity
        codes["CC1095"] = LegalCode(
            section="Civil Code §1095",
            title="Grantor Authority and Capacity",
            description="Establishes requirements for grantor authority and legal capacity to convey property",
            requirements=[
                "Grantor must have legal capacity to convey",
                "Grantor must own the interest being conveyed",
                "Corporate grantors must have proper authorization",
                "Grantor names must match title records exactly",
                "Married grantors may need spouse consent for community property"
            ],
            penalties=[
                "Deed may be void for lack of authority",
                "Title defects from unauthorized conveyance",
                "Potential breach of fiduciary duty claims"
            ],
            applicable_documents=[
                DocumentType.GRANT_DEED.value,
                DocumentType.QUITCLAIM_DEED.value,
                DocumentType.WARRANTY_DEED.value,
                DocumentType.INTERSPOUSAL_TRANSFER.value
            ],
            effective_date="1872-01-01",
            last_updated="2023-01-01"
        )
        
        # Government Code §27321 - Recording Requirements
        codes["GC27321"] = LegalCode(
            section="Government Code §27321",
            title="Recording Requirements",
            description="Establishes requirements for recording real property documents",
            requirements=[
                "Must include complete return address for document mailing",
                "Must pay all required recording fees",
                "Must meet county formatting and margin requirements",
                "Must include APN when required by county",
                "Must be legible and in permanent ink"
            ],
            penalties=[
                "Recording will be rejected by county recorder",
                "Document will not provide constructive notice",
                "Priority may be lost to subsequent recordings"
            ],
            applicable_documents=[
                DocumentType.GRANT_DEED.value,
                DocumentType.QUITCLAIM_DEED.value,
                DocumentType.WARRANTY_DEED.value,
                DocumentType.INTERSPOUSAL_TRANSFER.value
            ],
            effective_date="1963-01-01",
            last_updated="2023-01-01"
        )
        
        # Revenue & Taxation Code §11911 - Documentary Transfer Tax
        codes["RTC11911"] = LegalCode(
            section="Revenue & Taxation Code §11911",
            title="Documentary Transfer Tax",
            description="Establishes requirements for documentary transfer tax on real property transfers",
            requirements=[
                "Must declare transfer tax amount or exemption",
                "Must calculate tax based on consideration or full value",
                "Must indicate whether city or county tax applies",
                "Must specify basis for tax calculation",
                "Exemptions must be properly claimed and documented"
            ],
            penalties=[
                "Recording may be rejected without proper tax declaration",
                "Tax penalties and interest may apply",
                "Additional assessments may be imposed"
            ],
            applicable_documents=[
                DocumentType.GRANT_DEED.value,
                DocumentType.WARRANTY_DEED.value
            ],
            effective_date="1968-01-01",
            last_updated="2023-01-01"
        )
        
        # Family Code §1100 - Community Property Management
        codes["FC1100"] = LegalCode(
            section="Family Code §1100",
            title="Community Property Management and Control",
            description="Establishes requirements for community property transfers between spouses",
            requirements=[
                "Both spouses must consent to community property transfers",
                "Interspousal transfers have special requirements",
                "Community property presumptions apply to married couples",
                "Separate property must be clearly identified",
                "Proper characterization affects tax treatment"
            ],
            penalties=[
                "Transfer may be void without proper consent",
                "Breach of fiduciary duty claims possible",
                "Tax benefits may be lost"
            ],
            applicable_documents=[
                DocumentType.GRANT_DEED.value,
                DocumentType.QUITCLAIM_DEED.value,
                DocumentType.INTERSPOUSAL_TRANSFER.value
            ],
            effective_date="1994-01-01",
            last_updated="2023-01-01"
        )
        
        return codes

    def _load_validation_rules(self) -> Dict[str, ValidationRule]:
        """Load validation rules for legal compliance"""
        rules = {}
        
        # Grantor Name Validation
        rules["grantor_name_required"] = ValidationRule(
            id="grantor_name_required",
            name="Grantor Name Required",
            description="Grantor names are mandatory for all deeds",
            code_reference="Civil Code §1091, §1095",
            document_types=[
                DocumentType.GRANT_DEED.value,
                DocumentType.QUITCLAIM_DEED.value,
                DocumentType.WARRANTY_DEED.value
            ],
            fields=["parties.grantorsText", "grantor_name"],
            severity=Severity.CRITICAL,
            validation_logic="not_empty",
            error_message="Grantor names are required and cannot be empty",
            remediation="Enter complete grantor names as they appear on current title"
        )
        
        # Grantee Name Validation
        rules["grantee_name_required"] = ValidationRule(
            id="grantee_name_required",
            name="Grantee Name Required",
            description="Grantee names are mandatory for all deeds",
            code_reference="Civil Code §1091",
            document_types=[
                DocumentType.GRANT_DEED.value,
                DocumentType.QUITCLAIM_DEED.value,
                DocumentType.WARRANTY_DEED.value
            ],
            fields=["parties.granteesText", "grantee_name"],
            severity=Severity.CRITICAL,
            validation_logic="not_empty",
            error_message="Grantee names are required and cannot be empty",
            remediation="Enter complete grantee names with vesting information"
        )
        
        # Legal Description Validation
        rules["legal_description_required"] = ValidationRule(
            id="legal_description_required",
            name="Legal Description Required",
            description="Property must be described with reasonable certainty",
            code_reference="Civil Code §1092",
            document_types=[
                DocumentType.GRANT_DEED.value,
                DocumentType.QUITCLAIM_DEED.value,
                DocumentType.WARRANTY_DEED.value
            ],
            fields=["parties.legalDescription", "legal_description"],
            severity=Severity.CRITICAL,
            validation_logic="not_empty_and_sufficient_length",
            error_message="Legal description is required and must be sufficiently detailed",
            remediation="Obtain complete legal description from title report or survey"
        )
        
        # Transfer Tax Validation
        rules["transfer_tax_declaration"] = ValidationRule(
            id="transfer_tax_declaration",
            name="Transfer Tax Declaration Required",
            description="Transfer tax must be declared or exemption claimed",
            code_reference="Revenue & Taxation Code §11911",
            document_types=[
                DocumentType.GRANT_DEED.value,
                DocumentType.WARRANTY_DEED.value
            ],
            fields=["tax.dttAmount", "tax.exemptionReason"],
            severity=Severity.HIGH,
            validation_logic="has_tax_amount_or_exemption",
            error_message="Transfer tax amount or exemption reason must be provided",
            remediation="Calculate transfer tax or specify exemption reason"
        )
        
        # Recording Information Validation
        rules["recording_info_required"] = ValidationRule(
            id="recording_info_required",
            name="Recording Information Required",
            description="Complete recording information required for county processing",
            code_reference="Government Code §27321",
            document_types=[
                DocumentType.GRANT_DEED.value,
                DocumentType.QUITCLAIM_DEED.value,
                DocumentType.WARRANTY_DEED.value,
                DocumentType.INTERSPOUSAL_TRANSFER.value
            ],
            fields=["recording.requestedBy", "recording.mailTo"],
            severity=Severity.HIGH,
            validation_logic="complete_recording_info",
            error_message="Complete recording information including return address is required",
            remediation="Provide requesting party name and complete return address"
        )
        
        # APN Format Validation
        rules["apn_format_validation"] = ValidationRule(
            id="apn_format_validation",
            name="APN Format Validation",
            description="APN should follow standard California format",
            code_reference="Government Code §27321",
            document_types=[
                DocumentType.GRANT_DEED.value,
                DocumentType.QUITCLAIM_DEED.value,
                DocumentType.WARRANTY_DEED.value,
                DocumentType.INTERSPOUSAL_TRANSFER.value
            ],
            fields=["recording.apn", "property.apn"],
            severity=Severity.MEDIUM,
            validation_logic="valid_apn_format",
            error_message="APN format appears invalid for California",
            remediation="Verify APN format with county assessor (typically XXX-XXX-XXX)"
        )
        
        return rules

    def _load_risk_factors(self) -> Dict[str, RiskFactor]:
        """Load title and transaction risk factors"""
        factors = {}
        
        # Chain of Title Risks
        factors["chain_gap"] = RiskFactor(
            id="chain_gap",
            name="Gap in Chain of Title",
            description="Missing or incomplete links in the ownership chain",
            category="title_risk",
            severity=Severity.HIGH,
            indicators=[
                "Grantor name doesn't match previous grantee",
                "Missing intermediate transfers",
                "Unexplained ownership changes",
                "Name variations without explanation"
            ],
            mitigation=[
                "Conduct extended title search",
                "Obtain missing documents",
                "Consider quiet title action",
                "Get title insurance with extended coverage"
            ],
            legal_basis="Civil Code §1095 - Grantor must own interest being conveyed"
        )
        
        factors["name_variations"] = RiskFactor(
            id="name_variations",
            name="Name Variations in Chain",
            description="Inconsistent spelling or variations in party names",
            category="title_risk",
            severity=Severity.MEDIUM,
            indicators=[
                "Different spellings of same name",
                "Missing middle initials",
                "Nickname vs. formal name usage",
                "Corporate name changes"
            ],
            mitigation=[
                "Obtain affidavits of identity",
                "Get name change documentation",
                "Verify with government records",
                "Use consistent naming throughout"
            ],
            legal_basis="Civil Code §1095 - Names must match title records"
        )
        
        factors["foreclosure_history"] = RiskFactor(
            id="foreclosure_history",
            name="Foreclosure or Trustee Sale History",
            description="Property has been subject to foreclosure proceedings",
            category="title_risk",
            severity=Severity.MEDIUM,
            indicators=[
                "Trustee's deed in chain",
                "Notice of default recorded",
                "Foreclosure sale documentation",
                "REO (bank-owned) transfers"
            ],
            mitigation=[
                "Review foreclosure procedures for compliance",
                "Verify proper notice requirements",
                "Check for redemption rights",
                "Obtain title insurance"
            ],
            legal_basis="Civil Code §2924 - Foreclosure procedures"
        )
        
        # Transaction Risks
        factors["incomplete_documentation"] = RiskFactor(
            id="incomplete_documentation",
            name="Incomplete Documentation",
            description="Missing required fields or supporting documents",
            category="transaction_risk",
            severity=Severity.HIGH,
            indicators=[
                "Empty required fields",
                "Missing signatures",
                "Incomplete legal description",
                "No notarization"
            ],
            mitigation=[
                "Complete all required fields",
                "Obtain missing signatures",
                "Get proper notarization",
                "Review document requirements"
            ],
            legal_basis="Civil Code §1091 - Essential elements required"
        )
        
        factors["tax_calculation_error"] = RiskFactor(
            id="tax_calculation_error",
            name="Transfer Tax Calculation Error",
            description="Incorrect calculation of documentary transfer tax",
            category="transaction_risk",
            severity=Severity.MEDIUM,
            indicators=[
                "Tax amount doesn't match consideration",
                "Wrong tax rate applied",
                "Exemption incorrectly claimed",
                "Missing tax declaration"
            ],
            mitigation=[
                "Verify tax calculation with county",
                "Use current tax rates",
                "Document exemption basis",
                "Consult tax professional"
            ],
            legal_basis="Revenue & Taxation Code §11911 - Tax calculation requirements"
        )
        
        return factors

    def _load_best_practices(self) -> Dict[str, BestPractice]:
        """Load legal best practices"""
        practices = {}
        
        practices["complete_legal_description"] = BestPractice(
            id="complete_legal_description",
            name="Use Complete Legal Description",
            description="Always use the complete legal description from the title report",
            document_types=[
                DocumentType.GRANT_DEED.value,
                DocumentType.QUITCLAIM_DEED.value,
                DocumentType.WARRANTY_DEED.value
            ],
            category="property_description",
            importance="critical",
            implementation=[
                "Obtain legal description from current title report",
                "Include all referenced maps and plats",
                "Verify accuracy with county records",
                "Avoid abbreviations or shortcuts"
            ]
        )
        
        practices["verify_grantor_names"] = BestPractice(
            id="verify_grantor_names",
            name="Verify Grantor Names Against Title",
            description="Ensure grantor names match exactly with current title records",
            document_types=[
                DocumentType.GRANT_DEED.value,
                DocumentType.QUITCLAIM_DEED.value,
                DocumentType.WARRANTY_DEED.value
            ],
            category="party_identification",
            importance="critical",
            implementation=[
                "Compare names with current deed or title report",
                "Include marital status and vesting information",
                "Obtain affidavits for any name variations",
                "Verify corporate authority for entity grantors"
            ]
        )
        
        practices["proper_vesting"] = BestPractice(
            id="proper_vesting",
            name="Include Proper Vesting Information",
            description="Specify how grantees will hold title to avoid future issues",
            document_types=[
                DocumentType.GRANT_DEED.value,
                DocumentType.QUITCLAIM_DEED.value,
                DocumentType.WARRANTY_DEED.value
            ],
            category="party_identification",
            importance="high",
            implementation=[
                "Specify joint tenants, tenants in common, or community property",
                "Include marital status for married grantees",
                "Consider tax implications of vesting choice",
                "Provide clear vesting language"
            ]
        )
        
        return practices

    def _load_document_requirements(self) -> Dict[str, Dict[str, Any]]:
        """Load comprehensive document requirements"""
        return {
            DocumentType.GRANT_DEED.value: {
                "required_fields": [
                    "parties.grantorsText",
                    "parties.granteesText",
                    "parties.legalDescription",
                    "parties.county",
                    "recording.requestedBy",
                    "recording.mailTo",
                    "tax.dttAmount"
                ],
                "optional_fields": [
                    "recording.apn",
                    "recording.escrowNo",
                    "recording.titleOrderNo"
                ],
                "legal_requirements": [
                    "Must be signed by grantor",
                    "Must be notarized",
                    "Must include transfer tax declaration",
                    "Must have complete return address"
                ],
                "estimated_time": "8-12 minutes",
                "complexity": "moderate"
            },
            DocumentType.QUITCLAIM_DEED.value: {
                "required_fields": [
                    "parties.grantorsText",
                    "parties.granteesText",
                    "parties.legalDescription",
                    "parties.county",
                    "recording.requestedBy",
                    "recording.mailTo"
                ],
                "optional_fields": [
                    "recording.apn",
                    "tax.exemptionReason"
                ],
                "legal_requirements": [
                    "Must be signed by grantor",
                    "Must be notarized",
                    "Should include risk disclosures"
                ],
                "estimated_time": "5-8 minutes",
                "complexity": "simple"
            },
            DocumentType.INTERSPOUSAL_TRANSFER.value: {
                "required_fields": [
                    "parties.grantorsText",
                    "parties.granteesText",
                    "parties.legalDescription",
                    "parties.county",
                    "tax.exemptionReason"
                ],
                "optional_fields": [
                    "recording.apn"
                ],
                "legal_requirements": [
                    "Must be between spouses",
                    "Must specify property characterization",
                    "Tax exemption typically applies"
                ],
                "estimated_time": "4-6 minutes",
                "complexity": "simple"
            }
        }

    def _load_field_definitions(self) -> Dict[str, Dict[str, Any]]:
        """Load field definitions and requirements"""
        return {
            "parties.grantorsText": {
                "name": "Grantor Names",
                "description": "Names of current property owners transferring the property",
                "format": "Full legal names with marital status or entity type",
                "example": "John Doe, a single man; Jane Smith, a married woman",
                "legal_requirement": "Must match current title records exactly",
                "validation": ["not_empty", "proper_format"]
            },
            "parties.granteesText": {
                "name": "Grantee Names",
                "description": "Names of new property owners receiving the property",
                "format": "Full legal names with vesting information",
                "example": "Robert Johnson and Mary Johnson, husband and wife as joint tenants",
                "legal_requirement": "Must specify how title will be held",
                "validation": ["not_empty", "includes_vesting"]
            },
            "parties.legalDescription": {
                "name": "Legal Description",
                "description": "Complete legal description of the property",
                "format": "Lot, block, tract information or metes and bounds",
                "example": "Lot 1 of Block 2 of Tract 12345, as per map recorded...",
                "legal_requirement": "Must describe property with reasonable certainty",
                "validation": ["not_empty", "sufficient_detail", "includes_county"]
            }
        }

    def _load_county_specific_rules(self) -> Dict[str, Dict[str, Any]]:
        """Load county-specific legal requirements"""
        return {
            "Los Angeles": {
                "transfer_tax_rate": 0.0011,
                "recording_fees": {
                    "first_page": 15.00,
                    "additional_pages": 3.00
                },
                "special_requirements": [
                    "APN required for all recordings",
                    "Margin requirements: 1 inch top, 0.5 inch sides"
                ],
                "contact_info": {
                    "recorder": "Los Angeles County Registrar-Recorder/County Clerk",
                    "phone": "(562) 462-2177"
                }
            },
            "Orange": {
                "transfer_tax_rate": 0.0011,
                "recording_fees": {
                    "first_page": 15.00,
                    "additional_pages": 3.00
                },
                "special_requirements": [
                    "APN strongly recommended",
                    "Electronic recording available"
                ],
                "contact_info": {
                    "recorder": "Orange County Clerk-Recorder",
                    "phone": "(714) 834-2500"
                }
            },
            "San Diego": {
                "transfer_tax_rate": 0.0011,
                "recording_fees": {
                    "first_page": 15.00,
                    "additional_pages": 3.00
                },
                "special_requirements": [
                    "Preliminary change of ownership report required",
                    "APN required for indexing"
                ],
                "contact_info": {
                    "recorder": "San Diego County Clerk",
                    "phone": "(619) 237-0502"
                }
            }
        }

    def _apply_validation_logic(self, rule: ValidationRule, field: str, value: Any) -> bool:
        """Apply validation logic to field value"""
        if rule.validation_logic == "not_empty":
            return value is not None and str(value).strip() != ""
        
        elif rule.validation_logic == "not_empty_and_sufficient_length":
            return (value is not None and 
                   str(value).strip() != "" and 
                   len(str(value).strip()) >= 20)
        
        elif rule.validation_logic == "has_tax_amount_or_exemption":
            # This would need access to the full document context
            return True  # Simplified for this example
        
        elif rule.validation_logic == "complete_recording_info":
            # This would need access to the full recording object
            return True  # Simplified for this example
        
        elif rule.validation_logic == "valid_apn_format":
            if not value:
                return True  # APN is optional in many cases
            apn_str = str(value).replace(" ", "").replace("-", "")
            return len(apn_str) >= 8 and apn_str.isdigit()
        
        return True

    def _calculate_relevance(self, query: str, text: str) -> float:
        """Calculate relevance score for search results"""
        query_words = query.lower().split()
        text_lower = text.lower()
        
        score = 0.0
        for word in query_words:
            if word in text_lower:
                score += 1.0
                # Bonus for exact phrase matches
                if query.lower() in text_lower:
                    score += 0.5
        
        return score / len(query_words) if query_words else 0.0

    def export_knowledge_base(self) -> Dict[str, Any]:
        """Export the entire knowledge base as JSON"""
        return {
            "california_codes": {k: asdict(v) for k, v in self.california_codes.items()},
            "validation_rules": {k: asdict(v) for k, v in self.validation_rules.items()},
            "risk_factors": {k: asdict(v) for k, v in self.risk_factors.items()},
            "best_practices": {k: asdict(v) for k, v in self.best_practices.items()},
            "document_requirements": self.document_requirements,
            "field_definitions": self.field_definitions,
            "county_specific_rules": self.county_specific_rules,
            "export_date": datetime.now().isoformat()
        }

    def get_statistics(self) -> Dict[str, int]:
        """Get knowledge base statistics"""
        return {
            "total_codes": len(self.california_codes),
            "total_validation_rules": len(self.validation_rules),
            "total_risk_factors": len(self.risk_factors),
            "total_best_practices": len(self.best_practices),
            "supported_document_types": len(self.document_requirements),
            "supported_counties": len(self.county_specific_rules)
        }

# Global knowledge base instance
legal_knowledge_base = LegalKnowledgeBase()


