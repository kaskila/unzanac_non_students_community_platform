// Brand palette (docs/PLAN.md §3.3). These values must match the @theme tokens in src/app/globals.css;
// tests/unit/brand.test.ts checks both the match and the WCAG contrast of every pair we rely on.

export const PALETTE = {
  "azure-50": "#eef5fb",
  "azure-100": "#d9e8f5",
  "azure-300": "#86b3dc",
  "azure-500": "#5793c9", // brand Azure
  "azure-700": "#2f6fa8",
  "azure-900": "#1f4f7a",
  white: "#ffffff",
  ink: "#1a2433",
  muted: "#5b6675",
  line: "#e6edf4",
  success: "#1d6b40",
  warning: "#8a5300",
  danger: "#b42318",
} as const;

export type PaletteToken = keyof typeof PALETTE;

/** Foreground/background pairs used in the UI, with the minimum WCAG 2.2 AA ratio each must meet. */
export const CONTRAST_PAIRS: readonly {
  fg: PaletteToken;
  bg: PaletteToken;
  min: number;
  use: string;
}[] = [
  { fg: "ink", bg: "white", min: 4.5, use: "body text" },
  { fg: "ink", bg: "azure-50", min: 4.5, use: "body text on tinted sections" },
  { fg: "muted", bg: "white", min: 4.5, use: "secondary text" },
  { fg: "azure-700", bg: "white", min: 4.5, use: "links, small Azure text" },
  { fg: "azure-700", bg: "azure-50", min: 4.5, use: "links on tinted sections" },
  { fg: "white", bg: "azure-700", min: 4.5, use: "primary buttons" },
  { fg: "white", bg: "azure-900", min: 4.5, use: "pressed buttons" },
  { fg: "azure-900", bg: "white", min: 4.5, use: "headings" },
  { fg: "white", bg: "azure-500", min: 3, use: "large text (>= 24px) on the brand band" },
  { fg: "azure-500", bg: "white", min: 3, use: "focus ring, icons, large text" },
  { fg: "success", bg: "white", min: 4.5, use: "success messages" },
  { fg: "warning", bg: "white", min: 4.5, use: "warning messages" },
  { fg: "danger", bg: "white", min: 4.5, use: "error messages" },
];

function channelToLinear(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => channelToLinear(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
