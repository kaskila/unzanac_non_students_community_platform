// Zambian phone numbers in E.164 (+260 and 9 digits). Covers what admins type for contacts:
// "0971 234 567", "+260 97 1234567", "260971234567". Foreign numbers must start with "+".
// The register (M3) will move to libphonenumber-js for full validation.

export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(digits)) return null;

  if (/^0\d{9}$/.test(digits)) return `+260${digits.slice(1)}`;
  if (/^260\d{9}$/.test(digits)) return `+${digits}`;
  if (/^\+260\d{9}$/.test(digits)) return digits;
  if (/^\+(?!260)[1-9]\d{6,14}$/.test(digits)) return digits;
  return null;
}

/** "+260971234567" → "+260 97 123 4567"; other numbers are returned unchanged. */
export function formatPhone(e164: string): string {
  const m = /^\+260(\d{2})(\d{3})(\d{4})$/.exec(e164);
  return m ? `+260 ${m[1]} ${m[2]} ${m[3]}` : e164;
}
