import Ajv from "ajv/dist/2020";
import { profileSchema, type Profile } from "@folial/schema";

// Our contract is JSON Schema draft 2020-12, hence ajv/dist/2020
// (plain "ajv" defaults to draft-07 and rejects $defs).
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(profileSchema);

export function getProfileErrors(data: unknown): string[] {
  const ok = validate(data);
  if (ok) return [];
  return (validate.errors ?? []).map(
    (e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`,
  );
}

export function isValidProfile(data: unknown): data is Profile {
  return validate(data);
}