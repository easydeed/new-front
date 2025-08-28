"use client";
import { useEffect, useState } from "react";
import TextareaUnderline from "@/components/ui/TextareaUnderline";
import InputUnderline from "@/components/ui/InputUnderline";
import { Step4Schema } from "../validation/grantDeed";
import { getStep1Data, getGrantDeedData } from "../state";

interface Step4Data {
  grantorsText: string;
  granteesText: string;
  county: string;
  legalDescription: string;
}

interface Step4Props {
  onNext: () => void;
  onDataChange: (data: { step4: Step4Data }) => void;
}

export default function Step4PartiesProperty({ onNext, onDataChange }: Step4Props) {
  const step1Data = getStep1Data();
  const grantDeedData = getGrantDeedData();
  const step4Data = grantDeedData.step4;

  const [local, setLocal] = useState<Step4Data>({
    grantorsText: step4Data?.grantorsText ?? "",
    granteesText: step4Data?.granteesText ?? "",
    county: step4Data?.county ?? step1Data?.county ?? "",
    legalDescription: step4Data?.legalDescription ?? ""
  });

  // Prefill grantors from TitlePoint (human‑readable string)
  useEffect(() => {
    if (!local.grantorsText && step1Data?.titlePoint?.owners) {
      const owners = (step1Data.titlePoint.owners as Array<{ fullName?: string; name?: string }> | undefined)
        ?.map((o) => o.fullName || o.name)
        .filter(Boolean);
      if (owners.length) {
        setLocal((p) => ({ ...p, grantorsText: owners.join("; ") }));
      }
    }
  }, [step1Data?.titlePoint, local.grantorsText]);

  // Update parent component when local data changes
  useEffect(() => {
    onDataChange({ step4: local });
  }, [local, onDataChange]);

  function saveAndContinue() {
    const parsed = Step4Schema.safeParse(local);
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
        step4: parsed.data
      }
    };
    localStorage.setItem('deedWizardDraft', JSON.stringify(updatedData));
    
    onNext();
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Parties & Property</h2>
        <p className="text-gray-600">Grantor and grantee information</p>
      </div>

      <TextareaUnderline
        label="Grantor(s)"
        hint="Auto-filled from TitlePoint; edit as needed."
        value={local.grantorsText}
        onChange={(e) => setLocal({ ...local, grantorsText: e.target.value })}
        placeholder="Enter grantor names exactly as they should appear"
      />
      
      <TextareaUnderline
        label="Grantee(s)"
        hint="Enter the grantee(s) exactly as they should appear on the deed."
        value={local.granteesText}
        onChange={(e) => setLocal({ ...local, granteesText: e.target.value })}
        placeholder="Enter grantee names and vesting information"
      />

      <div className="grid md:grid-cols-2 gap-6">
        <InputUnderline
          label="County"
          value={local.county}
          onChange={(e) => setLocal({ ...local, county: e.target.value })}
          placeholder="Auto-filled from property search"
        />
        <div />
      </div>

      <TextareaUnderline
        label='Property Description'
        hint='"… the real property situated in the County of _______, State of California, more particularly described as follows:"'
        value={local.legalDescription}
        onChange={(e) => setLocal({ ...local, legalDescription: e.target.value })}
        placeholder="Enter complete legal description of the property"
      />

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
