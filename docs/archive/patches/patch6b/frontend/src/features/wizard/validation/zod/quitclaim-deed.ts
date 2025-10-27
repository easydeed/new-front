
import { z } from "zod";
import { zBaseDeed } from "./shared";

export const zQuitclaimDeed = zBaseDeed.extend({
  docType: z.literal("quitclaim-deed"),
  quitclaimStatement: z.string().trim().optional().nullable(),
});

export type QuitclaimDeedInput = z.infer<typeof zQuitclaimDeed>;
