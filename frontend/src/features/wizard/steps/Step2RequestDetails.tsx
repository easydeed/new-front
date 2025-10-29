"use client";
import { useEffect, useMemo, useState } from "react";
import InputUnderline from "@/components/ui/InputUnderline";
// ✅ PHASE 19d: Import PrefillCombo for Partners dropdown
import PrefillCombo from "@/features/wizard/mode/components/PrefillCombo";
// ✅ PHASE 19d: Import usePartners hook for fetching partners
import { usePartners } from "@/features/partners/PartnersContext";
import { Step2Schema } from "../validation/grantDeed";
import { getStep1Data, getGrantDeedData } from "../state";

interface MailTo {
  name?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface Step2Data {
  requestedBy?: string;
  titleCompany?: string;
  escrowNo?: string;
  titleOrderNo?: string;
  apn?: string;
  usePIQForMailTo?: boolean;
  mailTo: MailTo;
}

interface Step2Props {
  onNext: () => void;
  onDataChange: (data: { step2: Step2Data }) => void;
}

export default function Step2RequestDetails({ onNext, onDataChange }: Step2Props) {
  const step1Data = getStep1Data();
  const grantDeedData = getGrantDeedData();
  const step2Data = grantDeedData.step2;
  
  // ✅ PHASE 19d: Fetch partners list (same as Modern Wizard)
  // ✅ PHASE 19d HOTFIX: Extract partners array from context object
  const { partners } = usePartners();

  const [local, setLocal] = useState(() => ({
    requestedBy: step2Data?.requestedBy ?? "",
    titleCompany: step2Data?.titleCompany ?? "",
    escrowNo: step2Data?.escrowNo ?? "",
    titleOrderNo: step2Data?.titleOrderNo ?? "",
    apn: step2Data?.apn ?? step1Data?.apn ?? "",
    usePIQForMailTo: step2Data?.usePIQForMailTo ?? true,
    mailTo: {
      name: step2Data?.mailTo?.name ?? "",
      company: step2Data?.mailTo?.company ?? "",
      address1: step2Data?.mailTo?.address1 ?? "",
      address2: step2Data?.mailTo?.address2 ?? "",
      city: step2Data?.mailTo?.city ?? "",
      state: step2Data?.mailTo?.state ?? "CA",
      zip: step2Data?.mailTo?.zip ?? ""
    }
  }));

  // ✅ PHASE 19 HOTFIX #10: Update local state when step2Data changes from parent
  // This handles when prefillFromEnrichment() clears wizard data
  useEffect(() => {
    console.log('[Step2] step2Data changed, updating local state:', step2Data);
    setLocal({
      requestedBy: step2Data?.requestedBy ?? "",
      titleCompany: step2Data?.titleCompany ?? "",
      escrowNo: step2Data?.escrowNo ?? "",
      titleOrderNo: step2Data?.titleOrderNo ?? "",
      apn: step2Data?.apn ?? step1Data?.apn ?? "",
      usePIQForMailTo: step2Data?.usePIQForMailTo ?? true,
      mailTo: {
        name: step2Data?.mailTo?.name ?? "",
        company: step2Data?.mailTo?.company ?? "",
        address1: step2Data?.mailTo?.address1 ?? "",
        address2: step2Data?.mailTo?.address2 ?? "",
        city: step2Data?.mailTo?.city ?? "",
        state: step2Data?.mailTo?.state ?? "CA",
        zip: step2Data?.mailTo?.zip ?? ""
      }
    });
  }, [step2Data, step1Data]);

  // AI Smart suggestion: if usePIQForMailTo, mirror Step 1 PIQ address using AI integration
  useEffect(() => {
    if (local.usePIQForMailTo && step1Data?.piqAddress) {
      // Use AI integration to suggest mail-to details based on PIQ address
      const aiSuggestedMailTo = {
        ...local.mailTo,
        address1: step1Data.piqAddress.address1 || "",
        address2: step1Data.piqAddress.address2 || "",
        city: step1Data.piqAddress.city || "",
        state: step1Data.piqAddress.state || "CA",
        zip: step1Data.piqAddress.zip || ""
      };

      setLocal((prev) => ({
        ...prev,
        mailTo: aiSuggestedMailTo
      }));
    }
  }, [local.usePIQForMailTo, step1Data?.piqAddress]);

  // Update parent component when local data changes
  useEffect(() => {
    onDataChange({ step2: local });
  }, [local, onDataChange]);

  function saveAndContinue() {
    const parsed = Step2Schema.safeParse(local);
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
        step2: parsed.data
      }
    };
    localStorage.setItem('deedWizardDraft', JSON.stringify(updatedData));
    
    onNext();
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Request Details</h2>
        <p className="text-gray-600">Recording and mailing information</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ✅ PHASE 19d: Replace plain input with PrefillCombo (same as Modern Wizard) */}
        <div className="md:col-span-2">
          <PrefillCombo
            label="Recording Requested By"
            placeholder="Search partners or type a new name…"
            value={local.requestedBy || ''}
            onChange={(val) => setLocal({ ...local, requestedBy: val })}
            partners={partners}
            allowNewPartner={true}
          />
          <p className="text-sm text-gray-500 mt-1">Select from your industry partners or type a custom name</p>
        </div>
        <InputUnderline
          label="Title Company"
          value={local.titleCompany}
          onChange={(e) => setLocal({ ...local, titleCompany: e.target.value })}
          placeholder="e.g., Pacific Coast Title Company"
        />
        <InputUnderline
          label="Escrow / Order No."
          value={local.escrowNo}
          onChange={(e) => setLocal({ ...local, escrowNo: e.target.value })}
          placeholder="Optional"
        />
        <InputUnderline
          label="Title Order Number"
          value={local.titleOrderNo}
          onChange={(e) => setLocal({ ...local, titleOrderNo: e.target.value })}
          placeholder="Optional"
        />
        <InputUnderline
          label="APN"
          value={local.apn}
          onChange={(e) => setLocal({ ...local, apn: e.target.value })}
          placeholder="Auto-filled from Step 1"
          hint="Assessor's Parcel Number from property search"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={local.usePIQForMailTo}
          onChange={(e) => setLocal({ ...local, usePIQForMailTo: e.target.checked })}
          className="accent-neutral-900"
          id="usePIQ"
        />
        <label htmlFor="usePIQ">Use property address for &quot;Mail To&quot; (AI suggested)</label>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Mail To Address</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <InputUnderline
            label="Mail To — Name"
            value={local.mailTo.name}
            onChange={(e) => setLocal({ ...local, mailTo: { ...local.mailTo, name: e.target.value } })}
          />
          <InputUnderline
            label="Company"
            value={local.mailTo.company}
            onChange={(e) => setLocal({ ...local, mailTo: { ...local.mailTo, company: e.target.value } })}
          />
          <InputUnderline
            label="Address Line 1"
            value={local.mailTo.address1}
            onChange={(e) => setLocal({ ...local, mailTo: { ...local.mailTo, address1: e.target.value } })}
          />
          <InputUnderline
            label="Address Line 2"
            value={local.mailTo.address2}
            onChange={(e) => setLocal({ ...local, mailTo: { ...local.mailTo, address2: e.target.value } })}
          />
          <InputUnderline
            label="City"
            value={local.mailTo.city}
            onChange={(e) => setLocal({ ...local, mailTo: { ...local.mailTo, city: e.target.value } })}
          />
          <InputUnderline
            label="State"
            value={local.mailTo.state}
            onChange={(e) => setLocal({ ...local, mailTo: { ...local.mailTo, state: e.target.value } })}
          />
          <InputUnderline
            label="ZIP"
            value={local.mailTo.zip}
            onChange={(e) => setLocal({ ...local, mailTo: { ...local.mailTo, zip: e.target.value } })}
          />
        </div>
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
