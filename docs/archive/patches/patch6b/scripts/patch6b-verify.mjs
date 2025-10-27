
#!/usr/bin/env node
// Quick smoke test for Patch 6b
const { validateDeed } = require("../frontend/src/features/wizard/validation/zod");
const sample = {
  docType: "quitclaim_deed",
  propertyAddress: "1358 5th St, La Verne, CA 91750, USA",
  apn: "8381-021-001",
  county: "Los Angeles County",
  legalDescription: "LOT 1 OF TRACT 12345, IN THE CITY OF LA VERNE, LOS ANGELES COUNTY, CALIFORNIA.",
  grantorName: "JOHN DOE",
  granteeName: "JANE DOE",
  vesting: "Husband and Wife as Joint Tenants"
};
const res = validateDeed(sample, sample.docType);
if (res.success) {
  console.log("✅ Patch 6b smoke OK");
} else {
  console.error("❌ Patch 6b failed", res.errors);
  process.exit(1);
}
