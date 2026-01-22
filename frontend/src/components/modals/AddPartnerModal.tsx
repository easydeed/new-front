'use client'

import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'

interface AddPartnerModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (partner: PartnerFormData) => Promise<void>
}

export interface PartnerFormData {
  company_name: string
  contact_name: string
  category: string
  email: string
  phone: string
  address_line1: string
  city: string
  state: string
  postal_code: string
}

export function AddPartnerModal({ isOpen, onClose, onSave }: AddPartnerModalProps) {
  const [formData, setFormData] = useState<PartnerFormData>({
    company_name: '',
    contact_name: '',
    category: 'title_company',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    state: 'CA',
    postal_code: '',
  })
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      await onSave(formData)
      // Reset form
      setFormData({
        company_name: '',
        contact_name: '',
        category: 'title_company',
        email: '',
        phone: '',
        address_line1: '',
        city: '',
        state: 'CA',
        postal_code: '',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof PartnerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add New Partner</h2>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* AI Guidance */}
          <div className="flex gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg mb-6">
            <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800">
              Add a title company, escrow company, or attorney you work with frequently. 
              They'll appear in your "Requested By" dropdown for faster deed preparation.
            </p>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="Pacific Coast Title Company"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="title_company">Title Company</option>
                <option value="escrow_company">Escrow Company</option>
                <option value="attorney">Attorney</option>
                <option value="real_estate">Real Estate Office</option>
                <option value="lender">Lender</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => handleChange('contact_name', e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="jane@pacificcoasttitle.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(e) => handleChange('address_line1', e.target.value)}
              placeholder="123 Main Street, Suite 100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Los Angeles"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="CA"
                maxLength={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                placeholder="90001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="(310) 555-1234"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving || !formData.company_name}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Partner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
