// Cache tags for public content. Public reads (src/server/public.ts) tag their results; admin
// actions call updateTag() with the same tag after a change, so public pages refresh at once.
export const TAGS = {
  site: "site-content",
  privacy: "privacy-notice",
  committees: "committees",
  announcements: "announcements",
  events: "events",
} as const;
