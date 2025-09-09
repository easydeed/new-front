"""
Comprehensive Validation Framework for Document Generation
Provides multi-layer validation with legal compliance, business rules, and data integrity
Following the WIZARD_ARCHITECTURE_OVERHAUL_PLAN Phase 3.4 specifications
"""
import re
import logging
from typing import Dict, List, Any, Optional, Callable, Union
from datetime import datetime, date
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod

from data.legal_knowledge import legal_knowledge_base, DocumentType, Severity

logger = logging.getLogger(__name__)

class ValidationType(Enum):
    """Types of validation"""
    REQUIRED = "required"
    FORMAT = "format"
    LEGAL = "legal"
    BUSINESS = "business"
    CROSS_FIELD = "cross_field"
    CONDITIONAL = "conditional"
    CUSTOM = "custom"

class ValidationSeverity(Enum):
    """Validation severity levels"""
    ERROR = "error"          # Blocks document generation
    WARNING = "warning"      # Allows generation with warnings
    INFO = "info"           # Informational only
    SUGGESTION = "suggestion" # AI-powered suggestions

@dataclass
class ValidationResult:
    """Result of a single validation check"""
    field_path: str
    validation_type: ValidationType
    severity: ValidationSeverity
    passed: bool
    message: str
    code_reference: Optional[str] = None
    suggested_value: Optional[str] = None
    confidence: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ValidationSummary:
    """Summary of all validation results"""
    total_checks: int
    passed_checks: int
    failed_checks: int
    errors: List[ValidationResult]
    warnings: List[ValidationResult]
    suggestions: List[ValidationResult]
    overall_score: float
    can_generate: bool
    validation_timestamp: str

class ValidationRule(ABC):
    """Abstract base class for validation rules"""
    
    def __init__(self, field_path: str, validation_type: ValidationType, 
                 severity: ValidationSeverity, message: str, 
                 code_reference: Optional[str] = None):
        self.field_path = field_path
        self.validation_type = validation_type
        self.severity = severity
        self.message = message
        self.code_reference = code_reference
    
    @abstractmethod
    def validate(self, data: Dict[str, Any], context: Dict[str, Any] = None) -> ValidationResult:
        """Perform validation and return result"""
        pass
    
    def get_field_value(self, data: Dict[str, Any], field_path: str) -> Any:
        """Get field value from nested data structure"""
        try:
            value = data
            for part in field_path.split('.'):
                if isinstance(value, dict) and part in value:
                    value = value[part]
                else:
                    return None
            return value
        except (KeyError, TypeError, AttributeError):
            return None

class RequiredFieldRule(ValidationRule):
    """Validates that required fields are present and not empty"""
    
    def __init__(self, field_path: str, message: str = None, 
                 code_reference: str = None):
        default_message = f"{field_path.replace('_', ' ').replace('.', ' ').title()} is required"
        super().__init__(
            field_path=field_path,
            validation_type=ValidationType.REQUIRED,
            severity=ValidationSeverity.ERROR,
            message=message or default_message,
            code_reference=code_reference
        )
    
    def validate(self, data: Dict[str, Any], context: Dict[str, Any] = None) -> ValidationResult:
        value = self.get_field_value(data, self.field_path)
        
        is_valid = (
            value is not None and 
            value != "" and 
            (not isinstance(value, str) or value.strip() != "")
        )
        
        return ValidationResult(
            field_path=self.field_path,
            validation_type=self.validation_type,
            severity=self.severity,
            passed=is_valid,
            message=self.message,
            code_reference=self.code_reference
        )

class FormatValidationRule(ValidationRule):
    """Validates field format using regex patterns"""
    
    def __init__(self, field_path: str, pattern: str, message: str,
                 code_reference: str = None, flags: int = 0):
        super().__init__(
            field_path=field_path,
            validation_type=ValidationType.FORMAT,
            severity=ValidationSeverity.ERROR,
            message=message,
            code_reference=code_reference
        )
        self.pattern = re.compile(pattern, flags)
    
    def validate(self, data: Dict[str, Any], context: Dict[str, Any] = None) -> ValidationResult:
        value = self.get_field_value(data, self.field_path)
        
        if value is None or value == "":
            # Format validation only applies to non-empty values
            return ValidationResult(
                field_path=self.field_path,
                validation_type=self.validation_type,
                severity=ValidationSeverity.INFO,
                passed=True,
                message="Field is empty - format validation skipped"
            )
        
        is_valid = bool(self.pattern.match(str(value)))
        
        return ValidationResult(
            field_path=self.field_path,
            validation_type=self.validation_type,
            severity=self.severity,
            passed=is_valid,
            message=self.message,
            code_reference=self.code_reference,
            metadata={"pattern": self.pattern.pattern, "value": str(value)}
        )

class LegalComplianceRule(ValidationRule):
    """Validates legal compliance using knowledge base"""
    
    def __init__(self, field_path: str, document_type: str, 
                 legal_requirement: str, message: str,
                 code_reference: str = None):
        super().__init__(
            field_path=field_path,
            validation_type=ValidationType.LEGAL,
            severity=ValidationSeverity.ERROR,
            message=message,
            code_reference=code_reference
        )
        self.document_type = document_type
        self.legal_requirement = legal_requirement
    
    def validate(self, data: Dict[str, Any], context: Dict[str, Any] = None) -> ValidationResult:
        value = self.get_field_value(data, self.field_path)
        
        # Use legal knowledge base for validation
        violations = legal_knowledge_base.validate_field_value(
            self.document_type, 
            self.field_path, 
            value
        )
        
        is_valid = len(violations) == 0
        
        # Combine violation messages if any
        if violations:
            violation_messages = [v['message'] for v in violations]
            combined_message = f"{self.message}: {'; '.join(violation_messages)}"
        else:
            combined_message = self.message
        
        return ValidationResult(
            field_path=self.field_path,
            validation_type=self.validation_type,
            severity=self.severity,
            passed=is_valid,
            message=combined_message,
            code_reference=self.code_reference,
            metadata={"violations": violations, "legal_requirement": self.legal_requirement}
        )

class BusinessRuleValidation(ValidationRule):
    """Validates business logic rules"""
    
    def __init__(self, field_path: str, rule_function: Callable, 
                 message: str, severity: ValidationSeverity = ValidationSeverity.WARNING):
        super().__init__(
            field_path=field_path,
            validation_type=ValidationType.BUSINESS,
            severity=severity,
            message=message
        )
        self.rule_function = rule_function
    
    def validate(self, data: Dict[str, Any], context: Dict[str, Any] = None) -> ValidationResult:
        try:
            is_valid = self.rule_function(data, context or {})
            
            return ValidationResult(
                field_path=self.field_path,
                validation_type=self.validation_type,
                severity=self.severity,
                passed=is_valid,
                message=self.message
            )
        except Exception as e:
            logger.error(f"Business rule validation failed: {str(e)}")
            return ValidationResult(
                field_path=self.field_path,
                validation_type=self.validation_type,
                severity=ValidationSeverity.ERROR,
                passed=False,
                message=f"Business rule validation error: {str(e)}"
            )

class CrossFieldValidationRule(ValidationRule):
    """Validates relationships between multiple fields"""
    
    def __init__(self, primary_field: str, related_fields: List[str],
                 validation_function: Callable, message: str,
                 severity: ValidationSeverity = ValidationSeverity.ERROR):
        super().__init__(
            field_path=primary_field,
            validation_type=ValidationType.CROSS_FIELD,
            severity=severity,
            message=message
        )
        self.related_fields = related_fields
        self.validation_function = validation_function
    
    def validate(self, data: Dict[str, Any], context: Dict[str, Any] = None) -> ValidationResult:
        try:
            # Get all field values
            field_values = {}
            field_values[self.field_path] = self.get_field_value(data, self.field_path)
            
            for field in self.related_fields:
                field_values[field] = self.get_field_value(data, field)
            
            is_valid = self.validation_function(field_values, data, context or {})
            
            return ValidationResult(
                field_path=self.field_path,
                validation_type=self.validation_type,
                severity=self.severity,
                passed=is_valid,
                message=self.message,
                metadata={"related_fields": self.related_fields, "field_values": field_values}
            )
        except Exception as e:
            logger.error(f"Cross-field validation failed: {str(e)}")
            return ValidationResult(
                field_path=self.field_path,
                validation_type=self.validation_type,
                severity=ValidationSeverity.ERROR,
                passed=False,
                message=f"Cross-field validation error: {str(e)}"
            )

class ConditionalValidationRule(ValidationRule):
    """Validates fields conditionally based on other field values"""
    
    def __init__(self, field_path: str, condition_function: Callable,
                 validation_rule: ValidationRule, message: str = None):
        super().__init__(
            field_path=field_path,
            validation_type=ValidationType.CONDITIONAL,
            severity=validation_rule.severity,
            message=message or f"Conditional validation for {field_path}"
        )
        self.condition_function = condition_function
        self.validation_rule = validation_rule
    
    def validate(self, data: Dict[str, Any], context: Dict[str, Any] = None) -> ValidationResult:
        try:
            # Check if condition is met
            should_validate = self.condition_function(data, context or {})
            
            if not should_validate:
                return ValidationResult(
                    field_path=self.field_path,
                    validation_type=self.validation_type,
                    severity=ValidationSeverity.INFO,
                    passed=True,
                    message="Conditional validation skipped - condition not met"
                )
            
            # Perform the actual validation
            return self.validation_rule.validate(data, context)
            
        except Exception as e:
            logger.error(f"Conditional validation failed: {str(e)}")
            return ValidationResult(
                field_path=self.field_path,
                validation_type=self.validation_type,
                severity=ValidationSeverity.ERROR,
                passed=False,
                message=f"Conditional validation error: {str(e)}"
            )

class DocumentValidationFramework:
    """Comprehensive validation framework for document generation"""
    
    def __init__(self):
        self.rules: Dict[str, List[ValidationRule]] = {}
        self.global_rules: List[ValidationRule] = []
        self._initialize_standard_rules()
    
    def add_rule(self, document_type: str, rule: ValidationRule):
        """Add a validation rule for a specific document type"""
        if document_type not in self.rules:
            self.rules[document_type] = []
        self.rules[document_type].append(rule)
    
    def add_global_rule(self, rule: ValidationRule):
        """Add a global validation rule that applies to all document types"""
        self.global_rules.append(rule)
    
    def validate_document(self, document_type: str, data: Dict[str, Any], 
                         context: Dict[str, Any] = None) -> ValidationSummary:
        """Perform comprehensive validation of document data"""
        logger.info(f"Validating {document_type} document")
        
        context = context or {}
        context['document_type'] = document_type
        context['validation_timestamp'] = datetime.now().isoformat()
        
        # Get all applicable rules
        applicable_rules = self.global_rules.copy()
        if document_type in self.rules:
            applicable_rules.extend(self.rules[document_type])
        
        # Run all validations
        results = []
        for rule in applicable_rules:
            try:
                result = rule.validate(data, context)
                results.append(result)
            except Exception as e:
                logger.error(f"Validation rule failed: {str(e)}")
                results.append(ValidationResult(
                    field_path=rule.field_path,
                    validation_type=rule.validation_type,
                    severity=ValidationSeverity.ERROR,
                    passed=False,
                    message=f"Validation rule error: {str(e)}"
                ))
        
        # Categorize results
        errors = [r for r in results if not r.passed and r.severity == ValidationSeverity.ERROR]
        warnings = [r for r in results if not r.passed and r.severity == ValidationSeverity.WARNING]
        suggestions = [r for r in results if r.severity == ValidationSeverity.SUGGESTION]
        
        # Calculate overall score
        total_checks = len(results)
        passed_checks = len([r for r in results if r.passed])
        overall_score = (passed_checks / total_checks * 100) if total_checks > 0 else 0
        
        # Determine if document can be generated
        can_generate = len(errors) == 0
        
        return ValidationSummary(
            total_checks=total_checks,
            passed_checks=passed_checks,
            failed_checks=total_checks - passed_checks,
            errors=errors,
            warnings=warnings,
            suggestions=suggestions,
            overall_score=overall_score,
            can_generate=can_generate,
            validation_timestamp=datetime.now().isoformat()
        )
    
    def _initialize_standard_rules(self):
        """Initialize standard validation rules for all document types"""
        
        # Grant Deed Rules
        self._initialize_grant_deed_rules()
        
        # Quitclaim Deed Rules
        self._initialize_quitclaim_deed_rules()
        
        # Interspousal Transfer Rules
        self._initialize_interspousal_transfer_rules()
        
        # Global Rules
        self._initialize_global_rules()
    
    def _initialize_grant_deed_rules(self):
        """Initialize Grant Deed specific validation rules"""
        doc_type = "grant_deed"
        
        # Required fields
        required_fields = [
            ("grantors_text", "Civil Code §1091"),
            ("grantees_text", "Civil Code §1091"),
            ("county", "Civil Code §1092"),
            ("legal_description", "Civil Code §1092"),
            ("requested_by", "Government Code §27321")
        ]
        
        for field, code in required_fields:
            self.add_rule(doc_type, RequiredFieldRule(
                field_path=field,
                message=f"{field.replace('_', ' ').title()} is required for Grant Deeds",
                code_reference=code
            ))
        
        # Format validations
        self.add_rule(doc_type, FormatValidationRule(
            field_path="apn",
            pattern=r"^\d{3,4}-\d{3}-\d{3}(-\d{3})?$|^\d{8,12}$",
            message="APN format is invalid for California",
            code_reference="Government Code §27321"
        ))
        
        # Legal compliance rules
        self.add_rule(doc_type, LegalComplianceRule(
            field_path="grantors_text",
            document_type=doc_type,
            legal_requirement="Grantor names must match title records",
            message="Grantor names may not match title records",
            code_reference="Civil Code §1095"
        ))
        
        # Business rules
        self.add_rule(doc_type, BusinessRuleValidation(
            field_path="dtt_amount",
            rule_function=self._validate_dtt_calculation,
            message="Documentary transfer tax calculation may be incorrect",
            severity=ValidationSeverity.WARNING
        ))
        
        # Cross-field validation
        self.add_rule(doc_type, CrossFieldValidationRule(
            primary_field="grantees_text",
            related_fields=["grantors_text"],
            validation_function=self._validate_different_parties,
            message="Grantors and grantees should not be identical"
        ))
    
    def _initialize_quitclaim_deed_rules(self):
        """Initialize Quitclaim Deed specific validation rules"""
        doc_type = "quitclaim_deed"
        
        # Required fields (fewer than Grant Deed)
        required_fields = [
            ("grantors_text", "Civil Code §1091"),
            ("grantees_text", "Civil Code §1091"),
            ("county", "Civil Code §1092"),
            ("legal_description", "Civil Code §1092")
        ]
        
        for field, code in required_fields:
            self.add_rule(doc_type, RequiredFieldRule(
                field_path=field,
                code_reference=code
            ))
        
        # Risk acknowledgment validation
        self.add_rule(doc_type, BusinessRuleValidation(
            field_path="risk_acknowledgment",
            rule_function=lambda data, ctx: data.get("risk_acknowledgment", False),
            message="Risk acknowledgment is strongly recommended for quitclaim deeds",
            severity=ValidationSeverity.WARNING
        ))
        
        # High-value transfer warning
        self.add_rule(doc_type, BusinessRuleValidation(
            field_path="consideration_amount",
            rule_function=self._validate_quitclaim_consideration,
            message="High-value quitclaim transfers may indicate title issues",
            severity=ValidationSeverity.WARNING
        ))
    
    def _initialize_interspousal_transfer_rules(self):
        """Initialize Interspousal Transfer specific validation rules"""
        doc_type = "interspousal_transfer"
        
        # Required fields
        required_fields = [
            ("grantors_text", "Family Code §1100"),
            ("grantees_text", "Family Code §1100"),
            ("county", "Civil Code §1092"),
            ("legal_description", "Civil Code §1092")
        ]
        
        for field, code in required_fields:
            self.add_rule(doc_type, RequiredFieldRule(
                field_path=field,
                code_reference=code
            ))
        
        # Spouse relationship validation
        self.add_rule(doc_type, BusinessRuleValidation(
            field_path="grantors_text",
            rule_function=self._validate_spouse_relationship,
            message="Parties must be married spouses for interspousal transfer",
            severity=ValidationSeverity.ERROR
        ))
        
        # Property characterization validation
        self.add_rule(doc_type, BusinessRuleValidation(
            field_path="property_characterization",
            rule_function=lambda data, ctx: data.get("property_characterization") in [
                "separate property", "community property", "quasi-community property"
            ],
            message="Property characterization must be specified for interspousal transfers",
            severity=ValidationSeverity.WARNING
        ))
    
    def _initialize_global_rules(self):
        """Initialize global validation rules"""
        
        # Legal description minimum length
        self.add_global_rule(BusinessRuleValidation(
            field_path="legal_description",
            rule_function=lambda data, ctx: len(str(data.get("legal_description", ""))) >= 20,
            message="Legal description appears too short to be complete",
            severity=ValidationSeverity.WARNING
        ))
        
        # County validation
        self.add_global_rule(FormatValidationRule(
            field_path="county",
            pattern=r"^[A-Za-z\s]+$",
            message="County name should contain only letters and spaces"
        ))
    
    # Validation helper methods
    def _validate_dtt_calculation(self, data: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Validate documentary transfer tax calculation"""
        dtt_amount = data.get("dtt_amount")
        if not dtt_amount:
            return True  # May be exempt
        
        try:
            amount = float(dtt_amount)
            return amount >= 0
        except (ValueError, TypeError):
            return False
    
    def _validate_different_parties(self, field_values: Dict[str, Any], 
                                  data: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Validate that grantors and grantees are different"""
        grantors = field_values.get("grantors_text", "").lower().strip()
        grantees = field_values.get("grantees_text", "").lower().strip()
        
        if not grantors or not grantees:
            return True  # Can't validate if either is empty
        
        return grantors != grantees
    
    def _validate_quitclaim_consideration(self, data: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Validate quitclaim deed consideration amount"""
        consideration = data.get("consideration_amount", 0)
        try:
            amount = float(consideration)
            # Warning if over $100,000
            return amount <= 100000
        except (ValueError, TypeError):
            return True  # Can't validate invalid amounts
    
    def _validate_spouse_relationship(self, data: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Validate that parties are spouses"""
        grantors = data.get("grantors_text", "").lower()
        grantees = data.get("grantees_text", "").lower()
        
        spouse_indicators = ["husband", "wife", "spouse", "married"]
        
        return any(indicator in grantors or indicator in grantees 
                  for indicator in spouse_indicators)

# Global validation framework instance
validation_framework = DocumentValidationFramework()

# Utility functions for custom validations
def create_custom_validation(field_path: str, validation_function: Callable,
                           message: str, severity: ValidationSeverity = ValidationSeverity.ERROR,
                           validation_type: ValidationType = ValidationType.CUSTOM) -> ValidationRule:
    """Create a custom validation rule"""
    
    class CustomValidationRule(ValidationRule):
        def __init__(self):
            super().__init__(field_path, validation_type, severity, message)
            self.validation_function = validation_function
        
        def validate(self, data: Dict[str, Any], context: Dict[str, Any] = None) -> ValidationResult:
            try:
                is_valid = self.validation_function(data, context or {})
                return ValidationResult(
                    field_path=self.field_path,
                    validation_type=self.validation_type,
                    severity=self.severity,
                    passed=is_valid,
                    message=self.message
                )
            except Exception as e:
                return ValidationResult(
                    field_path=self.field_path,
                    validation_type=self.validation_type,
                    severity=ValidationSeverity.ERROR,
                    passed=False,
                    message=f"Custom validation error: {str(e)}"
                )
    
    return CustomValidationRule()

def validate_california_apn(apn: str) -> bool:
    """Validate California APN format"""
    if not apn:
        return True  # APN is optional in many cases
    
    patterns = [
        r"^\d{3}-\d{3}-\d{3}$",      # XXX-XXX-XXX
        r"^\d{4}-\d{3}-\d{3}$",      # XXXX-XXX-XXX
        r"^\d{8,12}$",               # 8-12 digits
        r"^\d{3}-\d{3}-\d{3}-\d{3}$" # XXX-XXX-XXX-XXX
    ]
    
    return any(re.match(pattern, apn.strip()) for pattern in patterns)

def validate_legal_description_completeness(description: str) -> bool:
    """Validate legal description completeness"""
    if not description or len(description.strip()) < 20:
        return False
    
    required_elements = ["lot", "block", "tract", "map", "county", "recorded"]
    desc_lower = description.lower()
    
    # Must have at least 2 of the required elements
    found_elements = sum(1 for element in required_elements if element in desc_lower)
    return found_elements >= 2


