"use client";
import { useState, useEffect } from "react";
import MoneyInput from "@/components/ui/MoneyInput";
import InputUnderline from "@/components/ui/InputUnderline";
import RadioGroupRow from "@/components/ui/RadioGroupRow";
import { Step3Schema } from "../validation/grantDeed";
import { getGrantDeedData } from "../state";

interface Step3Props {
  onNext: () => void;
  onDataChange: (data: any) => void;
}

export default function Step3DeclarationsTax({ onNext, onDataChange }: Step3Props) {
  const grantDeedData = getGrantDeedData();
  const step3Data = grantDeedData.step3;

  const [local, setLocal] = useState({
    dttAmount: step3Data?.dttAmount ?? "",
    dttBasis: step3Data?.dttBasis ?? "full_value",
    areaType: step3Data?.areaType ?? "unincorporated",
    cityName: step3Data?.cityName ?? ""
  });

  // Update parent component when local data changes
  useEffect(() => {
    onDataChange({ step3: local });
  }, [local, onDataChange]);

  function saveAndContinue() {
    const parsed = Step3Schema.safeParse(local);
    if (!parsed.success) {
      alert(parsed.error.errors.map(e => e.message).join("\n"));
      return;
    }
    
    // Save to localStorage
    const currentData = JSON.parse(localStorage.getItem('deedWizardDraft') || '{}');
    const updatedData = {
      ...currentData,
      grantDeed: {
        ...currentData.grantDeed,
        step3: parsed.data
      }
    };
    localStorage.setItem('deedWizardDraft', JSON.stringify(updatedData));
    
    onNext();
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Declarations & Transfer Tax</h2>
        <p className="text-gray-600">Documentary transfer tax information</p>
      </div>

      <div className="text-sm opacity-80 bg-gray-50 p-4 rounded-lg">
        <div><strong>THE UNDERSIGNED GRANTOR(S) DECLARE(S):</strong></div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <MoneyInput
          label="DOCUMENTARY TRANSFER TAX"
          placeholder="0.00"
          value={local.dttAmount}
          onChange={(e) => setLocal({ ...local, dttAmount: e.target.value })}
        />
        <div />
      </div>

      <RadioGroupRow
        label="Computed On"
        name="dttBasis"
        value={local.dttBasis}
        onChange={(v) => setLocal({ ...local, dttBasis: v as "full_value" | "less_liens" })}
        options={[
          { label: "Full value of property conveyed", value: "full_value" },
          { label: "Full value less liens & encumbrances", value: "less_liens" }
        ]}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <RadioGroupRow
          label="Area"
          name="areaType"
          value={local.areaType}
          onChange={(v) => setLocal({ ...local, areaType: v as "unincorporated" | "city" })}
          options={[
            { label: "Unincorporated area", value: "unincorporated" },
            { label: "City", value: "city" }
          ]}
        />
        {local.areaType === "city" && (
          <InputUnderline
            label="City Name"
            placeholder="e.g., Los Angeles"
            value={local.cityName}
            onChange={(e) => setLocal({ ...local, cityName: e.target.value })}
          />
        )}
      </div>

      <div className="flex justify-end">
        <button 
          onClick={saveAndContinue} 
          className="px-5 py-2 rounded-xl border border-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
