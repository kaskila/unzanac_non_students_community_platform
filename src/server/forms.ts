import { z } from "zod";
import { parseLocalDateTime } from "@/lib/dates";
import { ServiceError } from "@/server/errors";

/**
 * Result of an admin form action. Error and field codes are keys under Admin.form.errors in
 * en.json; the form component (src/components/admin/action-form.tsx) shows them as a summary.
 */
export type FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** FormData → plain object of strings (checkboxes become "on" when ticked, absent otherwise). */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }
  return values;
}

// ── Zod building blocks for form fields ──

export const fields = {
  text: (max: number) => z.string().trim().max(max, "too_long"),
  required: (max: number) => z.string().trim().min(1, "required").max(max, "too_long"),
  optional: (max: number) =>
    z
      .string()
      .trim()
      .max(max, "too_long")
      .optional()
      .transform((v) => (v ? v : null)),
  checkbox: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  /** `datetime-local` in Lusaka time → Date. */
  dateTime: z.string().transform((v, ctx) => {
    const date = parseLocalDateTime(v);
    if (!date) ctx.addIssue({ code: "custom", message: v.trim() ? "invalid_date" : "required" });
    return date ?? new Date(NaN);
  }),
  optionalDateTime: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v?.trim()) return null;
      const date = parseLocalDateTime(v);
      if (!date) ctx.addIssue({ code: "custom", message: "invalid_date" });
      return date;
    }),
  optionalHttpsUrl: z
    .string()
    .trim()
    .max(500, "too_long")
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      if (!/^https:\/\/\S+$/.test(v)) ctx.addIssue({ code: "custom", message: "https" });
      return v;
    }),
};

/** Map a validation error to field codes, using the message set in the schemas above. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const name = issue.path.map(String).join(".") || "_form";
    if (result[name]) continue;
    const known = /^[a-z_]+$/.test(issue.message) ? issue.message : null;
    result[name] =
      known ??
      (issue.code === "too_small" ? "required" : issue.code === "too_big" ? "too_long" : "invalid");
  }
  return result;
}

/** Turn a thrown error into form state. Unexpected errors are logged and shown as "generic". */
export function toFormState(error: unknown): FormState {
  if (error instanceof z.ZodError) return { error: "check_fields", fieldErrors: fieldErrorsOf(error) };
  if (error instanceof ServiceError) return { error: error.code };
  console.error(error);
  return { error: "generic" };
}
