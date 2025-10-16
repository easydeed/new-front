/**
 * Phase 15 v5: Industry Partners Panel
 * Purpose: Management UI for viewing/creating partners (optional sidebar component)
 * Features: List partners, create new with person details
 */

'use client';
import React, { useState } from 'react';
import { usePartners } from './PartnersContext';
import type { PartnerCategory, PartnerRole } from './types';

export default function IndustryPartnersPanel() {
  const { items, create, loading } = usePartners();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'title_company' as PartnerCategory,
    personName: '',
    personRole: '' as PartnerRole | '',
    personEmail: '',
    personPhone: ''
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      await create({
        name: formData.name.trim(),
        category: formData.category,
        person: formData.personName.trim() ? {
          name: formData.personName.trim(),
          role: formData.personRole || undefined,
          email: formData.personEmail.trim() || undefined,
          phone: formData.personPhone.trim() || undefined
        } : undefined
      });

      // Reset form
      setFormData({
        name: '',
        category: 'title_company',
        personName: '',
        personRole: '',
        personEmail: '',
        personPhone: ''
      });
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create partner');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="industry-partners-panel" style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', margin: 0 }}>
          Industry Partners
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'white', borderRadius: '6px' }}>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
              Company Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Acme Title Company"
              style={{ width: '100%', padding: '6px 8px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as PartnerCategory })}
              style={{ width: '100%', padding: '6px 8px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px' }}
            >
              <option value="title_company">Title Company</option>
              <option value="real_estate">Real Estate</option>
              <option value="lender">Lender</option>
            </select>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '8px' }}>
            <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>Contact Person (Optional)</p>
            
            <input
              type="text"
              value={formData.personName}
              onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
              placeholder="Jane Smith"
              style={{ width: '100%', padding: '6px 8px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px', marginBottom: '6px' }}
            />
            
            <select
              value={formData.personRole}
              onChange={(e) => setFormData({ ...formData, personRole: e.target.value as PartnerRole | '' })}
              style={{ width: '100%', padding: '6px 8px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px', marginBottom: '6px' }}
            >
              <option value="">Select Role</option>
              <option value="title_officer">Title Officer</option>
              <option value="realtor">Realtor</option>
              <option value="loan_officer">Loan Officer</option>
            </select>
          </div>

          {error && (
            <div style={{ padding: '6px 8px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '12px', borderRadius: '4px', marginBottom: '8px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={creating || !formData.name.trim()}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '13px',
              fontWeight: '500',
              backgroundColor: creating ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: creating ? 'not-allowed' : 'pointer'
            }}
          >
            {creating ? 'Creating...' : 'Create Partner'}
          </button>
        </form>
      )}

      <div style={{ fontSize: '12px', color: '#6b7280' }}>
        {loading ? (
          <p>Loading...</p>
        ) : items.length === 0 ? (
          <p>No partners yet. Add your first one!</p>
        ) : (
          <div>
            <p style={{ marginBottom: '6px', fontWeight: '500' }}>{items.length} partner{items.length !== 1 ? 's' : ''}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
              {items.slice(0, 10).map((item, idx) => (
                <li key={idx} style={{ padding: '4px 0', borderBottom: '1px solid #e5e7eb' }}>
                  {item.display}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

