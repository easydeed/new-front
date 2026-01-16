'use client';

import { useMemo, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { DTTData } from '@/types/builder';

interface TransferTaxSectionProps {
  value: DTTData | null;
  onChange: (dtt: DTTData) => void;
  city?: string;
  deedType: string;
}

const CITIES_WITH_OWN_DTT = [
  'los angeles', 'san francisco', 'oakland', 'berkeley', 'san jose',
  'sacramento', 'riverside', 'pomona', 'culver city', 'santa monica',
];

const EXEMPTION_REASONS = [
  { value: 'R&T 11911', label: 'R&T 11911 - Gift / No Consideration' },
  { value: 'R&T 11927', label: 'R&T 11927 - Interspousal Transfer' },
  { value: 'R&T 11930', label: 'R&T 11930 - Transfer to Revocable Trust' },
  { value: 'R&T 11923', label: 'R&T 11923 - Court Order' },
  { value: 'R&T 11925', label: 'R&T 11925 - Foreclosure / Deed in Lieu' },
  { value: 'Other', label: 'Other Exemption' },
];

export function TransferTaxSection({ value, onChange, city, deedType }: TransferTaxSectionProps) {
  useEffect(() => {
    if (!value) {
      const isInCity = city && CITIES_WITH_OWN_DTT.includes(city.toLowerCase());
      const isInterspousal = deedType === 'interspousal-transfer';
      
      onChange({
        isExempt: isInterspousal,
        exemptReason: isInterspousal ? 'R&T 11927' : '',
        transferValue: '',
        calculatedAmount: '',
        basis: 'full_value',
        areaType: isInCity ? 'city' : 'unincorporated',
        cityName: isInCity ? city : '',
      });
    }
  }, [city, deedType, value, onChange]);

  const calculatedAmount = useMemo(() => {
    if (!value || value.isExempt || !value.transferValue) return '';
    
    const amount = parseFloat(value.transferValue.replace(/[^0-9.]/g, ''));
    if (isNaN(amount)) return '';
    
    const countyTax = (amount / 1000) * 1.10;
    const cityTax = value.areaType === 'city' ? (amount / 1000) * 4.50 : 0;
    
    return (countyTax + cityTax).toFixed(2);
  }, [value]);

  useEffect(() => {
    if (value && calculatedAmount !== value.calculatedAmount) {
      onChange({ ...value, calculatedAmount });
    }
  }, [calculatedAmount, value, onChange]);

  if (!value) return null;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!value.isExempt}
            onChange={() => onChange({ ...value, isExempt: false })}
            className="w-4 h-4 text-brand-500 focus:ring-brand-500"
          />
          <span className="font-medium text-gray-900">Calculate Tax</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={value.isExempt}
            onChange={() => onChange({ ...value, isExempt: true })}
            className="w-4 h-4 text-brand-500 focus:ring-brand-500"
          />
          <span className="font-medium text-gray-900">Exempt</span>
        </label>
      </div>

      {value.isExempt ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exemption Reason
          </label>
          <select
            value={value.exemptReason}
            onChange={(e) => onChange({ ...value, exemptReason: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Select reason...</option>
            {EXEMPTION_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer Value
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                value={value.transferValue}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  const formatted = raw ? parseInt(raw).toLocaleString() : '';
                  onChange({ ...value, transferValue: formatted });
                }}
                placeholder="500,000"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.basis === 'full_value'}
                onChange={() => onChange({ ...value, basis: 'full_value' })}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">Full value</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.basis === 'less_liens'}
                onChange={() => onChange({ ...value, basis: 'less_liens' })}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">Less liens</span>
            </label>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.areaType === 'city'}
                onChange={() => onChange({ ...value, areaType: 'city' })}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">City of {value.cityName || '___'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.areaType === 'unincorporated'}
                onChange={() => onChange({ ...value, areaType: 'unincorporated' })}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">Unincorporated</span>
            </label>
          </div>

          {calculatedAmount && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Calculator className="w-5 h-5 text-emerald-500" />
              <span className="font-medium text-emerald-700">
                Documentary Transfer Tax: ${calculatedAmount}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

