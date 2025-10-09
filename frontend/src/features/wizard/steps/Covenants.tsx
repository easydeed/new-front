"use client";
import { useEffect, useState } from "react";

interface CovenantsData {
  covenants?: string;
}

interface CovenantsProps {
  onNext: () => void;
  onDataChange: (data: { warranty: CovenantsData }) => void;
}

/**
 * Step: Warranty Covenants
 * Used for: Warranty Deed
 * Purpose: Capture optional warranty covenant language
 */
export default function Covenants({ onNext, onDataChange }: CovenantsProps) {
  // Load existing data from localStorage
  const getStoredData = () => {
    try {
      const stored = localStorage.getItem('deedWizardDraft');
      if (stored) {
        const data = JSON.parse(stored);
        return data.warranty;
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  };

  const [local, setLocal] = useState<CovenantsData>(() => {
    const stored = getStoredData();
    return {
      covenants: stored?.covenants ?? ''
    };
  });

  // Update parent component when local data changes
  useEffect(() => {
    onDataChange({ warranty: local });
  }, [local, onDataChange]);

  function saveAndContinue() {
    // Covenants are optional, so no validation required
    
    // Save to localStorage
    const currentData = JSON.parse(localStorage.getItem('deedWizardDraft') || '{}');
    const updatedData = {
      ...currentData,
      warranty: local
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
        Warranty Covenants
      </h2>
      
      <p style={{
        fontSize: '14px',
        color: '#6b7280',
        marginBottom: '32px'
      }}>
        Warranty deeds typically include covenant language where the grantor warrants title. 
        Add specific covenant language below if required by your firm (optional).
      </p>

      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: 500,
          color: '#374151',
          marginBottom: '8px'
        }}>
          Covenant Language (Optional)
        </label>
        
        <textarea
          value={local.covenants || ''}
          onChange={(e) => setLocal({ ...local, covenants: e.target.value })}
          placeholder="Grantor covenants that grantor is lawfully seized of the property, has good right to convey, and warrants title against all claims..."
          rows={6}
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
          Leave blank to use standard warranty deed language. Custom covenants will be included in the deed document.
        </p>
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
          💡 Common Warranty Covenants
        </h3>
        <ul style={{
          fontSize: '13px',
          color: '#6b7280',
          marginLeft: '20px',
          lineHeight: '1.6'
        }}>
          <li>Covenant of seisin (grantor owns the property)</li>
          <li>Covenant of right to convey (grantor has authority to sell)</li>
          <li>Covenant against encumbrances (no undisclosed liens)</li>
          <li>Covenant of quiet enjoyment (no third-party claims)</li>
          <li>Covenant of warranty (grantor will defend title)</li>
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

