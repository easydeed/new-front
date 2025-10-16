
import { z } from "zod";
import { zBaseDeed } from "./shared";

export const zWarrantyDeed = zBaseDeed.extend({
  docType: z.literal("warranty-deed"),
  warrantyType: z.enum(["general", "special"]).default("general").optional(),
});

export type WarrantyDeedInput = z.infer<typeof zWarrantyDeed>;
