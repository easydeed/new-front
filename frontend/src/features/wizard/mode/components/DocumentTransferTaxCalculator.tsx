"use client"

import type React from "react"

import { Info, AlertTriangle } from "lucide-react"
import { useEffect, useState } from "react"

interface DocumentTransferTaxCalculatorProps {
  transferValue: number | null
  dttBasis: "full_value" | "less_liens"
  areaType: "unincorporated" | "city"
  cityName: string
  isExempt: boolean
  exemptionReason: string
  onChange: (field: string, value: any) => void
  errors?: {
    transferValue?: string
    dttBasis?: string
    areaType?: string
    cityName?: string
    exemptionReason?: string
  }
}

export default function DocumentTransferTaxCalculator({
  transferValue,
  dttBasis,
  areaType,
  cityName,
  isExempt,
  exemptionReason,
  onChange,
  errors = {},
}: DocumentTransferTaxCalculatorProps) {
  const [displayValue, setDisplayValue] = useState("")
  const [showCityTooltip, setShowCityTooltip] = useState(false)

  // Calculate DTT
  const calculateDTT = (value: number | null): number => {
    if (!value || value <= 0) return 0
    return Math.round((value / 1000) * 1.1 * 100) / 100
  }

  const dttAmount = calculateDTT(transferValue)

  // Update parent with calculated DTT
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    onChange("dttAmount", isExempt ? 0 : dttAmount)
  }, [dttAmount, isExempt])
  // Note: onChange should be wrapped in useCallback by parent component

  // Format currency display
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value)
  }

  // Handle transfer value input
  const handleTransferValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "")
    setDisplayValue(value)
    const numValue = Number.parseFloat(value)
    onChange("transferValue", isNaN(numValue) ? null : numValue)
  }

  // Format display value on blur
  const handleBlur = () => {
    if (transferValue) {
      setDisplayValue(transferValue.toLocaleString("en-US"))
    }
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">📊</span>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900">Documentary Transfer Tax Calculation</h3>
          <div className="h-0.5 bg-gradient-to-r from-[#7C4DFF] to-[#7C4DFF]/20 mt-2" />
        </div>
      </div>

      {/* Transfer Value Input */}
      <div className="space-y-2">
        <label htmlFor="transferValue" className="block text-sm font-medium text-gray-900">
          Property Transfer Value <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
          <input
            type="text"
            id="transferValue"
            value={displayValue}
            onChange={handleTransferValueChange}
            onBlur={handleBlur}
            onFocus={() => setDisplayValue(transferValue?.toString() || "")}
            placeholder="500,000"
            className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all ${
              errors.transferValue ? "border-red-500" : "border-gray-300"
            }`}
            aria-required="true"
            aria-invalid={!!errors.transferValue}
          />
        </div>
        <p className="text-sm text-gray-500 flex items-start gap-2">
          <span>💡</span>
          <span>Enter the purchase price or fair market value</span>
        </p>
        {errors.transferValue && (
          <p className="text-sm text-red-500" role="alert" aria-live="polite">
            {errors.transferValue}
          </p>
        )}
      </div>

      {/* Calculation Breakdown */}
      {transferValue && transferValue > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 space-y-4 animate-in fade-in duration-300">
          <div className="border-b-2 border-green-300 pb-2">
            <h4 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Calculation Breakdown</h4>
          </div>
          <div className="space-y-3 text-gray-700">
            <div className="flex justify-between items-center">
              <span className="font-medium">Transfer Value:</span>
              <span className="font-semibold text-lg">{formatCurrency(transferValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">California DTT Rate:</span>
              <span className="font-semibold">$1.10 per $1,000</span>
            </div>
            <div className="border-t-2 border-green-300 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Documentary Transfer Tax:</span>
                <span
                  className={`font-bold text-2xl ${isExempt ? "line-through text-gray-400" : "text-green-600"}`}
                  aria-live="polite"
                >
                  {formatCurrency(dttAmount)}
                </span>
              </div>
              {isExempt && <p className="text-sm text-amber-600 mt-2 font-medium">Tax waived due to exemption</p>}
            </div>
          </div>
        </div>
      )}

      {/* Tax Computation Basis */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-900">
          Tax Computation Basis <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#7C4DFF] transition-colors">
            <input
              type="radio"
              name="dttBasis"
              value="full_value"
              checked={dttBasis === "full_value"}
              onChange={(e) => onChange("dttBasis", e.target.value)}
              className="w-4 h-4 text-[#7C4DFF] focus:ring-[#7C4DFF]"
            />
            <span className="text-gray-900">Computed on full value of property conveyed</span>
          </label>
          <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#7C4DFF] transition-colors">
            <input
              type="radio"
              name="dttBasis"
              value="less_liens"
              checked={dttBasis === "less_liens"}
              onChange={(e) => onChange("dttBasis", e.target.value)}
              className="w-4 h-4 text-[#7C4DFF] focus:ring-[#7C4DFF]"
            />
            <span className="text-gray-900">Computed on value less liens remaining</span>
          </label>
        </div>
        {errors.dttBasis && (
          <p className="text-sm text-red-500" role="alert">
            {errors.dttBasis}
          </p>
        )}
      </div>

      {/* Property Location */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-900">
          Property Location <span className="text-red-500">*</span>
        </label>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#7C4DFF] transition-colors">
            <input
              type="radio"
              name="areaType"
              value="unincorporated"
              checked={areaType === "unincorporated"}
              onChange={(e) => onChange("areaType", e.target.value)}
              className="w-4 h-4 text-[#7C4DFF] focus:ring-[#7C4DFF]"
            />
            <span className="text-gray-900">Unincorporated area</span>
          </label>
          <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#7C4DFF] transition-colors">
            <input
              type="radio"
              name="areaType"
              value="city"
              checked={areaType === "city"}
              onChange={(e) => onChange("areaType", e.target.value)}
              className="w-4 h-4 text-[#7C4DFF] focus:ring-[#7C4DFF] mt-1"
            />
            <div className="flex-1 space-y-2">
              <span className="text-gray-900">City of:</span>
              {areaType === "city" && (
                <input
                  type="text"
                  value={cityName}
                  onChange={(e) => onChange("cityName", e.target.value)}
                  placeholder="e.g., San Francisco"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all ${
                    errors.cityName ? "border-red-500" : "border-gray-300"
                  }`}
                  aria-required={areaType === "city"}
                />
              )}
            </div>
          </label>
        </div>
        <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <span>Some cities charge additional local transfer tax</span>
        </div>
        {errors.cityName && (
          <p className="text-sm text-red-500" role="alert">
            {errors.cityName}
          </p>
        )}
      </div>

      {/* Exemption Section */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h4 className="font-bold text-gray-900 uppercase tracking-wide">Exemption (if applicable)</h4>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isExempt}
            onChange={(e) => onChange("isExempt", e.target.checked)}
            className="w-5 h-5 text-[#7C4DFF] rounded focus:ring-[#7C4DFF]"
          />
          <span className="text-gray-900 font-medium">This transfer is exempt from DTT</span>
        </label>
        {isExempt && (
          <div className="space-y-2 animate-in fade-in duration-300">
            <label htmlFor="exemptionReason" className="block text-sm font-medium text-gray-900">
              If exempt, please provide reason: <span className="text-red-500">*</span>
            </label>
            <textarea
              id="exemptionReason"
              value={exemptionReason}
              onChange={(e) => onChange("exemptionReason", e.target.value)}
              placeholder="e.g., Gift to family member, no consideration"
              rows={3}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-transparent transition-all resize-none ${
                errors.exemptionReason ? "border-red-500" : "border-gray-300"
              }`}
              aria-required={isExempt}
            />
            <p className="text-sm text-gray-600 flex items-start gap-2">
              <span>💡</span>
              <span>Common exemptions: family gifts, spousal transfers, partnership changes with same ownership</span>
            </p>
            {errors.exemptionReason && (
              <p className="text-sm text-red-500" role="alert">
                {errors.exemptionReason}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

