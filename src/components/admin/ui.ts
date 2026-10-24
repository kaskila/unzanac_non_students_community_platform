// Shared admin styles. Built from brand tokens only (docs/PLAN.md §3.3).

export const ui = {
  card: "rounded-lg border border-line bg-white p-5",
  h1: "text-2xl font-bold text-azure-900",
  h2: "text-lg font-bold text-azure-900",
  label: "block font-semibold",
  input:
    "mt-1 block min-h-11 w-full rounded-md border border-muted bg-white px-3 text-ink focus-visible:border-azure-700",
  primary:
    "inline-flex min-h-11 items-center justify-center rounded-lg bg-azure-700 px-5 font-semibold text-white no-underline hover:bg-azure-900 disabled:opacity-60",
  secondary:
    "inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-azure-700 bg-white px-4 font-semibold text-azure-700 no-underline hover:bg-azure-50 disabled:opacity-60",
  danger:
    "inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-danger bg-white px-4 font-semibold text-danger hover:bg-azure-50 disabled:opacity-60",
  error: "rounded-md border-l-4 border-danger bg-azure-50 p-3 text-danger",
  success: "rounded-md border-l-4 border-success bg-azure-50 p-3 text-success",
  muted: "text-muted",
} as const;
