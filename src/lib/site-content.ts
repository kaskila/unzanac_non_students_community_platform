// Editable site content (docs/PLAN.md §5, "Site content"). Each key is one SiteContent row holding
// JSON validated by the schema below. Missing rows fall back to DEFAULTS, so the site works on a
// fresh database. Placeholders are marked so the Phase 0 content pack can replace them.

import { z } from "zod";
import { normalizePhone } from "@/lib/phone";

const text = (max: number) => z.string().trim().max(max);
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "https");

const contact = z.object({
  role: text(60).min(1),
  name: text(80).min(1),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const phone = normalizePhone(v);
      if (!phone) ctx.addIssue({ code: "custom", message: "phone" });
      return phone ?? "";
    }),
  whatsapp: z.boolean(),
});

export const SITE_CONTENT_SCHEMAS = {
  hero: z.object({ title: text(80).min(1), body: text(300).min(1) }),
  location: z.object({ name: text(100).min(1), address: text(200), mapUrl: optionalUrl }),
  visit: z.object({ body: text(4000).min(1) }),
  contacts: z.object({ items: z.array(contact).max(8) }),
  social: z.object({ youtube: optionalUrl, facebook: optionalUrl, whatsappChannel: optionalUrl }),
  verse: z.object({ text: text(400), reference: text(60) }),
} as const;

export type SiteContentKey = keyof typeof SITE_CONTENT_SCHEMAS;
export type SiteContent = { [K in SiteContentKey]: z.output<(typeof SITE_CONTENT_SCHEMAS)[K]> };
export const SITE_CONTENT_KEYS = Object.keys(SITE_CONTENT_SCHEMAS) as SiteContentKey[];

export function isSiteContentKey(value: unknown): value is SiteContentKey {
  return typeof value === "string" && value in SITE_CONTENT_SCHEMAS;
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  hero: {
    title: "Welcome to UNZANAC",
    body: "Whether you live, work or study near UNZA, or are visiting for the first time, you belong here.",
  },
  location: {
    name: "UNZANAC church",
    address: "", // Phase 0 content pack: venue and directions
    mapUrl: "",
  },
  visit: {
    body: [
      "Everyone is welcome at our divine services, whether you are New Apostolic or visiting for the first time.",
      "",
      "**What to expect**",
      "- A divine service with a sermon, hymns from the choir and Holy Communion",
      "- Services last about an hour and a half",
      "- Come as you are; you don't need to know anyone",
      "",
      "Ask any minister or usher after the service if you have questions.",
    ].join("\n"),
  },
  contacts: { items: [] },
  social: { youtube: "https://www.youtube.com/@UNZANACMUSICDEPT", facebook: "", whatsappChannel: "" },
  verse: { text: "", reference: "" },
};

/** Parse stored JSON for a key; invalid or missing values fall back to the default. */
export function parseSiteContent<K extends SiteContentKey>(key: K, value: unknown): SiteContent[K] {
  const parsed = SITE_CONTENT_SCHEMAS[key].safeParse(value);
  return parsed.success ? (parsed.data as SiteContent[K]) : DEFAULT_SITE_CONTENT[key];
}
