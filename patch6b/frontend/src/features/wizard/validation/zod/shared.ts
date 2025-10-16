
import { z } from "zod";

export const DOC_SLUGS = [
  "grant-deed",
  "quitclaim-deed",
  "interspousal-transfer",
  "warranty-deed",
  "tax-deed"
] as const;

export type DocSlug = typeof DOC_SLUGS[number];

// ---- Common primitives ----
export const zAPN = z.string().trim().min(1, "APN is required");
export const zCounty = z.string().trim().min(2, "County is required");
export const zLegalDescription = z.string().trim().min(10, "Legal description is required");
export const zPersonName = z.string().trim().min(2, "Name is required");
export const zAddress = z.string().trim().min(5, "Property address is required");
export const zMoney = z.union([z.string().trim(), z.number()]).optional().nullable();

// Normalize any doc type variant to a canonical slug
export function normalizeDocType(input?: string): DocSlug {
  const s = String(input || "").toLowerCase().replace(/_/g, "-").trim();
  if (s === "grant_deed" || s === "grant deed") return "grant-deed";
  if (s === "quitclaim" || s === "quit-claim" || s === "quitclaim-deed") return "quitclaim-deed";
  if (s.includes("interspousal")) return "interspousal-transfer";
  if (s.includes("warranty")) return "warranty-deed";
  if (s.includes("tax")) return "tax-deed";
  // Fallback to grant-deed to avoid runtime breaks; upstream should never rely on this fallback
  return "grant-deed";
}

// Base: shared across all deed types
export const zBaseDeed = z.object({
  docType: z.enum(DOC_SLUGS),
  propertyAddress: zAddress,
  apn: zAPN,
  county: zCounty,
  legalDescription: zLegalDescription,
  // Parties (dual path: top-level or nested under parties.*.name)
  grantorName: z.string().trim().optional().nullable(),
  granteeName: z.string().trim().optional().nullable(),
  parties: z.object({
    grantor: z.object({ name: zPersonName }).partial().optional(),
    grantee: z.object({ name: zPersonName }).partial().optional(),
  }).partial().optional(),
  vesting: z.string().trim().optional().nullable(),
  consideration: zMoney,
  effectiveDate: z.coerce.date().optional().nullable(),
  preparedBy: z.string().trim().optional().nullable(),
  requestedBy: z.string().trim().optional().nullable(),
  returnTo: z.string().trim().optional().nullable(),
}).superRefine((val, ctx) => {
  // Require grantor and grantee for all 5 deed types (matches backend expectations)
  const g1 = (val.grantorName || "").trim();
  const g2 = (val.parties?.grantor?.name || "").trim();
  const r1 = (val.granteeName || "").trim();
  const r2 = (val.parties?.grantee?.name || "").trim();
  if (!g1 && !g2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["grantorName"], message: "Grantor name is required" });
  }
  if (!r1 && !r2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["granteeName"], message: "Grantee name is required" });
  }
});
