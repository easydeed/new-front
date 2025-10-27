
import { z } from "zod";
import { zBaseDeed, zPersonName } from "./shared";

export const zInterspousalTransfer = zBaseDeed.extend({
  docType: z.literal("interspousal-transfer"),
  relationship: z.enum(["spouses", "domestic_partners"]).optional(),
  spouseA: zPersonName.optional(),
  spouseB: zPersonName.optional(),
  r_and_t_code: z.string().trim().optional().nullable(), // CA R&T code reference
}).superRefine((val, ctx) => {
  // If spouse fields are provided, ensure both exist
  const a = (val as any).spouseA;
  const b = (val as any).spouseB;
  if ((a && !b) || (!a && b)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["spouseB"], message: "Provide both spouse names" });
  }
});

export type InterspousalTransferInput = z.infer<typeof zInterspousalTransfer>;
