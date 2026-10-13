import { getRequestConfig } from "next-intl/server";

// English only in Phase 1. Bemba (bem) and Nyanja (nya) message files are added in Phase 3.
export const DEFAULT_LOCALE = "en";

export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  timeZone: "Africa/Lusaka",
  messages: (await import(`../messages/${DEFAULT_LOCALE}.json`)).default,
}));
