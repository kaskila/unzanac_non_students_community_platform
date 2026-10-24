import { getRequestConfig } from "next-intl/server";

// English only in Phase 1. Bemba (bem) and Nyanja (nya) message files are added in Phase 3.
export const DEFAULT_LOCALE = "en";

// Zambian English conventions for dates and numbers: "13 Oct 2026, 5:25 pm", "K 1,234.50".
const FORMAT_LOCALE = "en-ZM";

export default getRequestConfig(async () => ({
  locale: FORMAT_LOCALE,
  timeZone: "Africa/Lusaka",
  messages: (await import(`../messages/${DEFAULT_LOCALE}.json`)).default,
}));
