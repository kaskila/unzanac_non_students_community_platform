// Editable site content (docs/PLAN.md §5, "Site content"). Each key is one SiteContent row holding
// JSON validated by the schema below. Missing rows fall back to DEFAULTS, so the site works on a
// fresh database. Placeholders are marked so the Phase 0 content pack can replace them.

import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { CHANNEL_ID_PATTERN } from "@/lib/video-links";

/** The welcome section's defaults (from the congregation's design). */
const WELCOME = { messageTitle: "Welcome message", leaderRole: "Rector", leaderName: "Shephard Liswaniso" };

/** The church's spot, from the congregation's Google Maps link (maps.app.goo.gl/x1rju4fHfrWR29yJ9). */
export const CHURCH_COORDINATES = { lat: "-15.390551", lng: "28.327913" };

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
  // Home welcome section (under the photo slider): heading, the Rector's welcome message, and the
  // name card under the portrait. Defaults keep rows saved before these fields existed valid.
  hero: z.object({
    title: text(80).min(1),
    body: text(1500).min(1),
    messageTitle: text(40).min(1).default(WELCOME.messageTitle),
    leaderRole: text(40).min(1).default(WELCOME.leaderRole),
    leaderName: text(80).min(1).default(WELCOME.leaderName),
  }),
  location: z.object({
    name: text(100).min(1),
    address: text(200),
    mapUrl: optionalUrl,
    // Church finder map. Defaults keep rows saved before these fields existed valid.
    latitude: z
      .string()
      .trim()
      .default(CHURCH_COORDINATES.lat)
      .refine((v) => v === "" || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 90), "latitude"),
    longitude: z
      .string()
      .trim()
      .default(CHURCH_COORDINATES.lng)
      .refine((v) => v === "" || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 180), "longitude"),
  }),
  visit: z.object({ body: text(4000).min(1) }),
  about: z.object({ body: text(6000).min(1) }),
  contacts: z.object({ items: z.array(contact).max(8) }),
  social: z.object({
    youtube: optionalUrl,
    // Channel ID ("UC…") for importing new uploads; defaults keep rows saved before M2b valid.
    youtubeChannelId: z
      .string()
      .trim()
      .default("")
      .refine((v) => v === "" || CHANNEL_ID_PATTERN.test(v), "channel_id"),
    facebook: optionalUrl,
    whatsappChannel: optionalUrl, // WhatsApp group or channel invite link
    tiktok: optionalUrl.default(""),
  }),
  verse: z.object({ text: text(400), reference: text(60) }),
  terms: z.object({ body: text(8000).min(1) }),
} as const;

export type SiteContentKey = keyof typeof SITE_CONTENT_SCHEMAS;
export type SiteContent = { [K in SiteContentKey]: z.output<(typeof SITE_CONTENT_SCHEMAS)[K]> };
export const SITE_CONTENT_KEYS = Object.keys(SITE_CONTENT_SCHEMAS) as SiteContentKey[];

export function isSiteContentKey(value: unknown): value is SiteContentKey {
  return typeof value === "string" && value in SITE_CONTENT_SCHEMAS;
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  hero: {
    title: "Welcome to our congregation",
    body: [
      "Warm greetings in the name of our Lord Jesus Christ.",
      "",
      "Welcome to UNZA Congregation. Whether you are a student, member, or visitor, you are warmly welcomed into our fellowship.",
      "",
      "May our divine services and fellowship strengthen your faith, inspire love and unity, and prepare us for the return of Christ.",
      "",
      "May God bless you abundantly.",
    ].join("\n"),
    messageTitle: WELCOME.messageTitle,
    leaderRole: WELCOME.leaderRole,
    leaderName: WELCOME.leaderName,
  },
  location: {
    name: "UNZANAC church",
    address: "", // Phase 0 content pack: venue and directions
    mapUrl: "https://maps.app.goo.gl/x1rju4fHfrWR29yJ9",
    latitude: CHURCH_COORDINATES.lat,
    longitude: CHURCH_COORDINATES.lng,
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
  about: {
    body: [
      "UNZANAC is the UNZA congregation of the New Apostolic Church in Zambia. We meet near the University of Zambia, and our members include students, staff, families and neighbours.",
      "",
      "The New Apostolic Church is a Christian church with over nine million members in some 200 countries. It professes the Bible and the foundations of Christianity, is led by Apostles, and celebrates three sacraments: Holy Baptism, Holy Sealing and Holy Communion.",
      "",
      "Our congregation serves through nine committees, from the choir and orchestra to first aid and catering. [Meet the committees](/committees) or [plan your visit](/visit).",
    ].join("\n"),
  },
  contacts: { items: [] },
  social: {
    youtube: "https://www.youtube.com/@UNZANACMUSICDEPT",
    youtubeChannelId: "",
    facebook: "",
    whatsappChannel: "https://chat.whatsapp.com/JgRvaIKqk5C30pzl9ImhAE",
    tiktok: "",
  },
  verse: { text: "", reference: "" },
  terms: {
    // Starting text for church leadership to review (Admin → Site content → Terms of use).
    body: [
      "These terms apply to this website of the UNZA congregation of the New Apostolic Church in Zambia.",
      "",
      "**Using the website**",
      "- The site shares news, services, activities, videos and materials of the congregation. Please use it respectfully and only for lawful purposes.",
      "- Don't try to break into the admin area, overload the site or upload harmful files.",
      "",
      "**Content**",
      "- Texts, photos and videos belong to the congregation or to the New Apostolic Church. The church emblem belongs to the New Apostolic Church.",
      "- You may share links and download materials for personal and congregation use. Please ask before republishing them elsewhere.",
      "",
      "**Other websites**",
      "- Links to YouTube, Facebook, TikTok, WhatsApp and Google Maps open services with their own terms and privacy rules.",
      "",
      "**Your information**",
      "- How we handle personal information is explained in the [privacy notice](/privacy).",
      "",
      "**Changes and questions**",
      "- These terms may be updated from time to time. For questions, see the [contact page](/contact).",
    ].join("\n"),
  },
};

/** Parse stored JSON for a key; invalid or missing values fall back to the default. */
export function parseSiteContent<K extends SiteContentKey>(key: K, value: unknown): SiteContent[K] {
  const parsed = SITE_CONTENT_SCHEMAS[key].safeParse(value);
  return parsed.success ? (parsed.data as SiteContent[K]) : DEFAULT_SITE_CONTENT[key];
}
