"use client";
import { useEffect, useState } from "react";
import InputUnderline from "@/components/ui/InputUnderline";

interface TaxSaleData {
  reference?: string;
}

interface TaxSaleRefProps {
  onNext: () => void;
  onDataChange: (data: { taxSale: TaxSaleData }) => void;
}

/**
 * Step: Tax Sale Reference
 * Used for: Tax Deed
 * Purpose: Capture the tax sale reference/citation
 */
export default function TaxSaleRef({ onNext, onDataChange }: TaxSaleRefProps) {
  // Load existing data from localStorage
  const getStoredData = () => {
    try {
      const stored = localStorage.getItem('deedWizardDraft');
      if (stored) {
        const data = JSON.parse(stored);
        return data.taxSale;
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  };

  const [local, setLocal] = useState<TaxSaleData>(() => {
    const stored = getStoredData();
    return {
      reference: stored?.reference ?? ''
    };
  });

  // Update parent component when local data changes
  useEffect(() => {
    onDataChange({ taxSale: local });
  }, [local, onDataChange]);

  function saveAndContinue() {
    // Simple validation
    if (!local.reference || local.reference.trim().length === 0) {
      alert('Please provide a tax sale reference. This is required for Tax Deeds.');
      return;
    }
    
    // Save to localStorage
    const currentData = JSON.parse(localStorage.getItem('deedWizardDraft') || '{}');
    const updatedData = {
      ...currentData,
      taxSale: local
    };
    localStorage.setItem('deedWizardDraft', JSON.stringify(updatedData));
    
    onNext();
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 600,
        color: '#1f2937',
        marginBottom: '8px'
      }}>
        Tax Sale Reference
      </h2>
      
      <p style={{
        fontSize: '14px',
        color: '#6b7280',
        marginBottom: '32px'
      }}>
        Tax deeds are issued following a tax sale. Provide the tax sale reference, citation, 
        or case number that authorizes this conveyance.
      </p>

      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: 500,
          color: '#374151',
          marginBottom: '8px'
        }}>
          Tax Sale Reference / Citation *
        </label>
        
        <InputUnderline
          type="text"
          value={local.reference || ''}
          onChange={(e) => setLocal({ ...local, reference: e.target.value })}
          placeholder="e.g., Tax Sale No. 2024-12345, Case No. CV-2024-5678, R&T §3712"
          style={{
            width: '100%',
            fontSize: '14px'
          }}
        />
        
        <p style={{
          fontSize: '12px',
          color: '#6b7280',
          marginTop: '4px'
        }}>
          This reference will appear on the deed to establish the legal authority for the conveyance.
        </p>
      </div>

      <div style={{
        padding: '16px',
        backgroundColor: '#fef3c7',
        border: '1px solid #fbbf24',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#92400e',
              marginBottom: '4px'
            }}>
              Important: Tax Sale Documentation
            </h3>
            <p style={{
              fontSize: '13px',
              color: '#78350f',
              lineHeight: '1.5'
            }}>
              Ensure you have proper documentation of the tax sale proceedings, including:
            </p>
            <ul style={{
              fontSize: '13px',
              color: '#78350f',
              marginLeft: '20px',
              marginTop: '8px',
              lineHeight: '1.6'
            }}>
              <li>Tax sale certificate or deed</li>
              <li>Notice of sale and publication proof</li>
              <li>Redemption period expiration date</li>
              <li>Court order (if applicable)</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{
        padding: '16px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#374151',
          marginBottom: '8px'
        }}>
          📋 Common Reference Formats
        </h3>
        <ul style={{
          fontSize: '13px',
          color: '#6b7280',
          marginLeft: '20px',
          lineHeight: '1.6'
        }}>
          <li><strong>Tax Sale Number:</strong> "Tax Sale No. 2024-12345 held on January 15, 2024"</li>
          <li><strong>Revenue & Taxation Code:</strong> "Pursuant to R&T §3712"</li>
          <li><strong>Court Case:</strong> "Superior Court Case No. CV-2024-5678"</li>
          <li><strong>County Reference:</strong> "Los Angeles County Tax Collector Sale #TS-2024-0123"</li>
        </ul>
      </div>

      <div style={{
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '1px solid #e5e7eb'
      }}>
        <button
          onClick={saveAndContinue}
          style={{
            padding: '12px 32px',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4338ca';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#4f46e5';
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

