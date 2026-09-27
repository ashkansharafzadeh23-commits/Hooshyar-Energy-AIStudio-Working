# UI-3 Role-Based Dashboard & Home Experience Report
**Hooshyar Energy — Iranian Solar Lifecycle Platform**  
**Phase:** UI-3 Implementation & Verification  
**Date:** September 2026  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary & Design Philosophy

The authenticated home experience of Hooshyar Energy was redesigned to replace static, monolithic, and crowded layouts with a clean, role-aware, and action-oriented dashboard. Guided by the core product principle:

> **«Complexity belongs in the system. Clarity belongs in the interface.»**  
> **«Data truth is more important than visual fullness.»**

The dashboard answers three fundamental questions for any authenticated user upon arrival:
1. **What requires my attention?** (`AttentionCenter`)
2. **What should I do next?** (`NextActions`)
3. **What projects and assets are relevant to me?** (`ActiveProjects` & `OperationalAssets`)

---

## 2. Information Architecture & Layout Hierarchy

The UI-3 dashboard organizes content in a strict priority order:
**Header (Context & Greeting) → Attention (Urgent Items) → Next Actions (Deterministic Steps) → Active Projects → Operational Assets → Role Summary → Recent Activity (or Onboarding for new users)**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DashboardHeader                                              │
│    - Persian Greeting: «سلام، <کاربر>»                          │
│    - Prompt: «امروز چه چیزی نیاز به توجه شما دارد؟»               │
│    - Subtle Verified Org & Active Role Badge                     │
│    - Role-Specific Primary CTA                                  │
├─────────────────────────────────────────────────────────────────┤
│ 2. AttentionCenter                                              │
│    - Highest-priority section: «نیازمند توجه شما»                │
│    - REAL actionable conditions only (bids, contracts, alerts)  │
│    - Clean empty state when stable («مورد فوری وجود ندارد»)      │
├─────────────────────────────────────────────────────────────────┤
│ 3. NextActions                                                  │
│    - Deterministic lifecycle recommendations (Max 3 actions)    │
│    - Project / Asset context, reason, and >=44px CTA button     │
├─────────────────────────────────────────────────────────────────┤
│ 4. ActiveProjects                                               │
│    - Compact cards with code, lifecycle phase, status, capacity │
│    - No fabricated progress percentages                         │
├─────────────────────────────────────────────────────────────────┤
│ 5. OperationalAssets (Gated)                                    │
│    - Renders ONLY when operational assets exist                 │
│    - Verified telemetry vs «پایش برخط فعال نیست»                │
│    - DataTruthBadge provenance labeling                         │
├─────────────────────────────────────────────────────────────────┤
│ 6. RoleSummary                                                  │
│    - Role-specific indicators (Max 4 verified metrics)          │
│    - Never invents zero unless zero is verified                 │
├─────────────────────────────────────────────────────────────────┤
│ 7. RecentActivity / NewUserOnboarding                           │
│    - Real audit trail with Jalali timestamps                    │
│    - Tailored onboarding guide for 0-project users              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure & Components Created

All components were created inside a dedicated module directory: `src/components/dashboard/`:

| Component File | Role / Purpose |
| :--- | :--- |
| `src/components/dashboard/types.ts` | Shared TypeScript interfaces for Attention, NextAction, Metric, and Activity |
| `src/components/dashboard/DashboardHeader.tsx` | Persian greeting, subtitle, verified org, active role, and role quick CTA |
| `src/components/dashboard/AttentionCenter.tsx` | Actionable attention cards (URGENT, WARNING, INFO) or stable state card |
| `src/components/dashboard/NextActions.tsx` | Max 3 deterministic actions based on lifecycle rules |
| `src/components/dashboard/DashboardProjectCard.tsx` | Compact project card showing lifecycle step, capacity, budget, and next step |
| `src/components/dashboard/ActiveProjects.tsx` | Section container for projects with count badge and link to `/projects` |
| `src/components/dashboard/DashboardAssetCard.tsx` | Asset card with capacity, location, telemetry connection, and `DataTruthBadge` |
| `src/components/dashboard/OperationalAssets.tsx` | Conditionally rendered operational assets section (returns `null` when 0 assets) |
| `src/components/dashboard/RoleSummary.tsx` | Max 4 role-specific verified indicators with provenance badges |
| `src/components/dashboard/RecentActivity.tsx` | Real activity timeline using Jalali date formatting |
| `src/components/dashboard/NewUserOnboarding.tsx` | Role-specific guided starter workflows for new accounts |
| `src/components/dashboard/index.ts` | Clean module barrel export |

---

## 4. Role-Aware Behavior & Context

The dashboard leverages the existing `activeRole` and `activeOrganization` provided by `AuthContext`:

* **Project Owner / Customer (`PROJECT_OWNER`, `CUSTOMER`):**
  * CTA: «تحلیل و ایجاد پروژه جدید» (`/target-select`)
  * Attention items: Incomplete site inputs, RFQ readiness, incoming contractor bids, draft contracts
  * Summary: Active project count, total planned solar capacity (kW), total estimated budget (IRR)
  * Onboarding: Direct links to solar irradiance calculator and plant setup
* **Investor (`INVESTOR`):**
  * CTA: «فرصت‌های سرمایه‌گذاری» (`/investment-hub/opportunities`)
  * Attention items: Matching vetted opportunities with confirmed financial models
  * Summary: Available qualified opportunities, operational assets count
  * Onboarding: Guided path to investor risk profile and project underwriting
* **EPC Contractor (`EPC`):**
  * CTA: «مشاهده استعلام‌های قیمت (RFQ)» (`/contractors`)
  * Attention items: New open RFQs awaiting proposal submission
  * Summary: Active RFQs and construction-phase projects
* **Vendor / Equipment Supplier (`VENDOR`, `SUPPLIER`):**
  * CTA: «ورود به پرتال تأمین‌کنندگان» (`/vendor-portal`)
  * Next Actions: Deterministic link to equipment management and quotation requests (`/vendor-portal`)
  * Summary: Explicit role handling preventing fall-through to Owner metrics. Returns empty metrics array (safe null render) when verified vendor quotation/procurement records are unavailable in dashboard view, adhering to data-truth without synthetic zeroes.
* **Technician (`TECHNICIAN`):**
  * CTA: «سامانه پایش و نگهداری» (`/smart-maintenance`)
  * Attention items: Assets under maintenance, unverified telemetry connections, open alerts
  * Summary: Supervised solar assets, reporting devices, active maintenance cases
* **Financial Partner (`FINANCE`):**
  * CTA: «پورتفوی مالی و سرمایه‌گذاری» (`/enterprise/portfolio`)
  * Attention items: Pending financing requests and debt service applications
  * Summary: Active financing applications, requested facility volume
* **System Administrator (`ADMIN`):**
  * CTA: «مدیریت کلان پلتفرم» (`/enterprise/portfolio`)
  * Summary: Total registered projects, aggregated solar capacity, digital energy assets

---

## 5. Data Truth, Closure Fixes & Anti-Fabrication Guarantees

In accordance with strict system mandates and the UI-3 Final Closure requirements:
1. **Vendor Role Metric Fall-through Elimination (Closure Fix 1):** An explicit `case 'VENDOR': case 'SUPPLIER':` was introduced in `roleMetrics` of `UserDashboard.tsx`. Previously, unhandled vendor roles fell through to the default Project Owner metrics branch, displaying planned solar capacity and owner budgets. Vendors now have discrete handling: returning an empty metrics array when verified vendor-specific procurement data is not loaded in this view, cleanly triggering `RoleSummary`'s null render with zero fabricated data. In addition, `NextActions` and `DashboardHeader` provide deterministic links to `/vendor-portal`.
2. **Elimination of `user_1` Fallback Data Leak (Closure Fix 2):** In `UserDashboard.tsx`, the legacy request filtering (`r.userId === user.id || r.userId === 'user_1'`) was refactored to strictly enforce authenticated user association (`Boolean(user?.id && r.userId && r.userId === user.id)`). All hardcoded references to `user_1` or any other demo user identifiers were completely removed, eliminating unauthorized data leakage from localStorage across user sessions.
3. **No Fake Progress Percentages:** Removed arbitrary linear progress bars. Projects display their discrete lifecycle phase index (e.g. «گام ۲: آماده‌سازی پروژه») and status rather than fabricated completion percentages.
4. **Operational Assets Conditional Gating:** The «نیروگاه‌های در بهره‌برداری» section is **only rendered** when verified assets exist.
5. **Telemetry Truth:** Devices without verified live telemetry explicitly display `«پایش برخط فعال نیست»` with a `DataTruthBadge` of type `MISSING`, never synthetic charts.
6. **No Fabricated Zeros:** Metrics with unknown values are omitted or displayed as `«—»`.
7. **Organization Privacy:** Demo names like «تابان نیرو» are strictly avoided unless present in authenticated user organization claims.

---

## 6. Route & Deep Link Compatibility

The refactored `UserDashboard.tsx` maintains full backward compatibility for existing entry points and deep links:
* `/dashboard` & `/user-dashboard`: Default view rendering the new UI-3 role dashboard.
* `/projects` & `?tab=projects`: Displays the comprehensive projects list with search, status filters, and instant navigation back to the dashboard overview.
* `?tab=history`: Preserves legacy analysis calculation history with «مشاهده نتیجه» and «تبدیل به پروژه».
* `?tab=requests`: Preserves EPC requests and quotes list.

---

## 7. Accessibility & Touch Standards

* **Touch Targets:** All primary buttons, action links, and cards enforce `min-h-[44px]` for mobile accessibility.
* **Persian Typography:** Formatted with `formatSolarCapacity`, `formatCurrencyIRR`, `formatJalaliDate`, and Persian numerals (`toPersianDigits`).
* **Semantic Structure:** Standard section labels (`aria-labelledby`) and semantic headers (`H1`, `H2`, `H3`).
* **Dark Mode Awareness:** Tested and verified across light and dark color schemes.

---

## 8. Verification Results

### 1. Dedicated UI-3 Verification Suite
Script: `scripts/test_ui3_role_dashboard.ts`
* Total Tests: **88**
* Passed: **88**
* Failed: **0**
* Includes explicit regression assertions for VENDOR role handling, vendor metric omission on unavailable data, complete removal of `user_1`, and data-truth guarantees.

### 2. Full Regression Suite
Script: `npm run test:all`
* Phase 2 through Phase 9 tests: **ALL PASSED (0 failures)**
* Phase 8 tests: **90 PASSED, 0 FAILED**
* Phase 9 tests: **91 PASSED, 0 FAILED**
* UI-1 Shell Suite: **84 PASSED, 0 FAILED**
* UI-2 Workspace Suite: **72 PASSED, 0 FAILED**
* UI-3 Dashboard Suite: **88 PASSED, 0 FAILED**

### 3. TypeScript & Production Compilation
* TypeScript check: `tsc --noEmit` passed with 0 errors.
* Vite production build: `vite build` and esbuild server bundle completed successfully.

### 4. Database Immutability Check
* Target: `db.json`
* Initial SHA-256: `de1c80c200b77dbbcdbb6fd077bced308b76969c9026ceb2715d21e2c92409c2`
* Current SHA-256: `de1c80c200b77dbbcdbb6fd077bced308b76969c9026ceb2715d21e2c92409c2`
* Result: **Byte-for-byte identical (unmodified)**.
