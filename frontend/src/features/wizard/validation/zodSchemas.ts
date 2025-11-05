// frontend/src/features/wizard/validation/zodSchemas.ts
// Runtime schemas for Modern wizard validation (Grant Deed included; extend for others).
import { z } from 'zod';

// Reusable helpers
const NonEmptyString = z.string().trim().min(1, 'Required');
const OptionalString = z.string().trim().optional().or(z.literal('')).transform(v => (v === '' ? undefined : v));
const PositiveNumber = z.number({ invalid_type_error: 'Must be a number' }).nonnegative();

const PropertySchema = z.object({
  address: NonEmptyString.describe('Property address'),
  apn: NonEmptyString.describe('Assessor parcel number (APN)'),
  county: NonEmptyString.describe('County'),
  legalDescription: NonEmptyString.describe('Legal description'),
});

const PartiesSchema = z.object({
  grantor: z.object({ name: NonEmptyString.describe('Grantor name') }),
  grantee: z.object({ name: NonEmptyString.describe('Grantee name') }),
});

const VestingSchema = z.object({
  description: OptionalString.describe('Vesting description').nullable().optional(),
});

const RequestDetailsSchema = z.object({
  requestedBy: OptionalString.describe('Requested by'),
  titleCompany: OptionalString.describe('Title company'),
  escrowNo: OptionalString.describe('Escrow number'),
  titleOrderNo: OptionalString.describe('Title order number'),
}).partial().optional();

const MailToSchema = z
  .object({
    name: OptionalString,
    address1: OptionalString,
    address2: OptionalString,
    city: OptionalString,
    state: OptionalString,
    zip: OptionalString,
  })
  .partial()
  .optional();

const TransferTaxSchema = z
  .object({
    transferValue: z.union([PositiveNumber, z.null()]).optional(), // Property transfer value
    amount: z.union([PositiveNumber, z.undefined()]).optional(), // Auto-calculated DTT amount
    dttBasis: z.enum(['full_value', 'less_liens']).describe('Tax computation basis'),
    areaType: z.enum(['unincorporated', 'city']).describe('Property location type'),
    cityName: OptionalString, // Required if areaType is 'city'
    isExempt: z.boolean().optional(), // DTT exemption flag
    exemptionReason: OptionalString, // Required if isExempt is true
  })
  .refine(
    (data) => {
      // If exempt, exemptionReason is required
      if (data.isExempt && !data.exemptionReason) {
        return false;
      }
      return true;
    },
    {
      message: 'Exemption reason is required when transfer is exempt',
      path: ['exemptionReason'],
    }
  )
  .refine(
    (data) => {
      // If not exempt, transferValue is required
      if (!data.isExempt && (data.transferValue === null || data.transferValue === undefined)) {
        return false;
      }
      return true;
    },
    {
      message: 'Transfer value is required when not exempt',
      path: ['transferValue'],
    }
  )
  .refine(
    (data) => {
      // If areaType is 'city', cityName is required
      if (data.areaType === 'city' && !data.cityName) {
        return false;
      }
      return true;
    },
    {
      message: 'City name is required when location is a city',
      path: ['cityName'],
    }
  )
  .optional();

export const GrantDeedSchema = z.object({
  docType: z.union([z.literal('grant-deed'), z.literal('grant_deed')]).describe('Doc type'),
  property: PropertySchema,
  parties: PartiesSchema,
  vesting: VestingSchema,
  requestDetails: RequestDetailsSchema,
  mailTo: MailToSchema,
  transferTax: TransferTaxSchema,
});

export type CanonicalGrantDeed = z.infer<typeof GrantDeedSchema>;

export const SchemasByDocType: Record<string, z.ZodSchema<any>> = {
  'grant-deed': GrantDeedSchema,
  'grant_deed': GrantDeedSchema,
  // Add more doc types here (quitclaim, interspousal, warranty, tax) mirroring backend rules
};

export function validateCanonical(docType: string, payload: any) {
  const schema = SchemasByDocType[docType];
  if (!schema) {
    return { ok: true, warnings: [`No schema registered for docType "${docType}". Validation skipped.`] as string[] };
  }
  const result = schema.safeParse(payload);
  if (result.success) {
    return { ok: true, data: result.data as any };
  }
  const errors = result.error.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
    code: 'VALIDATION_ERROR' as const,
  }));
  return { ok: false, errors };
}
