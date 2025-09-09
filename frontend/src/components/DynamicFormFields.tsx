import React, { useState, useEffect } from 'react';
import { StepConfig } from '../lib/documentRegistry';
import { ValidationError } from '../lib/wizardState';

interface DynamicFormFieldsProps {
  stepConfig: StepConfig;
  data: Record<string, any>;
  errors: ValidationError[];
  onChange: (field: string, value: any) => void;
  onBatchChange: (fields: Record<string, any>) => void;
  documentType: string;
  isLoading?: boolean;
}

export function DynamicFormFields({
  stepConfig,
  data,
  errors,
  onChange,
  onBatchChange,
  documentType,
  isLoading = false
}: DynamicFormFieldsProps) {
  const [localData, setLocalData] = useState(data);
  
  // Update local data when props change
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const handleFieldChange = (field: string, value: any) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    onChange(field, value);
  };

  const getFieldError = (fieldName: string): ValidationError | undefined => {
    return errors.find(error => error.field === fieldName || error.field.endsWith(`.${fieldName}`));
  };

  const renderField = (fieldName: string) => {
    const fieldError = getFieldError(fieldName);
    const hasError = fieldError && fieldError.severity === 'error';
    const hasWarning = fieldError && fieldError.severity === 'warning';
    
    switch (fieldName) {
      case 'address':
        return (
          <div className="form-field">
            <label htmlFor={fieldName} className="field-label">
              Property Address *
            </label>
            <input
              id={fieldName}
              type="text"
              value={localData[fieldName] || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className={`field-input ${hasError ? 'error' : ''} ${hasWarning ? 'warning' : ''}`}
              placeholder="123 Main St, Los Angeles, CA 90210"
              disabled={isLoading}
            />
            {fieldError && (
              <div className={`field-error ${fieldError.severity}`}>
                {fieldError.message}
              </div>
            )}
          </div>
        );

      case 'apn':
        return (
          <div className="form-field">
            <label htmlFor={fieldName} className="field-label">
              Assessor's Parcel Number (APN) *
            </label>
            <input
              id={fieldName}
              type="text"
              value={localData[fieldName] || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className={`field-input ${hasError ? 'error' : ''} ${hasWarning ? 'warning' : ''}`}
              placeholder="123-456-789"
              disabled={isLoading}
            />
            {fieldError && (
              <div className={`field-error ${fieldError.severity}`}>
                {fieldError.message}
              </div>
            )}
          </div>
        );

      case 'county':
        return (
          <div className="form-field">
            <label htmlFor={fieldName} className="field-label">
              County *
            </label>
            <select
              id={fieldName}
              value={localData[fieldName] || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className={`field-select ${hasError ? 'error' : ''} ${hasWarning ? 'warning' : ''}`}
              disabled={isLoading}
            >
              <option value="">Select County</option>
              <option value="Los Angeles">Los Angeles</option>
              <option value="Orange">Orange</option>
              <option value="San Diego">San Diego</option>
              <option value="Riverside">Riverside</option>
              <option value="San Bernardino">San Bernardino</option>
              <option value="Ventura">Ventura</option>
              <option value="Santa Barbara">Santa Barbara</option>
              <option value="Kern">Kern</option>
              <option value="Fresno">Fresno</option>
              <option value="Imperial">Imperial</option>
            </select>
            {fieldError && (
              <div className={`field-error ${fieldError.severity}`}>
                {fieldError.message}
              </div>
            )}
          </div>
        );

      case 'legalDescription':
        return (
          <div className="form-field">
            <label htmlFor={fieldName} className="field-label">
              Legal Description *
            </label>
            <textarea
              id={fieldName}
              value={localData[fieldName] || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className={`field-textarea ${hasError ? 'error' : ''} ${hasWarning ? 'warning' : ''}`}
              placeholder="Lot 1, Block 2, Tract 12345, as per map recorded in Book 123, Page 45 of Maps, in the Office of the County Recorder of Los Angeles County, California"
              rows={4}
              disabled={isLoading}
            />
            {fieldError && (
              <div className={`field-error ${fieldError.severity}`}>
                {fieldError.message}
              </div>
            )}
          </div>
        );

      case 'requestedBy':
        return (
          <div className="form-field">
            <label htmlFor={fieldName} className="field-label">
              Requested By *
            </label>
            <input
              id={fieldName}
              type="text"
              value={localData[fieldName] || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className={`field-input ${hasError ? 'error' : ''} ${hasWarning ? 'warning' : ''}`}
              placeholder="Title Company Name or Attorney"
              disabled={isLoading}
            />
            {fieldError && (
              <div className={`field-error ${fieldError.severity}`}>
                {fieldError.message}
              </div>
            )}
          </div>
        );

      case 'mailTo':
        return (
          <div className="form-field-group">
            <label className="field-label">Mail To Address *</label>
            <div className="address-fields">
              <input
                type="text"
                value={localData.mailTo?.name || ''}
                onChange={(e) => handleFieldChange('mailTo', { ...localData.mailTo, name: e.target.value })}
                className={`field-input ${hasError ? 'error' : ''}`}
                placeholder="Name"
                disabled={isLoading}
              />
              <input
                type="text"
                value={localData.mailTo?.address1 || ''}
                onChange={(e) => handleFieldChange('mailTo', { ...localData.mailTo, address1: e.target.value })}
                className={`field-input ${hasError ? 'error' : ''}`}
                placeholder="Address"
                disabled={isLoading}
              />
              <div className="address-row">
                <input
                  type="text"
                  value={localData.mailTo?.city || ''}
                  onChange={(e) => handleFieldChange('mailTo', { ...localData.mailTo, city: e.target.value })}
                  className={`field-input ${hasError ? 'error' : ''}`}
                  placeholder="City"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={localData.mailTo?.state || 'CA'}
                  onChange={(e) => handleFieldChange('mailTo', { ...localData.mailTo, state: e.target.value })}
                  className={`field-input state ${hasError ? 'error' : ''}`}
                  placeholder="State"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={localData.mailTo?.zip || ''}
                  onChange={(e) => handleFieldChange('mailTo', { ...localData.mailTo, zip: e.target.value })}
                  className={`field-input zip ${hasError ? 'error' : ''}`}
                  placeholder="ZIP"
                  disabled={isLoading}
                />
              </div>
            </div>
            {fieldError && (
              <div className={`field-error ${fieldError.severity}`}>
                {fieldError.message}
              </div>
            )}
          </div>
        );

      case 'dttAmount':
        return (
          <div className="form-field">
            <label htmlFor={fieldName} className="field-label">
              Documentary Transfer Tax Amount *
            </label>
            <div className="currency-input">
              <span className="currency-symbol">$</span>
              <input
                id={fieldName}
                type="number"
                step="0.01"
                min="0"
                value={localData[fieldName] || ''}
                onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                className={`field-input currency ${hasError ? 'error' : ''} ${hasWarning ? 'warning' : ''}`}
                placeholder="0.00"
                disabled={isLoading}
              />
            </div>
            {fieldError && (
              <div className={`field-error ${fieldError.severity}`}>
                {fieldError.message}
              </div>
            )}
          </div>
        );

      case 'dttBasis':
        return (
          <div className="form-field">
            <label htmlFor={fieldName} className="field-label">
              Tax Basis *
            </label>
            <select
              id={fieldName}
              value={localData[fieldName] || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className={`field-select ${hasError ? 'error' : ''} ${hasWarning ? 'warning' : ''}`}
              disabled={isLoading}
            >
              <option value="">Select Tax Basis</option>
              <option value="full_value">Full Value of Property</option>
              <option value="partial_value">Partial Value</option>
              <option value="exempt">Exempt from Tax</option>
            </select>
            {fieldError && (
              <div className={`field-error ${fieldError.severity}`}>
                {fieldError.message}
              </div>
            )}
          </div>
        );

      case 'areaType':
        return (
          <div className="form-field">
            <label htmlFor={fieldName} className="field-label">
              Area Type *
            </label>
            <select
              id={fieldName}
              value={localData[fieldName] || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className={`field-select ${hasError ? 'error' : ''} ${hasWarning ? 'warning' : ''}`}
              disabled={isLoading}
            >
              <option value="">Select Area Type</option>
              <option value="city">City</option>
              <option value="unincorporated">Unincorporated Area</option>
            </select>
            {fieldError && (
              <div className={`field-error ${fieldError.severity}`}>
                {fieldError.message}
              </div>
            )}
          </div>
        );

      case 'cityName':
        return localData.areaType === 'city' ? (
          <div className="form-field">
            <label htmlFor={fieldName} className="field-label">
              City Name *
            </label>
            <input
              id={fieldName}
              type="text"
              value={localData[fieldName] || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className={`field-input ${hasError ? 'error' : ''} ${hasWarning ? 'warning' : ''}`}
              placeholder="Enter city name"
              disabled={isLoading}
            />
            {fieldError && (
              <div className={`field-error ${fieldError.severity}`}>
                {fieldError.message}
              </div>
            )}
          </div>
        ) : null;

      case 'grantorsText':
        return (
          <div className="form-field">
            <label htmlFor={fieldName} className="field-label">
              Grantor(s) - Current Owner(s) *
            </label>
            <textarea
              id={fieldName}
              value={localData[fieldName] || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className={`field-textarea ${hasError ? 'error' : ''} ${hasWarning ? 'warning' : ''}`}
              placeholder="John Doe, a single man; Jane Smith, a married woman as her sole and separate property"
              rows={3}
              disabled={isLoading}
            />
            <div className="field-help">
              Enter exactly as shown on current title. Separate multiple grantors with semicolons.
            </div>
            {fieldError && (
              <div className={`field-error ${fieldError.severity}`}>
                {fieldError.message}
              </div>
            )}
          </div>
        );

      case 'granteesText':
        return (
          <div className="form-field">
            <label htmlFor={fieldName} className="field-label">
              Grantee(s) - New Owner(s) *
            </label>
            <textarea
              id={fieldName}
              value={localData[fieldName] || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className={`field-textarea ${hasError ? 'error' : ''} ${hasWarning ? 'warning' : ''}`}
              placeholder="John Smith and Mary Smith, husband and wife as joint tenants"
              rows={3}
              disabled={isLoading}
            />
            <div className="field-help">
              Specify how the new owners will hold title (joint tenants, tenants in common, etc.).
            </div>
            {fieldError && (
              <div className={`field-error ${fieldError.severity}`}>
                {fieldError.message}
              </div>
            )}
          </div>
        );

      case 'riskDisclosures':
        return (
          <div className="form-field">
            <label className="field-label">Risk Acknowledgments *</label>
            <div className="checkbox-group">
              {[
                'I understand this deed contains no warranties of title',
                'I understand the grantor conveys only such interest as grantor may have',
                'I understand the buyer should obtain title insurance',
                'I acknowledge this is not recommended for arms-length sales'
              ].map((disclosure, index) => (
                <label key={index} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={localData[fieldName]?.includes(disclosure) || false}
                    onChange={(e) => {
                      const current = localData[fieldName] || [];
                      const updated = e.target.checked
                        ? [...current, disclosure]
                        : current.filter((d: string) => d !== disclosure);
                      handleFieldChange(fieldName, updated);
                    }}
                    disabled={isLoading}
                  />
                  <span className="checkbox-text">{disclosure}</span>
                </label>
              ))}
            </div>
            {fieldError && (
              <div className={`field-error ${fieldError.severity}`}>
                {fieldError.message}
              </div>
            )}
          </div>
        );

      // Add more field types as needed for other document types
      default:
        return (
          <div className="form-field">
            <label htmlFor={fieldName} className="field-label">
              {fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1')}
            </label>
            <input
              id={fieldName}
              type="text"
              value={localData[fieldName] || ''}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className={`field-input ${hasError ? 'error' : ''} ${hasWarning ? 'warning' : ''}`}
              disabled={isLoading}
            />
            {fieldError && (
              <div className={`field-error ${fieldError.severity}`}>
                {fieldError.message}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="dynamic-form-fields">
      <div className="fields-container">
        {stepConfig.fields.map((fieldName) => (
          <div key={fieldName} className="field-wrapper">
            {renderField(fieldName)}
          </div>
        ))}
      </div>
      
      {/* Field-specific help text based on document type */}
      {documentType === 'quitclaim_deed' && stepConfig.id === 'parties' && (
        <div className="document-specific-help">
          <h4>⚠️ Quitclaim Deed Important Notice</h4>
          <p>
            Quitclaim deeds provide no warranties or guarantees about the property title. 
            The grantor only transfers whatever interest they may have, if any. 
            This type of deed is commonly used between family members or to clear title issues.
          </p>
        </div>
      )}
      
      {documentType === 'interspousal_transfer' && (
        <div className="document-specific-help">
          <h4>💑 Interspousal Transfer Benefits</h4>
          <p>
            Transfers between spouses are typically exempt from documentary transfer tax 
            and may have simplified recording requirements. This deed is commonly used 
            to change how spouses hold title to property.
          </p>
        </div>
      )}
    </div>
  );
}

