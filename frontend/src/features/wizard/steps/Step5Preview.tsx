"use client";
import { useMemo, useState } from "react";
import { getStep1Data, getGrantDeedData } from "../state";

interface Step5Props {
  onStepChange: (step: number) => void;
}

export default function Step5Preview({ onStepChange }: Step5Props) {
  const step1Data = getStep1Data();
  const grantDeed = getGrantDeedData();
  const [isGenerating, setIsGenerating] = useState(false);

  const html = useMemo(() => {
    const s2 = grantDeed?.step2;
    const s3 = grantDeed?.step3;
    const s4 = grantDeed?.step4;

    return `
      <div style="font-family: ui-sans-serif, system-ui; line-height: 1.4; max-width: 8.5in; margin: 0 auto; padding: 1in;">
        <h2 style="text-align:center;margin:0 0 8px 0; font-size: 18px; font-weight: bold;">GRANT DEED (Preview)</h2>

        <div style="font-size:12px;margin-bottom:12px; border: 1px solid #ccc; padding: 12px;">
          <strong>Recording Requested By:</strong> ${s2?.requestedBy || s2?.titleCompany || ""}<br/>
          <strong>And When Recorded Mail To:</strong><br/>
          ${[s2?.mailTo?.name, s2?.mailTo?.company, s2?.mailTo?.address1, s2?.mailTo?.address2, 
            `${s2?.mailTo?.city || ""}, ${s2?.mailTo?.state || ""} ${s2?.mailTo?.zip || ""}`]
            .filter(Boolean).join("<br/>")}
          <br/><br/>
          <strong>Escrow/Order No.:</strong> ${s2?.escrowNo || ""} &nbsp;&nbsp; 
          <strong>Title Order #:</strong> ${s2?.titleOrderNo || ""} &nbsp;&nbsp; 
          <strong>APN:</strong> ${s2?.apn || step1Data?.apn || ""}
        </div>

        <div style="font-size:11px;margin-bottom:12px; background: #f9f9f9; padding: 8px;">
          <strong>THE UNDERSIGNED GRANTOR(S) DECLARE(S):</strong><br/>
          Documentary transfer tax: $${s3?.dttAmount || "0.00"}.
          Computed on ${s3?.dttBasis === "less_liens" ? "full value less liens and encumbrances remaining at time of sale" : "full value of property conveyed"}.
          ${s3?.areaType === "city" ? `City of ${s3?.cityName || "________"}` : "Unincorporated area"}.
        </div>

        <p style="font-size:12px; text-align: justify;">
          For valuable consideration, receipt of which is hereby acknowledged,
          <strong>${s4?.grantorsText || "________"}</strong>
          ("Grantor${(s4?.grantorsText || "").includes(";") ? "s" : ""}") hereby GRANT(s) to
          <strong>${s4?.granteesText || "________"}</strong>
          ("Grantee${(s4?.granteesText || "").includes(";") ? "s" : ""}")
          the real property situated in the County of <strong>${s4?.county || "________"}</strong>, State of California,
          more particularly described as follows:
        </p>

        <div style="border:1px solid #000;padding:10px;white-space:pre-wrap;font-size:12px;background:#fff;">
${s4?.legalDescription || ""}
        </div>

        <div style="margin-top: 20px; font-size: 12px;">
          <p>Dated: _________________</p>
          <br/>
          <p>_________________________________<br/>
          Grantor Signature</p>
          <br/>
          <div style="border: 1px solid #ccc; padding: 10px; margin-top: 20px;">
            <strong>ACKNOWLEDGMENT</strong><br/>
            <em>Notary acknowledgment will be completed at signing.</em>
          </div>
        </div>
      </div>
    `;
  }, [grantDeed, step1Data]);

  async function generatePDF() {
    setIsGenerating(true);
    try {
      // Get authentication token
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Compose backend payload matching your FastAPI / Jinja templates
      const payload = {
        requested_by: grantDeed?.step2?.requestedBy,
        title_company: grantDeed?.step2?.titleCompany,
        escrow_no: grantDeed?.step2?.escrowNo,
        title_order_no: grantDeed?.step2?.titleOrderNo,
        return_to: grantDeed?.step2?.mailTo,
        apn: grantDeed?.step2?.apn || step1Data?.apn,
        dtt: {
          amount: grantDeed?.step3?.dttAmount,
          basis: grantDeed?.step3?.dttBasis,
          area_type: grantDeed?.step3?.areaType,
          city_name: grantDeed?.step3?.cityName
        },
        grantors_text: grantDeed?.step4?.grantorsText,
        grantees_text: grantDeed?.step4?.granteesText,
        county: grantDeed?.step4?.county,
        legal_description: grantDeed?.step4?.legalDescription,
        execution_date: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      };

      const res = await fetch("/api/generate/grant-deed-ca", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication expired. Please refresh the page and log in again.');
        }
        const text = await res.text();
        throw new Error(`PDF generation error: ${text}`);
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Grant_Deed_CA.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Document Preview</h2>
        <p className="text-gray-600">Review your grant deed before generating the final PDF</p>
      </div>

      <div className="rounded-2xl border p-6 bg-white shadow-sm">
        {/* eslint-disable-next-line react/no-danger */}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <button 
            onClick={() => onStepChange(2)} 
            className="px-4 py-2 rounded-xl border hover:bg-gray-50 transition-colors"
          >
            Edit Step 2
          </button>
          <button 
            onClick={() => onStepChange(3)} 
            className="px-4 py-2 rounded-xl border hover:bg-gray-50 transition-colors"
          >
            Edit Step 3
          </button>
          <button 
            onClick={() => onStepChange(4)} 
            className="px-4 py-2 rounded-xl border hover:bg-gray-50 transition-colors"
          >
            Edit Step 4
          </button>
        </div>
        <button 
          onClick={generatePDF} 
          disabled={isGenerating}
          className="px-5 py-2 rounded-xl border border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Generate PDF'}
        </button>
      </div>
    </div>
  );
}
