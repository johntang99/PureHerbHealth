# Cursor Implementation Guide — BAAM E-Commerce TCM

> **For**: Cursor AI Agent
> **Project**: pureHerbHealth.com (TCM e-commerce store)
> **Location**: `medical-clinic/stores/pureherbhealth/`
> **Date**: 2026-03-11

---

## Read These Documents First

Before writing any code, read and understand these documents **in this order**:

1. **`BAAM_ECOMMERCE_MASTER_PLAN.md`** — The generic e-commerce architecture (Sections 10-17 for implementation, Section 29-36 for multi-store + i18n)
2. **`BAAM_ECOMMERCE_INDUSTRY_PLUS_TCM.md`** — TCM-specific extensions (product data model, AI knowledge, compliance, bilingual Section 17)
3. **`ECOM_TCM_STAGE_A.md`** — Design system, component inventory, brand, colors, typography
4. **`ECOM_TCM_I18N_ADDENDUM.md`** — Full bilingual (EN/ZH) specification

Then implement **one phase at a time**, reading the phase file before starting:

5. **`ECOM_TCM_PHASE_0.md`** → Start here
6. **`ECOM_TCM_PHASE_1.md`** → After Phase 0 is verified
7. **`ECOM_TCM_PHASE_2.md`** → After Phase 1
8. ... through **`ECOM_TCM_PHASE_7.md`**

---

## Critical Rules

### 1. One Phase at a Time
- Complete ALL checklist items in a phase before moving to the next
- Each phase has a **Build / Wire / Verify** checklist — follow it line by line
- Each phase has a **Done-Gate** — all criteria must pass before proceeding

### 2. Follow the Existing BAAM Pattern
The sibling project `medical-clinic/chinese-medicine/` is a working BAAM site. **Match its patterns**:
- Same Supabase client setup (`lib/supabase/client.ts`, `server.ts`)
- Same middleware pattern (`middleware.ts` — auth + locale detection)
- Same `[locale]` routing structure (`app/[locale]/...`)
- Same Tailwind + CSS custom properties approach
- Same admin panel structure (`app/admin/...`)
- Same component organization (`components/` folder structure)

**Reference it** when in doubt about Next.js 14 App Router patterns, Supabase integration, or i18n middleware.

### 3. Bilingual from Day One
- All customer-facing routes go under `app/[locale]/`
- All UI text comes from dictionary files (`dictionaries/en/*.json`, `dictionaries/zh/*.json`) — never hardcode strings
- All database tables with customer-facing text have `_zh` columns (already defined in Phase 0 schema)
- Use `getLocalized(item, field, locale)` helper for all DB-sourced text
- Include `LanguageSwitcher` component in the header from Phase 0

### 4. Contract-First
The phase docs define **TypeScript interfaces** for every API endpoint. Implement the exact interfaces specified — they are the contract between frontend and backend. Do not deviate unless there is a technical reason, and document why.

### 5. Store-Aware from Day One
Every query that touches products, orders, content, or customers must be **store-scoped**:
```typescript
// WRONG — fetches all products globally
const products = await supabase.from('products').select('*');

// RIGHT — fetches products for the current store
const products = await supabase
  .from('store_products')
  .select('*, product:products(*)')
  .eq('store_id', store.id)
  .eq('enabled', true);
```

The `store` context comes from middleware → request headers → consumed by server components and API routes.

### 6. Security Non-Negotiables
- **Stripe**: Use Stripe Elements / PaymentElement. Never handle raw card data.
- **RLS**: All Supabase tables have Row Level Security. The policies are defined in `007_rls_policies.sql`. Enable RLS on every table.
- **Input validation**: Use Zod schemas for all API request validation.
- **FDA disclaimers**: Must appear on every product page and in every AI response that recommends products.
- **AI safety**: AI chat output must be scanned for prohibited disease claims before sending to client.

### 7. File Naming & Structure
```
app/[locale]/(store)/         — All customer-facing pages
app/admin/                    — Admin panel (English only)
app/api/                      — API routes (no locale prefix)
components/{domain}/          — Grouped by domain (product, cart, tcm, ai, etc.)
lib/{service}/                — Service clients and helpers
dictionaries/{locale}/        — i18n JSON files
supabase/migrations/          — SQL migrations (numbered 001-007)
```

---

## Phase-by-Phase Implementation Notes

### Phase 0 — Infrastructure
- Run `npx create-next-app@14 pureherbhealth` with App Router, TypeScript, Tailwind, ESLint
- Port number: `3010` (configured in package.json scripts)
- Run all 7 SQL migrations in order against Supabase
- Set up the `updated_at` trigger function
- Seed: 2 stores, 5 parent categories + 20 subcategories, 10 sample products, store_products for Dr. Huang
- Middleware must handle: auth session, locale detection/redirect, store detection
- **Verify**: `npm run build` passes, `/en/` and `/zh/` both resolve, store context detected

### Phase 1 — Product Catalog
- Product listing uses server components for SEO
- FilterPanel is a client component (syncs filters to URL query params)
- TCM-specific components (FiveElementsIndicator, MeridianDiagram, TCMPropertyBadges) are unique to this project — no external library
- Full-text search: add `fts` tsvector column to products table
- AI search: calls Claude Haiku for natural language interpretation (can be stubbed initially)
- **Verify**: Browse products, filter by category/TCM properties, search works, PDP shows all sections

### Phase 2 — Cart & Checkout
- Cart: localStorage for guests, Supabase `carts` table for logged-in users
- Cart merge on login (guest → user)
- Stripe: PaymentElement (supports Card, Apple Pay, Google Pay automatically)
- Webhook handler: verify signature, update order, decrement inventory, send email
- Order numbers: `{store_prefix}-{YYYYMMDD}-{SEQ}` (e.g., PHH-20260311-001)
- Shipping rates: stub with static rates in Phase 2, real EasyPost integration in Phase 4
- **Verify**: Full purchase flow with Stripe test card `4242 4242 4242 4242`

### Phase 3 — AI Engine
- Use `@anthropic-ai/sdk` for Claude API
- Chat: streaming SSE responses via `POST /api/ai/chat`
- System prompt is dynamically constructed: base + store overrides + product catalog context
- AI responds in the same language the customer writes in
- Content generation: admin-only endpoints, output saved as drafts for review
- Constitution quiz: 15 questions, scoring algorithm in Phase doc
- **Verify**: Chat works in both EN/ZH, product descriptions generated, quiz returns results

### Phase 4 — Shipping & Inventory
- EasyPost: `npm install easypost` — single API for UPS/USPS/FedEx
- Rate shopping: fetch rates after address entry in checkout
- Label creation: admin action on order detail page
- Tracking webhook: EasyPost → `/api/webhooks/easypost` → update order
- Inventory: atomic `decrement_product_stock()` SQL function prevents overselling
- **Verify**: Real shipping rates appear, labels generate, tracking updates flow through

### Phase 5 — Multi-Store
- Stripe Connect: Standard accounts for clinic stores
- Revenue split via `application_fee_amount` on PaymentIntents
- Store onboarding wizard: 7-step form in admin
- White-label: CSS custom properties from `store.theme_config`, injected in `StoreLayout`
- Embedded shop: clinic site wraps shop components within its existing layout
- **Verify**: Dr. Huang store shows own branding, orders split revenue correctly

### Phase 6 — Content Commerce
- Markdown rendering with special embed syntax: `{{product:slug}}`, `{{cta:quiz}}`
- Herb profiles + condition guides pull from `content` table
- Bidirectional linking: content ↔ products
- Five Elements interactive page: pentagon diagram with clickable elements
- **Verify**: Blog posts show embedded product cards, herb profiles link to products

### Phase 7 — Growth & Launch
- Analytics dashboard: server components + lightweight charts
- Email automation: cron-triggered sequences via Resend
- Review system: verified purchase check, admin moderation
- Performance: ISR for category pages, dynamic imports for heavy components
- Pre-launch checklist: 38 items across 6 categories
- **Verify**: All pre-launch checklist items pass, production Stripe keys configured

---

## Key Dependencies & Versions

```json
{
  "next": "^14.2.0",
  "react": "^18.2.0",
  "@supabase/supabase-js": "^2.49.1",
  "@supabase/ssr": "^0.6.1",
  "stripe": "^17.5.0",
  "@stripe/react-stripe-js": "^2.9.0",
  "@stripe/stripe-js": "^4.12.0",
  "@anthropic-ai/sdk": "^0.39.0",
  "easypost": "^7.5.0",
  "resend": "^4.1.0",
  "zod": "^3.24.0",
  "lucide-react": "^0.312.0",
  "sharp": "^0.34.5",
  "clsx": "^2.1.0"
}
```

---

## Common Pitfalls to Avoid

1. **Don't skip RLS** — Every table needs Row Level Security enabled. Without it, any client can read/write anything.

2. **Don't hardcode English strings** — Use dictionaries from day one. It's 10x harder to retrofit i18n later.

3. **Don't build cart client-only** — Server-side cart (Supabase `carts` table) is needed for cart persistence, guest-to-user merge, and inventory reservation.

4. **Don't call Stripe from the client** — All Stripe operations (create PaymentIntent, process refund, etc.) happen server-side via API routes. Only the PaymentElement runs client-side.

5. **Don't forget store scoping** — Every product query, order query, and analytics query must filter by `store_id`. A platform admin dashboard aggregates across stores; store owners see only their own.

6. **Don't make disease claims in AI prompts** — The AI system prompt explicitly prohibits terms like "cure", "treat", "diagnose", "prevent" followed by disease names. This is an FDA compliance requirement.

7. **Don't translate URL slugs** — Slugs are always English (`/zh/shop/herbal-formulas/immune-boost-formula`). Chinese content displays on the page itself.

8. **Don't create separate projects per store** — All stores share one codebase and one database. Stores are differentiated by `store_id` in the database and `theme_config` for visual customization.

9. **Don't skip the verification step** — Each Build/Wire/Verify checklist item has a "Verify" column. Actually test it before moving on. A broken Phase 0 cascades into every later phase.

10. **Don't over-engineer early phases** — Phase 0 is infrastructure only (no UI). Phase 1 is product browsing only (no cart). Follow the phase boundaries. Features not in the current phase file should not be built yet.

---

## Quick Reference: Where Things Are Defined

| Need to know... | Look in... |
|-----------------|-----------|
| Database schema (all tables) | `ECOM_TCM_PHASE_0.md` Section 0.2 |
| API endpoint contracts | `ECOM_TCM_PHASE_1.md` (products), `PHASE_2.md` (cart/checkout), `PHASE_3.md` (AI) |
| Component list with props | `ECOM_TCM_STAGE_A.md` Section A4 |
| Color palette & typography | `ECOM_TCM_STAGE_A.md` Section A5 |
| i18n setup & dictionaries | `ECOM_TCM_I18N_ADDENDUM.md` |
| AI chat system prompt | `ECOM_TCM_STAGE_A.md` Section A7 + `PHASE_3.md` Section 3.1 |
| FDA compliance rules | `ECOM_TCM_STAGE_A.md` Section A8 + `INDUSTRY_PLUS_TCM.md` Section 5 |
| Stripe Connect flow | `ECOM_TCM_PHASE_5.md` Section 5.1 |
| EasyPost shipping | `ECOM_TCM_PHASE_4.md` Section 4.1 |
| Multi-store architecture | `MASTER_PLAN.md` Sections 29-35 |
| Store onboarding pipeline | `ECOM_TCM_PHASE_5.md` Section 5.2 |
| TCM product data model | `INDUSTRY_PLUS_TCM.md` Section 4 |
| Content embed syntax | `ECOM_TCM_PHASE_6.md` Section 6.5 |
| Email templates | `ECOM_TCM_PHASE_2.md` Section 2.7 + `PHASE_7.md` Section 7.2 |

---

## Start Command

```bash
cd medical-clinic/stores
# Read Phase 0 first, then:
npx create-next-app@14 pureherbhealth --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd pureherbhealth
# Follow ECOM_TCM_PHASE_0.md Build/Wire/Verify checklist
```

Good luck. Build one phase at a time. Verify before proceeding.

---

## Phase Completion Protocol

> **Who does what:** Cursor runs the automated checks by itself (70%). You personally run the smoke test in a browser (30%). Neither side can skip their part.

### How to Trigger It

After Cursor finishes implementing a phase, **you paste one line**:

```
Phase [N] is complete. Run the Phase Completion Protocol from CURSOR_IMPLEMENTATION_GUIDE.md now.
```

Cursor reads this guide, finds this section, and executes all automated checks autonomously. It will report back exactly what passed, what failed, and what it fixed. You then run the 5-minute browser smoke test for that phase.

That is the full loop. You do not need to debug anything yourself unless Cursor explicitly tells you it cannot fix something.

---

### Step 1 — Cursor Runs These Automatically

When you send the trigger prompt, Cursor executes the following in sequence without any further input from you:

**1.1 — Build & Type Check**
```bash
npm run build          # Must complete with zero errors
npx tsc --noEmit       # Must complete with zero TypeScript errors
npm run lint           # Must complete with zero ESLint errors
```
If any of these fail, Cursor reads the error output, fixes the code, and re-runs until they pass. It does not proceed to the next check until all three are green.

**1.2 — Store Scoping Audit**
```bash
# Flag any Supabase query missing store_id filter
grep -rn "\.from('products')\|\.from('orders')\|\.from('content')\|\.from('carts')" \
  app/ lib/ --include="*.ts" --include="*.tsx"
```
Cursor reviews every match and confirms each one either (a) filters by `store_id`, or (b) is an intentional platform-admin query with a comment explaining why.

**1.3 — Hardcoded String Audit**
```bash
# Flag any Chinese or English UI strings not in dictionaries
grep -rn "className.*>" app/\[locale\]/ --include="*.tsx" | grep -v "t\(\|getLocalized\|dictionary"
```
Cursor reviews matches and moves any hardcoded strings into the appropriate `dictionaries/en/*.json` and `dictionaries/zh/*.json` files.

**1.4 — RLS Verification**
```bash
# Check every table has RLS enabled (run against Supabase)
npx supabase db diff --schema public
```
Cursor checks the output against the table list in `ECOM_TCM_PHASE_0.md` Section 0.2 and confirms `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` exists for every table.

**1.5 — API Contract Verification**
Cursor writes and runs a quick test script (`scripts/verify-phase-N.ts`) that calls every new API endpoint added in this phase and confirms the response shape matches the TypeScript interface defined in the phase doc. Example:
```typescript
// Auto-generated by Cursor for Phase 1 verification
const res = await fetch('/api/products?store_slug=purehrb&limit=10')
const data = await res.json()
assert(Array.isArray(data.products))
assert(typeof data.products[0].name_zh === 'string')
assert(typeof data.products[0].tcm_nature === 'string')
console.log('✅ GET /api/products — contract matches')
```

**1.6 — Done-Gate Checklist**
Cursor opens `ECOM_TCM_PHASE_[N].md`, finds the Done-Gate section, and goes through every item line by line, marking each as ✅ Pass, ❌ Fail, or ⚠️ Partial. For any Fail or Partial, it fixes the issue before reporting.

**1.7 — Cursor's Report to You**
After all automated checks pass, Cursor outputs a structured report:

```
═══════════════════════════════════════════════
PHASE [N] — AUTOMATED VERIFICATION COMPLETE
═══════════════════════════════════════════════

✅ npm run build        — PASSED (0 errors)
✅ TypeScript           — PASSED (0 errors)
✅ ESLint               — PASSED (0 warnings)
✅ Store scoping        — PASSED (12 queries checked, all store-scoped)
✅ Hardcoded strings    — PASSED (0 found)
✅ RLS                  — PASSED (all 8 tables enabled)
✅ API contracts        — PASSED (5 endpoints verified)
✅ Done-Gate checklist  — PASSED (18/18 items)

FIXES APPLIED DURING VERIFICATION:
- Fixed: products query in /app/[locale]/shop/page.tsx missing store_id filter
- Fixed: "Add to Cart" string hardcoded in CartButton.tsx → moved to dictionaries

YOUR ACTION REQUIRED — Browser smoke test (see Phase [N] row below):
→ [exact instructions for what to open and click]

KNOWN LIMITATIONS (not auto-verifiable):
- Visual match to CHECKOUT_PROTOTYPE.html — requires your eyes
- Stripe test payment flow — requires browser + test card
- Bilingual font rendering — requires browser
═══════════════════════════════════════════════
```

---

### Step 2 — You Run the Browser Smoke Test (5 minutes)

After Cursor's report, open `http://localhost:3010` and run the test for the phase you just completed. This is the 30% that requires human eyes.

| Phase | Open this URL | Do this | What to check |
|-------|--------------|---------|---------------|
| **0** | `/en/` and `/zh/` | Load both pages | Correct locale detected, no 404, store context shown in console |
| **1** | `/en/shop` | Browse → filter by Five Elements → click a product | Filter chips appear, TCM Properties block on PDP matches `CATALOG_PDP_PROTOTYPE.html` |
| **1** | `/en/shop?q=herbs+for+sleep` | Search with natural language | AI Interpretation card appears above results with TCM pattern identified |
| **2** | `/en/shop` → Add to cart → Checkout | Enter `4242 4242 4242 4242`, place order | Confirmation shows order `PHH-YYYYMMDD-NNN`, check Supabase `orders` table for the row |
| **2** | `/en/account` | Log in, browse all 5 tabs | Dashboard, Orders, TCM Profile, Wishlist, Settings all load correctly |
| **3** | `/en/quiz` | Complete all 15 questions | Results page shows constitution type with product recommendations and FDA disclaimer |
| **3** | Open AI chat widget | Type "I feel tired and cold all the time" | Response includes a product recommendation AND FDA disclaimer. No disease cure/treat claims. |
| **4** | Admin → Orders → any order | Click "Generate Shipping Label" | Real carrier rates appear. Label generates (or test error appears gracefully). |
| **5** | `/zh/shop` with Dr. Huang store | View any product, add to cart, checkout | Colors show `#166534` jade, invoice shows "Dr. Huang's Wellness Store" |
| **6** | `/en/learn` → click any article | Read through the article | Inline product cards appear, herb profile cards show element-colored headers |
| **6** | `/en/learn/herbs/astragalus` | Scroll through the full profile | TCM properties table complete (7 rows), formulas sidebar shows 3 products |
| **7** | `/admin/analytics` | View platform dashboard | Revenue, orders, AOV data shows for test orders placed in earlier phases |

**Bilingual check (every phase):** Click the EN/ZH toggle. All UI text, product names, and TCM terms must switch. Pinyin must remain visible on PDP. Run this check on at least 3 pages per phase.

**Prototype comparison (phases 1, 2, 3, 6):** Open the relevant prototype HTML file side by side with the running site. Compare 3 key screens. Note any visual deviations in `FIXES.md`.

---

### Step 3 — Log Issues to FIXES.md

During your smoke test, do not stop to fix things. Log them instead. Cursor will work through `FIXES.md` at the end of the phase before you start the next one.

Create `FIXES.md` in the project root on Phase 0 and keep it open throughout the project:

```markdown
# FIXES.md — pureHerbHealth Implementation Issues

## Phase 1
- [ ] Product card: ZH name overflows card at 320px width
- [ ] Five Elements filter: Earth chip color is #D4B96A instead of #D4A843 (theme.json)
- [ ] PDP: TCM Properties block missing Meridians row

## Phase 2
- [ ] Checkout step indicator: connecting line between steps not animating
- [ ] Order confirmation: practitioner avatar shows broken image

## Phase 3
- (add during smoke test)
```

After your smoke test, tell Cursor:
```
Review FIXES.md for Phase [N] and resolve all items. Confirm each fix with a ✅.
```

Cursor works through the list, fixes each item, and marks it done. You re-check those specific items. When `FIXES.md` for Phase N is all ✅, start Phase N+1.

---

### Step 4 — Phase is Done When

A phase is **officially complete** and you may start the next one when ALL of the following are true:

```
☐ Cursor's automated report shows all ✅ (no ❌ or ⚠️)
☐ npm run build passes
☐ npx tsc --noEmit passes
☐ You completed the browser smoke test for this phase
☐ Bilingual EN/ZH toggle tested on 3+ pages
☐ FIXES.md for this phase is all ✅
☐ Phase prototype comparison done (phases 1, 2, 3, 6 only)
```

If any box is unchecked, the phase is not done. Do not start the next phase.

---

### Problem Triage — Stop vs. Continue

When Cursor's report or your smoke test reveals a problem, use this decision:

| Problem type | Decision | Action |
|---|---|---|
| `npm run build` fails | 🔴 **Stop** | Cursor fixes before anything else |
| TypeScript errors | 🔴 **Stop** | Cursor fixes before anything else |
| Wrong DB schema / missing column | 🔴 **Stop** | Write a new migration, re-run |
| Missing store_id on a query | 🔴 **Stop** | Fix now — every phase inherits this |
| RLS not enabled on a table | 🔴 **Stop** | Security issue — fix now |
| Stripe called from client side | 🔴 **Stop** | Fix now — PCI violation |
| Wrong API response shape | 🔴 **Stop** | Frontend and backend out of sync |
| Visual deviation from prototype | 🟡 **Log it** | Add to FIXES.md, fix before next phase |
| Missing edge case in UI | 🟡 **Log it** | Add to FIXES.md |
| Wrong color / spacing | 🟡 **Log it** | Add to FIXES.md |
| Missing Polish / animation | 🟢 **Defer** | Phase 7 or post-launch |
| Performance not optimized | 🟢 **Defer** | Phase 7 handles this |

**The rule:** Anything that will make the next phase build on a broken foundation = stop immediately. Anything visual or cosmetic = log it and keep moving.

---

### Quick-Reference: The 4 Commands You Run

As the human in this workflow, you only ever need to run these 4 things:

```
# 1. After Cursor finishes a phase — paste to Cursor:
"Phase [N] is complete. Run the Phase Completion Protocol from CURSOR_IMPLEMENTATION_GUIDE.md now."

# 2. After Cursor's report — open browser and smoke test the phase (5 min)

# 3. After smoke test — paste to Cursor:
"Review FIXES.md for Phase [N] and resolve all items."

# 4. When FIXES.md is clear — paste to Cursor:
"Phase [N] is verified. Read ECOM_TCM_PHASE_[N+1].md and begin implementation."
```

That is the entire human workflow. Cursor does the rest.
