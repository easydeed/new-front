"use client";
import { useEffect, useState } from "react";
import InputUnderline from "@/components/ui/InputUnderline";

interface DTTExemptionData {
  reason?: string;
}

interface DTTExemptionProps {
  onNext: () => void;
  onDataChange: (data: { dttExemption: DTTExemptionData }) => void;
}

/**
 * Step: Documentary Transfer Tax Exemption
 * Used for: Interspousal Transfer Deed
 * Purpose: Capture the DTT exemption reason
 */
export default function DTTExemption({ onNext, onDataChange }: DTTExemptionProps) {
  // Load existing data from localStorage
  const getStoredData = () => {
    try {
      const stored = localStorage.getItem('deedWizardDraft');
      if (stored) {
        const data = JSON.parse(stored);
        return data.dttExemption;
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  };

  const [local, setLocal] = useState<DTTExemptionData>(() => {
    const stored = getStoredData();
    return {
      reason: stored?.reason ?? 'Interspousal transfer pursuant to R&T §11927'
    };
  });

  // Update parent component when local data changes
  useEffect(() => {
    onDataChange({ dttExemption: local });
  }, [local, onDataChange]);

  function saveAndContinue() {
    // Simple validation
    if (!local.reason || local.reason.trim().length === 0) {
      alert('Please provide a DTT exemption reason.');
      return;
    }
    
    // Save to localStorage
    const currentData = JSON.parse(localStorage.getItem('deedWizardDraft') || '{}');
    const updatedData = {
      ...currentData,
      dttExemption: local
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
        Documentary Transfer Tax — Exemption
      </h2>
      
      <p style={{
        fontSize: '14px',
        color: '#6b7280',
        marginBottom: '32px'
      }}>
        Interspousal transfers are typically exempt from Documentary Transfer Tax. 
        Provide the exemption reason below (default reason is pre-filled).
      </p>

      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: 500,
          color: '#374151',
          marginBottom: '8px'
        }}>
          DTT Exemption Reason *
        </label>
        
        <textarea
          value={local.reason || ''}
          onChange={(e) => setLocal({ ...local, reason: e.target.value })}
          placeholder="Interspousal transfer pursuant to R&T §11927"
          rows={3}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
        
        <p style={{
          fontSize: '12px',
          color: '#6b7280',
          marginTop: '4px'
        }}>
          This reason will appear on the deed to explain why no Documentary Transfer Tax is being paid.
        </p>
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

