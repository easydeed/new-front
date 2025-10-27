
import { z } from "zod";
import { zBaseDeed } from "./shared";

export const zTaxDeed = zBaseDeed.extend({
  docType: z.literal("tax-deed"),
  saleType: z.enum(["tax-defaulted-sale", "treasurer-tax-collector"]).optional(),
  saleDate: z.coerce.date().optional().nullable(),
});

export type TaxDeedInput = z.infer<typeof zTaxDeed>;
