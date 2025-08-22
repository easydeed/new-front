import { z } from "zod";

export const Step2Schema = z.object({
  requestedBy: z.string().optional(),
  titleCompany: z.string().optional(),
  escrowNo: z.string().optional(),
  titleOrderNo: z.string().optional(),
  apn: z.string().min(1, "APN required"),
  usePIQForMailTo: z.boolean().optional(),
  mailTo: z.object({
    name: z.string().optional(),
    company: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  })
});

export const Step3Schema = z.object({
  dttAmount: z.string().optional(),
  dttBasis: z.enum(["full_value", "less_liens"]),
  areaType: z.enum(["unincorporated", "city"]),
  cityName: z.string().optional()
}).refine(s => s.areaType === "unincorporated" || !!s.cityName, {
  message: "City name is required when area is City",
  path: ["cityName"]
});

export const Step4Schema = z.object({
  grantorsText: z.string().min(1, "Grantor(s) required"),
  granteesText: z.string().min(1, "Grantee(s) required"),
  county: z.string().min(1, "County required"),
  legalDescription: z.string().min(1, "Legal description required"),
});
