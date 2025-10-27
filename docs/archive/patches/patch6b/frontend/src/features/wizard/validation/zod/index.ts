
import type { ZodSchema } from "zod";
import { normalizeDocType, type DocSlug } from "./shared";
import { zGrantDeed } from "./grant-deed";
import { zQuitclaimDeed } from "./quitclaim-deed";
import { zInterspousalTransfer } from "./interspousal-transfer";
import { zWarrantyDeed } from "./warranty-deed";
import { zTaxDeed } from "./tax-deed";

export const zDeedBySlug: Record<DocSlug, ZodSchema<any>> = {
  "grant-deed": zGrantDeed,
  "quitclaim-deed": zQuitclaimDeed,
  "interspousal-transfer": zInterspousalTransfer,
  "warranty-deed": zWarrantyDeed,
  "tax-deed": zTaxDeed,
};

export function getDeedSchemaFor(input?: string) {
  return zDeedBySlug[normalizeDocType(input)];
}

export type FormError = { path: string; message: string };

export function toFormErrors(e: any): FormError[] {
  if (!e?.issues) return [{ path: "_", message: "Unknown validation error" }];
  return e.issues.map((i: any) => ({ path: (i.path || ["_"]).join("."), message: i.message || "Invalid value" }));
}

export function validateDeed(input: any, docType?: string) {
  const schema = getDeedSchemaFor(docType || input?.docType);
  try {
    const data = schema.parse({ ...input, docType: schema.shape.docType.value });
    return { success: true as const, data };
  } catch (err: any) {
    return { success: false as const, errors: toFormErrors(err) };
  }
}
