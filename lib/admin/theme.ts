/**
 * Admin UI theme tokens
 * Edit this file to change the look of the entire admin panel.
 */

export const adminTheme = {
  // ── Layout backgrounds ──────────────────────────────────────────
  sidebar:       "#0c0f16",
  topbar:        "#ffffff",
  content:       "#f4f6f8",

  // ── Card / surface ───────────────────────────────────────────────
  card:          "bg-white border border-gray-200 shadow-sm",
  cardHover:     "hover:shadow-md hover:border-[#2D8C54]/40",

  // ── Typography ───────────────────────────────────────────────────
  heading:       "text-gray-900",          // page titles, card values
  body:          "text-gray-700",          // normal body text
  label:         "text-gray-600",          // section labels, table headers
  muted:         "text-gray-400",          // timestamps, helper text
  labelClass:    "text-[11px] font-semibold uppercase tracking-wide text-gray-600",

  // ── Form inputs ──────────────────────────────────────────────────
  input:         "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#2D8C54] focus:outline-none focus:ring-1 focus:ring-[#2D8C54]/20",

  // ── Tables ───────────────────────────────────────────────────────
  tableHeader:   "text-[11px] font-semibold uppercase tracking-wide text-gray-600",
  tableRow:      "border-b border-gray-100 transition hover:bg-gray-50",
  tableMuted:    "text-gray-500",

  // ── Status badges ────────────────────────────────────────────────
  badge: {
    active:      "bg-green-50 text-green-700 ring-1 ring-green-200",
    inactive:    "bg-red-50 text-red-600 ring-1 ring-red-200",
    pending:     "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
    connected:   "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    shipped:     "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    delivered:   "bg-green-50 text-green-700 ring-1 ring-green-200",
    cancelled:   "bg-red-50 text-red-600 ring-1 ring-red-200",
    processing:  "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    completed:   "bg-green-50 text-green-700 ring-1 ring-green-200",
    failed:      "bg-red-50 text-red-600 ring-1 ring-red-200",
  },

  // ── Buttons ──────────────────────────────────────────────────────
  btnPrimary:    "rounded-lg bg-[#2D8C54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#247043] disabled:cursor-not-allowed disabled:opacity-60",
  btnOutline:    "rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-900",
  btnOutlineGreen: "rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-[#2D8C54] hover:text-[#2D8C54]",

  // ── Alert / feedback ─────────────────────────────────────────────
  alertError:    "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600",
  alertSuccess:  "rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700",
  alertLoading:  "rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-400 shadow-sm",

  // ── Section label (e.g. "QUICK ACCESS", "TOP PRODUCTS") ──────────
  sectionLabel:  "text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500",

  // ── Stat card ────────────────────────────────────────────────────
  statLabel:     "text-[11px] font-semibold uppercase tracking-wide text-gray-600",
  statValue:     "mt-0.5 text-2xl font-bold text-gray-900",
  statValueSm:   "mt-0.5 text-xl font-bold text-gray-900",
} as const;
