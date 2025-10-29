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

  // ✅ PHASE 19a: Prefill from SiteX data (Modern Wizard's proven pattern)
  useEffect(() => {
    const wizardData = JSON.parse(localStorage.getItem('deedWizardDraft') || '{}');
    const verifiedData = wizardData.verifiedData || {};
    const formData = wizardData.formData || {};
    
    // Only hydrate if fields are empty and we have SiteX data
    if (!local.grantorsText || !local.legalDescription) {
      const updates: Partial<Step4Data> = {};
      
      // ✅ Grantor: Use SiteX currentOwnerPrimary (same as Modern Wizard)
      if (!local.grantorsText) {
        // ✅ PHASE 19a FIX: Safely handle owners array
        const titlePointOwners = step1Data?.titlePoint?.owners;
        const firstOwnerName = Array.isArray(titlePointOwners) && titlePointOwners.length > 0
          ? (titlePointOwners[0]?.fullName || titlePointOwners[0]?.name || '')
          : '';
        
        const grantorFromSiteX = verifiedData.currentOwnerPrimary || 
                                 verifiedData.grantorName ||
                                 formData.grantorName ||
                                 firstOwnerName;
        if (grantorFromSiteX) {
          updates.grantorsText = grantorFromSiteX;
        }
      }
      
      // ✅ Legal Description: Use SiteX legalDescription (same as Modern Wizard)
      if (!local.legalDescription) {
        const legalFromSiteX = verifiedData.legalDescription || 
                               formData.legalDescription ||
                               '';
        if (legalFromSiteX) {
          updates.legalDescription = legalFromSiteX;
        }
      }
      
      // ✅ County: Already hydrated from step1Data, but ensure it's from SiteX
      if (!local.county) {
        const countyFromSiteX = verifiedData.county || formData.county || step1Data?.county || '';
        if (countyFromSiteX) {
          updates.county = countyFromSiteX;
        }
      }
      
      if (Object.keys(updates).length > 0) {
        console.log('[Step4PartiesProperty] ✅ PHASE 19a: Hydrating from SiteX data:', updates);
        setLocal((p) => ({ ...p, ...updates }));
      }
    }
  }, [step1Data, local.grantorsText, local.legalDescription, local.county]);

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
        hint="Auto-filled from SiteX; edit as needed."
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
