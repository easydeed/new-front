
import { z } from "zod";
import { zBaseDeed } from "./shared";

// (Kept here for completeness so the registry is self-contained)
export const zGrantDeed = zBaseDeed.extend({
  docType: z.literal("grant-deed"),
  transferTaxDeclared: z.boolean().optional(),
});

export type GrantDeedInput = z.infer<typeof zGrantDeed>;
