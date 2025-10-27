
import { useMemo } from "react";
import { validateDeed, getDeedSchemaFor } from "./zod";

export function useDeedValidator(docType?: string) {
  const schema = useMemo(() => getDeedSchemaFor(docType), [docType]);
  return {
    get schema() { return schema; },
    validate: (data: any) => validateDeed(data, docType),
  };
}
