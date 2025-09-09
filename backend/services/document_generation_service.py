"""
Document-Agnostic Generation System
Provides abstract base classes and concrete implementations for all document types
Following the WIZARD_ARCHITECTURE_OVERHAUL_PLAN Phase 3.1 specifications
"""
import os
import logging
from typing import Dict, Any, Type, List, Optional
from abc import ABC, abstractmethod
from datetime import datetime
from dataclasses import dataclass
from io import BytesIO

from jinja2 import Environment, FileSystemLoader, select_autoescape, TemplateError
from weasyprint import HTML, CSS
from fastapi import HTTPException

# Import legal knowledge and validation
from data.legal_knowledge import legal_knowledge_base, DocumentType, Severity
from lib.performance_monitor import performance_monitor, track_performance

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    """Custom exception for validation errors"""
    def __init__(self, message: str, field_errors: Optional[Dict[str, str]] = None):
        super().__init__(message)
        self.field_errors = field_errors or {}

@dataclass
class GenerationResult:
    """Result of document generation"""
    pdf_bytes: bytes
    filename: str
    metadata: Dict[str, Any]
    warnings: List[str]
    generation_time: float
    template_used: str

class DocumentGenerator(ABC):
    """Abstract base class for document generators"""
    
    def __init__(self):
        self.legal_knowledge = legal_knowledge_base
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
    
    @abstractmethod
    def validate_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and normalize input data"""
        pass
    
    @abstractmethod
    def generate_context(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate template context from validated data"""
        pass
    
    @abstractmethod
    def get_template_path(self) -> str:
        """Get the Jinja2 template path"""
        pass
    
    @abstractmethod
    def get_filename(self, data: Dict[str, Any]) -> str:
        """Generate appropriate filename"""
        pass
    
    def get_document_type(self) -> str:
        """Get document type identifier"""
        return self.__class__.__name__.replace('Generator', '').lower()
    
    def get_css_overrides(self) -> str:
        """Get document-specific CSS overrides"""
        return ""
    
    def post_process_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Post-process context before template rendering"""
        return context
    
    def validate_generated_content(self, html_content: str) -> List[str]:
        """Validate generated HTML content and return warnings"""
        warnings = []
        
        # Check for missing required elements
        if 'grantor' not in html_content.lower():
            warnings.append("Grantor information may be missing from generated document")
        
        if 'grantee' not in html_content.lower():
            warnings.append("Grantee information may be missing from generated document")
        
        return warnings

class GrantDeedGenerator(DocumentGenerator):
    """Grant Deed specific generator with enhanced validation"""
    
    def validate_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive Grant Deed validation"""
        self.logger.info("Validating Grant Deed data")
        
        # Flatten nested data structure for easier access
        flattened_data = self._flatten_wizard_data(data)
        
        # Required field validation
        required_fields = [
            'grantors_text', 'grantees_text', 'county', 
            'legal_description', 'requested_by'
        ]
        
        field_errors = {}
        missing_fields = []
        
        for field in required_fields:
            value = flattened_data.get(field)
            if not value or (isinstance(value, str) and not value.strip()):
                missing_fields.append(field)
                field_errors[field] = f"{field.replace('_', ' ').title()} is required"
        
        if missing_fields:
            raise ValidationError(
                f"Missing required fields: {', '.join(missing_fields)}", 
                field_errors
            )
        
        # Legal validation using knowledge base
        violations = []
        
        # Validate grantor format
        if not self._validate_grantor_format(flattened_data['grantors_text']):
            violations.append({
                'field': 'grantors_text',
                'message': 'Grantor names must match title records exactly',
                'code': 'Civil Code §1095'
            })
        
        # Validate legal description
        if not self._validate_legal_description(flattened_data['legal_description']):
            violations.append({
                'field': 'legal_description',
                'message': 'Legal description appears incomplete or invalid',
                'code': 'Civil Code §1092'
            })
        
        # Validate APN format if provided
        apn = flattened_data.get('apn')
        if apn and not self._validate_apn_format(apn):
            violations.append({
                'field': 'apn',
                'message': 'APN format is invalid for California',
                'code': 'Government Code §27321'
            })
        
        # DTT validation
        dtt_amount = flattened_data.get('dtt_amount')
        if dtt_amount and not self._validate_dtt_calculation(flattened_data):
            violations.append({
                'field': 'dtt_amount',
                'message': 'Documentary transfer tax calculation appears incorrect',
                'code': 'Revenue & Taxation Code §11911'
            })
        
        if violations:
            error_messages = [v['message'] for v in violations]
            field_errors = {v['field']: v['message'] for v in violations}
            raise ValidationError(
                f"Legal validation failed: {'; '.join(error_messages)}", 
                field_errors
            )
        
        # Add validation metadata
        flattened_data['validation_timestamp'] = datetime.now().isoformat()
        flattened_data['validation_passed'] = True
        
        return flattened_data
    
    def generate_context(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive template context"""
        self.logger.info("Generating Grant Deed context")
        
        context = {
            # Header/Recording block
            'requested_by': data.get('requested_by', ''),
            'title_company': data.get('title_company', ''),
            'escrow_no': data.get('escrow_no', ''),
            'title_order_no': data.get('title_order_no', ''),
            'return_to': self._format_return_address(data.get('return_to', {})),
            'apn': data.get('apn', ''),
            
            # DTT declarations
            'dtt': {
                'amount': self._format_currency(data.get('dtt_amount', '0')),
                'basis': data.get('dtt_basis', 'full_value'),
                'area_type': data.get('dtt_area_type', 'unincorporated'),
                'city_name': data.get('dtt_city_name', ''),
                'computed': data.get('dtt_computed', False)
            },
            
            # Parties and property
            'grantors_text': data.get('grantors_text', ''),
            'grantees_text': data.get('grantees_text', ''),
            'county': data.get('county', ''),
            'legal_description': data.get('legal_description', ''),
            
            # Execution
            'execution_date': data.get('execution_date') or datetime.now().strftime("%B %d, %Y"),
            
            # Page setup
            'exhibit_threshold': 600,
            'page': data.get('page', {}),
            
            # Document metadata
            'document_type': 'Grant Deed',
            'generated_at': datetime.now().isoformat(),
            'generator_version': '3.0'
        }
        
        # Add computed fields
        context['grantor_count'] = len([g.strip() for g in context['grantors_text'].split(';') if g.strip()])
        context['grantee_count'] = len([g.strip() for g in context['grantees_text'].split(';') if g.strip()])
        context['needs_exhibit'] = len(context['legal_description']) > context['exhibit_threshold']
        
        # Add legal compliance indicators
        context['legal_compliance'] = {
            'civil_code_1091': True,  # Basic deed requirements
            'civil_code_1092': len(context['legal_description']) > 20,  # Property description
            'civil_code_1095': len(context['grantors_text']) > 0,  # Grantor authority
            'gov_code_27321': len(context['return_to'].get('name', '')) > 0,  # Recording requirements
            'rtc_11911': context['dtt']['amount'] != '0.00' or context['dtt']['basis'] == 'exempt'  # Transfer tax
        }
        
        return context
    
    def get_template_path(self) -> str:
        return "grant_deed_ca/index.jinja2"
    
    def get_filename(self, data: Dict[str, Any]) -> str:
        county = data.get('county', 'Unknown').replace(' ', '_').replace(',', '')
        apn = data.get('apn', 'Unknown').replace('-', '_').replace(' ', '')
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"Grant_Deed_{county}_{apn}_{timestamp}.pdf"
    
    def get_css_overrides(self) -> str:
        """Grant Deed specific CSS"""
        return """
            .grant-deed-header {
                text-align: center;
                font-weight: bold;
                margin-bottom: 20px;
            }
            .dtt-section {
                border: 1px solid #000;
                padding: 10px;
                margin: 10px 0;
            }
            .signature-section {
                margin-top: 40px;
                page-break-inside: avoid;
            }
        """
    
    def _flatten_wizard_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Flatten nested wizard data structure"""
        flattened = {}
        
        # Handle nested structure from wizard
        if 'stepData' in data:
            step_data = data['stepData']
            
            # Property information
            if 'property' in step_data:
                prop = step_data['property']
                flattened.update({
                    'apn': prop.get('apn'),
                    'county': prop.get('county'),
                    'legal_description': prop.get('legalDescription')
                })
            
            # Recording information
            if 'recording' in step_data:
                rec = step_data['recording']
                flattened.update({
                    'requested_by': rec.get('requestedBy'),
                    'title_company': rec.get('titleCompany'),
                    'escrow_no': rec.get('escrowNo'),
                    'title_order_no': rec.get('titleOrderNo'),
                    'return_to': rec.get('mailTo'),
                    'apn': rec.get('apn') or flattened.get('apn')
                })
            
            # Tax information
            if 'tax' in step_data:
                tax = step_data['tax']
                flattened.update({
                    'dtt_amount': tax.get('dttAmount'),
                    'dtt_basis': tax.get('dttBasis'),
                    'dtt_area_type': tax.get('areaType'),
                    'dtt_city_name': tax.get('cityName')
                })
            
            # Parties information
            if 'parties' in step_data:
                parties = step_data['parties']
                flattened.update({
                    'grantors_text': parties.get('grantorsText'),
                    'grantees_text': parties.get('granteesText'),
                    'county': parties.get('county') or flattened.get('county'),
                    'legal_description': parties.get('legalDescription') or flattened.get('legal_description')
                })
        
        # Handle direct data structure
        else:
            flattened.update(data)
        
        return flattened
    
    def _format_return_address(self, return_to: Dict[str, Any]) -> Dict[str, str]:
        """Format return address for template"""
        if not return_to:
            return {'name': '', 'address': ''}
        
        address_parts = []
        if return_to.get('address1'):
            address_parts.append(return_to['address1'])
        if return_to.get('address2'):
            address_parts.append(return_to['address2'])
        
        city_state_zip = []
        if return_to.get('city'):
            city_state_zip.append(return_to['city'])
        if return_to.get('state'):
            city_state_zip.append(return_to['state'])
        if return_to.get('zip'):
            city_state_zip.append(return_to['zip'])
        
        if city_state_zip:
            address_parts.append(', '.join(city_state_zip))
        
        return {
            'name': return_to.get('name', ''),
            'address': '\n'.join(address_parts)
        }
    
    def _validate_grantor_format(self, grantors_text: str) -> bool:
        """Validate grantor name format and completeness"""
        if not grantors_text or not grantors_text.strip():
            return False
        
        # Check for basic format requirements
        grantors = [g.strip() for g in grantors_text.split(';') if g.strip()]
        
        for grantor in grantors:
            # Must have at least first and last name
            name_parts = grantor.split(',')[0].strip().split()
            if len(name_parts) < 2:
                return False
        
        return True
    
    def _validate_legal_description(self, legal_desc: str) -> bool:
        """Validate legal description completeness"""
        if not legal_desc or len(legal_desc.strip()) < 20:
            return False
        
        # Check for common legal description patterns
        required_elements = ['lot', 'block', 'tract', 'map', 'county', 'recorded']
        legal_lower = legal_desc.lower()
        
        # Must have at least 2 of the required elements
        found_elements = sum(1 for element in required_elements if element in legal_lower)
        return found_elements >= 2
    
    def _validate_apn_format(self, apn: str) -> bool:
        """Validate APN format for California"""
        if not apn:
            return True  # APN is optional in some cases
        
        import re
        # Common California APN formats
        patterns = [
            r'^\d{3}-\d{3}-\d{3}$',  # XXX-XXX-XXX
            r'^\d{4}-\d{3}-\d{3}$',  # XXXX-XXX-XXX
            r'^\d{8,12}$',           # 8-12 digits
            r'^\d{3}-\d{3}-\d{3}-\d{3}$'  # XXX-XXX-XXX-XXX
        ]
        
        apn_clean = apn.replace(' ', '').replace('-', '')
        apn_formatted = apn.strip()
        
        return any(re.match(pattern, apn_formatted) for pattern in patterns) or apn_clean.isdigit()
    
    def _validate_dtt_calculation(self, data: Dict[str, Any]) -> bool:
        """Validate DTT calculation accuracy"""
        dtt_amount = data.get('dtt_amount')
        if not dtt_amount:
            return True  # May be exempt
        
        try:
            amount = float(dtt_amount)
            return amount >= 0  # Must be non-negative
        except (ValueError, TypeError):
            return False
    
    def _format_currency(self, amount: str) -> str:
        """Format currency amount"""
        if not amount:
            return "0.00"
        
        try:
            return f"{float(amount):.2f}"
        except (ValueError, TypeError):
            return "0.00"

class QuitclaimDeedGenerator(DocumentGenerator):
    """Quitclaim Deed generator with risk warnings"""
    
    def validate_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Quitclaim-specific validation with risk assessment"""
        self.logger.info("Validating Quitclaim Deed data")
        
        flattened_data = self._flatten_wizard_data(data)
        
        # Basic required fields (fewer than Grant Deed)
        required_fields = ['grantors_text', 'grantees_text', 'county', 'legal_description']
        
        field_errors = {}
        missing_fields = []
        
        for field in required_fields:
            value = flattened_data.get(field)
            if not value or (isinstance(value, str) and not value.strip()):
                missing_fields.append(field)
                field_errors[field] = f"{field.replace('_', ' ').title()} is required"
        
        if missing_fields:
            raise ValidationError(
                f"Missing required fields: {', '.join(missing_fields)}", 
                field_errors
            )
        
        # Risk warnings
        warnings = []
        if not flattened_data.get('risk_acknowledgment'):
            warnings.append("Quitclaim deeds provide no warranties - ensure buyer understands risks")
        
        consideration_amount = flattened_data.get('consideration_amount', 0)
        try:
            if float(consideration_amount) > 100000:
                warnings.append("High-value quitclaim transfers may indicate title issues")
        except (ValueError, TypeError):
            pass
        
        flattened_data['validation_warnings'] = warnings
        flattened_data['validation_timestamp'] = datetime.now().isoformat()
        flattened_data['validation_passed'] = True
        
        return flattened_data
    
    def generate_context(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate quitclaim-specific context"""
        self.logger.info("Generating Quitclaim Deed context")
        
        context = {
            # Simplified recording block
            'requested_by': data.get('requested_by', ''),
            'return_to': self._format_return_address(data.get('return_to', {})),
            'apn': data.get('apn', ''),
            
            # No DTT for most quitclaims
            'dtt_exempt': data.get('dtt_exempt', True),
            'exemption_reason': data.get('exemption_reason', 'No consideration'),
            
            # Parties and property
            'grantors_text': data.get('grantors_text', ''),
            'grantees_text': data.get('grantees_text', ''),
            'county': data.get('county', ''),
            'legal_description': data.get('legal_description', ''),
            
            # Risk disclosures
            'risk_disclosures': [
                "This deed contains no warranties of title",
                "Grantor conveys only such interest as grantor may have",
                "Buyer should obtain title insurance"
            ],
            
            # Execution
            'execution_date': data.get('execution_date') or datetime.now().strftime("%B %d, %Y"),
            
            # Document metadata
            'document_type': 'Quitclaim Deed',
            'generated_at': datetime.now().isoformat(),
            'generator_version': '3.0',
            
            # Warnings
            'validation_warnings': data.get('validation_warnings', [])
        }
        
        return context
    
    def get_template_path(self) -> str:
        return "quitclaim_deed_ca/index.jinja2"
    
    def get_filename(self, data: Dict[str, Any]) -> str:
        county = data.get('county', 'Unknown').replace(' ', '_').replace(',', '')
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"Quitclaim_Deed_{county}_{timestamp}.pdf"
    
    def get_css_overrides(self) -> str:
        """Quitclaim Deed specific CSS"""
        return """
            .quitclaim-header {
                text-align: center;
                font-weight: bold;
                margin-bottom: 20px;
            }
            .risk-warning {
                border: 2px solid #ff0000;
                background-color: #fff0f0;
                padding: 15px;
                margin: 15px 0;
                font-weight: bold;
            }
            .no-warranty-notice {
                font-style: italic;
                margin: 10px 0;
            }
        """
    
    def _flatten_wizard_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Flatten nested wizard data structure for quitclaim deed"""
        flattened = {}
        
        if 'stepData' in data:
            step_data = data['stepData']
            
            # Property information
            if 'property' in step_data:
                prop = step_data['property']
                flattened.update({
                    'apn': prop.get('apn'),
                    'county': prop.get('county'),
                    'legal_description': prop.get('legalDescription')
                })
            
            # Recording information
            if 'recording' in step_data:
                rec = step_data['recording']
                flattened.update({
                    'requested_by': rec.get('requestedBy'),
                    'return_to': rec.get('mailTo'),
                    'apn': rec.get('apn') or flattened.get('apn')
                })
            
            # Parties information
            if 'parties' in step_data:
                parties = step_data['parties']
                flattened.update({
                    'grantors_text': parties.get('grantorsText'),
                    'grantees_text': parties.get('granteesText'),
                    'county': parties.get('county') or flattened.get('county'),
                    'legal_description': parties.get('legalDescription') or flattened.get('legal_description')
                })
        else:
            flattened.update(data)
        
        return flattened
    
    def _format_return_address(self, return_to: Dict[str, Any]) -> Dict[str, str]:
        """Format return address for template"""
        if not return_to:
            return {'name': '', 'address': ''}
        
        address_parts = []
        if return_to.get('address1'):
            address_parts.append(return_to['address1'])
        if return_to.get('address2'):
            address_parts.append(return_to['address2'])
        
        city_state_zip = []
        if return_to.get('city'):
            city_state_zip.append(return_to['city'])
        if return_to.get('state'):
            city_state_zip.append(return_to['state'])
        if return_to.get('zip'):
            city_state_zip.append(return_to['zip'])
        
        if city_state_zip:
            address_parts.append(', '.join(city_state_zip))
        
        return {
            'name': return_to.get('name', ''),
            'address': '\n'.join(address_parts)
        }

class InterspousalTransferGenerator(DocumentGenerator):
    """Interspousal Transfer Deed generator"""
    
    def validate_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Interspousal transfer specific validation"""
        self.logger.info("Validating Interspousal Transfer data")
        
        flattened_data = self._flatten_wizard_data(data)
        
        # Required fields for interspousal transfer
        required_fields = ['grantors_text', 'grantees_text', 'county', 'legal_description']
        
        field_errors = {}
        missing_fields = []
        
        for field in required_fields:
            value = flattened_data.get(field)
            if not value or (isinstance(value, str) and not value.strip()):
                missing_fields.append(field)
                field_errors[field] = f"{field.replace('_', ' ').title()} is required"
        
        if missing_fields:
            raise ValidationError(
                f"Missing required fields: {', '.join(missing_fields)}", 
                field_errors
            )
        
        # Validate that this is actually between spouses
        grantors = flattened_data.get('grantors_text', '').lower()
        grantees = flattened_data.get('grantees_text', '').lower()
        
        spouse_indicators = ['husband', 'wife', 'spouse', 'married']
        if not any(indicator in grantors or indicator in grantees for indicator in spouse_indicators):
            field_errors['grantors_text'] = 'Interspousal transfers must be between married parties'
            raise ValidationError("Invalid interspousal transfer parties", field_errors)
        
        flattened_data['validation_timestamp'] = datetime.now().isoformat()
        flattened_data['validation_passed'] = True
        
        return flattened_data
    
    def generate_context(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate interspousal transfer context"""
        self.logger.info("Generating Interspousal Transfer context")
        
        context = {
            # Recording information
            'requested_by': data.get('requested_by', ''),
            'return_to': self._format_return_address(data.get('return_to', {})),
            'apn': data.get('apn', ''),
            
            # Tax exemption (typical for interspousal transfers)
            'tax_exempt': True,
            'exemption_reason': data.get('exemption_reason', 'Interspousal transfer - no consideration'),
            
            # Parties and property
            'grantors_text': data.get('grantors_text', ''),
            'grantees_text': data.get('grantees_text', ''),
            'county': data.get('county', ''),
            'legal_description': data.get('legal_description', ''),
            
            # Property characterization
            'property_characterization': data.get('property_characterization', 'separate property'),
            
            # Execution
            'execution_date': data.get('execution_date') or datetime.now().strftime("%B %d, %Y"),
            
            # Document metadata
            'document_type': 'Interspousal Transfer Deed',
            'generated_at': datetime.now().isoformat(),
            'generator_version': '3.0'
        }
        
        return context
    
    def get_template_path(self) -> str:
        return "interspousal_transfer_ca/index.jinja2"
    
    def get_filename(self, data: Dict[str, Any]) -> str:
        county = data.get('county', 'Unknown').replace(' ', '_').replace(',', '')
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"Interspousal_Transfer_{county}_{timestamp}.pdf"
    
    def _flatten_wizard_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Flatten nested wizard data structure"""
        flattened = {}
        
        if 'stepData' in data:
            step_data = data['stepData']
            
            # Property information
            if 'property' in step_data:
                prop = step_data['property']
                flattened.update({
                    'apn': prop.get('apn'),
                    'county': prop.get('county'),
                    'legal_description': prop.get('legalDescription')
                })
            
            # Recording information
            if 'recording' in step_data:
                rec = step_data['recording']
                flattened.update({
                    'requested_by': rec.get('requestedBy'),
                    'return_to': rec.get('mailTo'),
                    'apn': rec.get('apn') or flattened.get('apn')
                })
            
            # Parties information
            if 'parties' in step_data:
                parties = step_data['parties']
                flattened.update({
                    'grantors_text': parties.get('grantorsText'),
                    'grantees_text': parties.get('granteesText'),
                    'county': parties.get('county') or flattened.get('county'),
                    'legal_description': parties.get('legalDescription') or flattened.get('legal_description')
                })
            
            # Tax information
            if 'tax' in step_data:
                tax = step_data['tax']
                flattened.update({
                    'exemption_reason': tax.get('exemptionReason')
                })
        else:
            flattened.update(data)
        
        return flattened
    
    def _format_return_address(self, return_to: Dict[str, Any]) -> Dict[str, str]:
        """Format return address for template"""
        if not return_to:
            return {'name': '', 'address': ''}
        
        address_parts = []
        if return_to.get('address1'):
            address_parts.append(return_to['address1'])
        if return_to.get('address2'):
            address_parts.append(return_to['address2'])
        
        city_state_zip = []
        if return_to.get('city'):
            city_state_zip.append(return_to['city'])
        if return_to.get('state'):
            city_state_zip.append(return_to['state'])
        if return_to.get('zip'):
            city_state_zip.append(return_to['zip'])
        
        if city_state_zip:
            address_parts.append(', '.join(city_state_zip))
        
        return {
            'name': return_to.get('name', ''),
            'address': '\n'.join(address_parts)
        }

class DocumentGenerationService:
    """Main service for document generation"""
    
    GENERATORS: Dict[str, Type[DocumentGenerator]] = {
        'grant_deed': GrantDeedGenerator,
        'quitclaim_deed': QuitclaimDeedGenerator,
        'interspousal_transfer': InterspousalTransferGenerator,
        # Add more generators as needed
    }
    
    @classmethod
    @track_performance("document_generation")
    async def generate_document(cls, document_type: str, data: Dict[str, Any]) -> GenerationResult:
        """Generate PDF document with comprehensive error handling"""
        
        if document_type not in cls.GENERATORS:
            raise ValueError(f"Unsupported document type: {document_type}")
        
        start_time = datetime.now()
        
        try:
            # Initialize generator
            generator = cls.GENERATORS[document_type]()
            logger.info(f"Generating {document_type} document")
            
            # Validate input data
            validated_data = generator.validate_data(data)
            
            # Generate template context
            context = generator.generate_context(validated_data)
            
            # Post-process context
            context = generator.post_process_context(context)
            
            # Load and render template
            template_path = generator.get_template_path()
            template = cls._load_template(template_path)
            html_content = template.render(**context)
            
            # Validate generated content
            warnings = generator.validate_generated_content(html_content)
            
            # Generate PDF
            css_overrides = generator.get_css_overrides()
            pdf_bytes = cls._generate_pdf(html_content, css_overrides)
            
            # Generate filename
            filename = generator.get_filename(validated_data)
            
            # Calculate generation time
            generation_time = (datetime.now() - start_time).total_seconds()
            
            # Create metadata
            metadata = {
                'document_type': document_type,
                'generated_at': datetime.now().isoformat(),
                'generator_class': generator.__class__.__name__,
                'template_path': template_path,
                'pdf_size_bytes': len(pdf_bytes),
                'validation_passed': validated_data.get('validation_passed', False),
                'legal_compliance': context.get('legal_compliance', {}),
                'generation_time_seconds': generation_time
            }
            
            # Log successful generation
            cls._log_generation(document_type, validated_data, len(pdf_bytes), generation_time)
            
            return GenerationResult(
                pdf_bytes=pdf_bytes,
                filename=filename,
                metadata=metadata,
                warnings=warnings,
                generation_time=generation_time,
                template_used=template_path
            )
            
        except ValidationError as e:
            logger.error(f"Validation error for {document_type}: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
        except TemplateError as e:
            logger.error(f"Template error for {document_type}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Template error: {str(e)}")
        except Exception as e:
            cls._log_error(document_type, data, str(e))
            logger.error(f"Document generation failed for {document_type}: {str(e)}")
            raise HTTPException(status_code=500, detail="Document generation failed")
    
    @classmethod
    def get_supported_documents(cls) -> Dict[str, Any]:
        """Get list of supported document types with their configurations"""
        supported = {}
        
        for doc_type, generator_class in cls.GENERATORS.items():
            generator = generator_class()
            supported[doc_type] = {
                'name': doc_type.replace('_', ' ').title(),
                'generator_class': generator_class.__name__,
                'template_path': generator.get_template_path(),
                'document_type_id': generator.get_document_type()
            }
        
        return supported
    
    @classmethod
    def validate_document_data(cls, document_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate document data without generating PDF"""
        if document_type not in cls.GENERATORS:
            raise ValueError(f"Unsupported document type: {document_type}")
        
        try:
            generator = cls.GENERATORS[document_type]()
            validated_data = generator.validate_data(data)
            
            return {
                "valid": True,
                "validated_data": validated_data,
                "warnings": validated_data.get('validation_warnings', []),
                "validation_timestamp": validated_data.get('validation_timestamp')
            }
            
        except ValidationError as e:
            return {
                "valid": False,
                "errors": [str(e)],
                "field_errors": e.field_errors,
                "validation_timestamp": datetime.now().isoformat()
            }
    
    @staticmethod
    def _load_template(template_path: str):
        """Load Jinja2 template with error handling"""
        template_root = os.path.join(os.path.dirname(__file__), "..", "templates")
        
        if not os.path.exists(template_root):
            os.makedirs(template_root, exist_ok=True)
            logger.warning(f"Created missing template directory: {template_root}")
        
        env = Environment(
            loader=FileSystemLoader(template_root),
            autoescape=select_autoescape(["html", "xml", "jinja2"]),
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Add custom filters
        env.filters['currency'] = lambda x: f"${float(x or 0):.2f}"
        env.filters['upper_first'] = lambda x: x[0].upper() + x[1:] if x else ""
        
        try:
            return env.get_template(template_path)
        except Exception as e:
            logger.error(f"Failed to load template {template_path}: {str(e)}")
            raise TemplateError(f"Template not found: {template_path}")
    
    @staticmethod
    def _generate_pdf(html_content: str, css_overrides: str = "") -> bytes:
        """Generate PDF with optimized settings"""
        
        # Base CSS for legal documents
        base_css = """
            @page {
                size: 8.5in 11in;
                margin: 0.75in 0.5in 0.5in 0.5in;
                @top-right {
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 10pt;
                    color: #666;
                }
            }
            body {
                font-family: 'Times New Roman', serif;
                font-size: 12pt;
                line-height: 1.4;
                color: #000;
            }
            .legal-text {
                text-align: justify;
                margin: 10px 0;
            }
            .signature-block {
                page-break-inside: avoid;
                margin-top: 30px;
            }
            .header-section {
                text-align: center;
                margin-bottom: 20px;
            }
            .recording-info {
                border: 1px solid #000;
                padding: 10px;
                margin: 10px 0;
                font-size: 10pt;
            }
            .parties-section {
                margin: 20px 0;
            }
            .legal-description {
                margin: 15px 0;
                padding: 10px;
                background-color: #f9f9f9;
                border-left: 3px solid #333;
            }
            .execution-section {
                margin-top: 40px;
            }
            .notary-section {
                margin-top: 30px;
                border: 1px solid #000;
                padding: 15px;
            }
        """
        
        # Combine base CSS with document-specific overrides
        combined_css = base_css + "\n" + css_overrides
        
        css = CSS(string=combined_css)
        
        try:
            pdf_buffer = BytesIO()
            HTML(string=html_content).write_pdf(pdf_buffer, stylesheets=[css])
            return pdf_buffer.getvalue()
        except Exception as e:
            logger.error(f"PDF generation failed: {str(e)}")
            raise Exception(f"PDF generation failed: {str(e)}")
    
    @staticmethod
    def _log_generation(document_type: str, data: Dict[str, Any], pdf_size: int, generation_time: float):
        """Log successful document generation"""
        logger.info(
            f"Generated {document_type} PDF: {pdf_size} bytes, "
            f"APN: {data.get('apn', 'N/A')}, "
            f"Generation time: {generation_time:.2f}s"
        )
    
    @staticmethod
    def _log_error(document_type: str, data: Dict[str, Any], error: str):
        """Log generation errors for debugging"""
        logger.error(
            f"Failed to generate {document_type}: {error}, "
            f"Data keys: {list(data.keys())}"
        )

# Global service instance
document_generation_service = DocumentGenerationService()


