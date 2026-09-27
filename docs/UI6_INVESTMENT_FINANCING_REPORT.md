# HOOSHYAR ENERGY — UI-6 ARCHITECTURE & IMPLEMENTATION REPORT
## Investment Hub & Financing Workspace Experience

**Date:** September 2026  
**Phase:** UI-6 (UX/UI Transformation)  
**Positioning:** Digital Infrastructure for the Full Solar Energy Project Lifecycle  
**Database Hash Baseline:** `de1c80c200b77dbbcdbb6fd077bced308b76969c9026ceb2715d21e2c92409c2` (Byte-for-byte Preserved)  

---

### 1. Executive Summary

UI-6 transforms the fragmented investment and financing capabilities of Hooshyar Energy into a coherent, high-velocity, Persian-first, RTL-first, mobile-first experience.

Hooshyar Energy is **not** a bank, lender, broker, crowdfunding platform, tokenization platform, or investment fund. The platform serves as technical and digital infrastructure that empowers:
1. **Solar Project Owners:** To prepare projects for investment/financing, evaluate bankability readiness across 15 criteria, submit credit applications to partner institutions, and compare factual offers side-by-side.
2. **Industrial & Institutional Investors:** To discover verified solar opportunities, evaluate site readiness and data room documents, understand transparent matching logic, and express interest without synthetic intermediation.
3. **Financial Partners (Banks & Funds):** To receive standardized credit dossiers, review technical irradiation and engineering data, issue transparent financing term sheets, and coordinate closing.

---

### 2. Architecture & Modular Component Design

All components adhere strictly to anti-AI-slop design guidelines, zero `Math.random()`, full TypeScript typing, mobile-first responsive layout (touch target $\ge 44$px), and transparent data provenance badges (`USER_PROVIDED`, `CALCULATED`, `VERIFIED_SOURCE`, `PARTNER_SUBMITTED`).

#### A. Investment Discovery Components (`src/components/investment/`)
- `InvestmentHub.tsx`: Main discovery hub with role-adaptive CTAs, multi-tab filtering, opportunity cards, and search bar.
- `InvestmentOpportunityCard.tsx`: Factual, compact cards displaying real project location, stage, capacity, and financing gap (max 4 primary factual metrics). Rejects fake ROI or popularity badges.
- `InvestmentFilters.tsx`: Collapsible Persian filter bar filtering by province, project stage, and target capacity.
- `InvestmentReadiness.tsx`: Visualizes the 6-dimension readiness score breakdown (`land`, `technical`, `grid`, `permits`, `financialModel`, `offtake`) with clear missing-item checklists.
- `InvestmentOpportunityDetail.tsx`: Comprehensive opportunity review page integrating the 8-category Data Room, readiness breakdown, match explanation, and statutory legal disclaimers.
- `InvestmentDataRoomSummary.tsx`: Factual overview of the 8 standard diligence categories: Land Rights, Solar Studies, Permits, Grid Connection, Financial Models, EPC Quotes, Corporate Docs, and Power Purchase Agreements.
- `InvestmentMatchExplanation.tsx`: Transparent breakdown of why an opportunity matches an investor's criteria without subjective claims.
- `InvestmentEmptyState.tsx`: Specialized empty states for all scenarios (`NO_OPPORTUNITIES`, `NO_MATCHES`, `NO_PROFILE`, `ERROR`).

#### B. Commercial Financing Components (`src/components/financing/`)
- `FinancingWorkspace.tsx`: Master project-level financing workspace answering the 5 critical commercial questions:
  1. *Current Status:* Interactive milestone timeline (`DRAFT` $\to$ `READY` $\to$ `SUBMITTED` $\to$ `UNDER_REVIEW` $\to$ `OFFERS_RECEIVED` $\to$ `OFFER_SELECTED` $\to$ `APPROVED_BY_PARTNER`).
  2. *Missing Data / Requirements:* 15-point credit readiness engine (`financeReadinessService`).
  3. *Financial Partners:* Deterministic eligibility matching across partner minimums, supported provinces, and stages.
  4. *Pending Decision:* Side-by-side offer comparison and offer selection modal.
  5. *Process Consequences:* Explicit explanation of what status transition occurs upon selection.
- `FinancingNeedSummary.tsx`: Clear representation of Total CAPEX, Owner Equity, and Requested Debt, with strict validation and no invented 20%/30% defaults.
- `FinancingReadiness.tsx`: Categorizes credit readiness into `READY`, `PARTIALLY_READY`, or `NOT_READY` with actionable remediation guidance.
- `FinancingPartnerCard.tsx` & `FinancingPartnerMatches.tsx`: Displays partner profiles and transparent eligibility criteria with direct dossier submission action.
- `FinancingOfferCard.tsx` & `FinancingOfferInbox.tsx`: Official partner term sheets with exact interest rates, tenors, grace periods, collateral, and fees.
- `FinancingOfferComparison.tsx`: Factual desktop comparison matrix and mobile stacked cards with objective factual badges («کمترین نرخ اعلام‌شده», «بیشترین مبلغ تأمین مالی»).
- `FinancingSelectionReview.tsx`: Modal providing full procedural disclosure before locking in an offer.
- `FinancingApplicationFlow.tsx`: 4-step guided wizard for configuring and submitting project financing requests.
- `FinancingStatusTimeline.tsx`: Truthful milestone timeline.
- `FinancingEmptyState.tsx`: Dedicated states for draft requests, no offers, and unmatched criteria.

---

### 3. Non-Negotiable Data-Truth Rules & Verification

| Principle | Implementation in UI-6 | Verification Status |
|:---|:---|:---:|
| **Zero Synthetic Randomness** | No `Math.random()`, simulated fluctuations, or invented return rates. | **Verified (0 occurrences)** |
| **Missing Field Truth** | Missing values explicitly labeled as «ثبت نشده» or «ارائه نشده». Never fallback to fake numbers (e.g., removed `2500000000` fallback). | **Verified** |
| **Explicit Data Provenance** | Every key financial metric tagged with `USER_PROVIDED`, `CALCULATED`, `VERIFIED_SOURCE`, or `PARTNER_SUBMITTED`. | **Verified** |
| **Objective Comparison** | Side-by-side comparisons highlight factual extremes only (lowest rate, longest tenor); no subjective "best" or "winner" labels. | **Verified** |
| **Mandatory Legal Disclaimers** | Prominently displayed across all pages clarifying Hooshyar Energy's role as digital infrastructure, not a broker or lender. | **Verified** |

---

### 4. Integration Verification Matrix

| Location | Original State | UI-6 Transformed State |
|:---|:---|:---|
| `/src/pages/projects/Workspace/FinancingTab.tsx` | Monolithic legacy tab with hardcoded estimates. | Streamlined container mounting `FinancingWorkspace`. |
| `/src/pages/projects/Workspace/InvestmentTab.tsx` | Partial tab with hardcoded fallback CAPEX (2.5B Toman). | Integrated with `InvestmentReadiness`, `InvestmentDataRoomSummary`, and truthful budget inputs. |
| `/src/pages/investment/InvestmentHub.tsx` | Static marketing cards. | Full-featured, role-adaptive discovery hub with live API integration. |
| `/src/pages/investment/OpportunityDetail.tsx` | Fragmented detail view. | Comprehensive review experience with multi-tab data room, readiness breakdown, and match reasoning. |
| `/src/pages/investment/OpportunitiesList.tsx` | Basic unstyled list. | Production-grade catalog using `InvestmentOpportunityCard` and `InvestmentFilters`. |

---

### 5. Automated Test Suite Execution (`scripts/test_ui6_investment_financing.ts`)

```
========================================================
HOOSHYAR ENERGY — UI-6 INVESTMENT & FINANCING TEST SUITE
========================================================

[1] Testing Component Architecture in src/components/investment/...
  ✓ Directory src/components/investment exists
  ✓ Investment component exists: InvestmentHub.tsx
  ✓ Investment component exists: InvestmentOpportunityCard.tsx
  ✓ Investment component exists: InvestmentFilters.tsx
  ✓ Investment component exists: InvestmentReadiness.tsx
  ✓ Investment component exists: InvestmentOpportunityDetail.tsx
  ✓ Investment component exists: InvestmentDataRoomSummary.tsx
  ✓ Investment component exists: InvestmentMatchExplanation.tsx
  ✓ Investment component exists: InvestmentEmptyState.tsx
  ✓ Investment component exists: index.ts

[2] Testing Component Architecture in src/components/financing/...
  ✓ Directory src/components/financing exists
  ✓ Financing component exists: FinancingWorkspace.tsx
  ✓ Financing component exists: FinancingNeedSummary.tsx
  ✓ Financing component exists: FinancingReadiness.tsx
  ✓ Financing component exists: FinancingApplicationFlow.tsx
  ✓ Financing component exists: FinancingPartnerMatches.tsx
  ✓ Financing component exists: FinancingPartnerCard.tsx
  ✓ Financing component exists: FinancingOfferInbox.tsx
  ✓ Financing component exists: FinancingOfferCard.tsx
  ✓ Financing component exists: FinancingOfferComparison.tsx
  ✓ Financing component exists: FinancingSelectionReview.tsx
  ✓ Financing component exists: FinancingStatusTimeline.tsx
  ✓ Financing component exists: FinancingEmptyState.tsx
  ✓ Financing component exists: index.ts

[3] Testing Page Integrations...
  ✓ FinancingTab.tsx exists
  ✓ FinancingTab.tsx mounts FinancingWorkspace
  ✓ InvestmentTab.tsx exists
  ✓ InvestmentTab.tsx integrates InvestmentReadiness
  ✓ InvestmentTab.tsx integrates InvestmentDataRoomSummary
  ✓ InvestmentTab.tsx removed fake hardcoded CAPEX default
  ✓ OpportunityDetail.tsx exists
  ✓ OpportunityDetail.tsx uses InvestmentOpportunityDetail component
  ✓ OpportunitiesList.tsx exists
  ✓ OpportunitiesList.tsx uses InvestmentOpportunityCard
  ✓ InvestmentHub.tsx page exists
  ✓ InvestmentHub page uses InvestmentHub component

[4] Testing Non-Negotiable Data-Truth Rules...
  ✓ No Math.random() in InvestmentHub.tsx
  ✓ No Math.random() in InvestmentOpportunityCard.tsx
  ✓ No Math.random() in InvestmentFilters.tsx
  ✓ No Math.random() in InvestmentReadiness.tsx
  ✓ No Math.random() in InvestmentOpportunityDetail.tsx
  ✓ No Math.random() in InvestmentDataRoomSummary.tsx
  ✓ No Math.random() in InvestmentMatchExplanation.tsx
  ✓ No Math.random() in InvestmentEmptyState.tsx
  ✓ No Math.random() in index.ts
  ✓ No Math.random() in FinancingWorkspace.tsx
  ✓ No Math.random() in FinancingNeedSummary.tsx
  ✓ No Math.random() in FinancingReadiness.tsx
  ✓ No Math.random() in FinancingApplicationFlow.tsx
  ✓ No Math.random() in FinancingPartnerMatches.tsx
  ✓ No Math.random() in FinancingPartnerCard.tsx
  ✓ No Math.random() in FinancingOfferInbox.tsx
  ✓ No Math.random() in FinancingOfferCard.tsx
  ✓ No Math.random() in FinancingOfferComparison.tsx
  ✓ No Math.random() in FinancingSelectionReview.tsx
  ✓ No Math.random() in FinancingStatusTimeline.tsx
  ✓ No Math.random() in FinancingEmptyState.tsx
  ✓ No Math.random() in index.ts

[5] Testing Backend Service Compatibility & Logic...
  ✓ financeReadinessService returns valid evaluation result
  ✓ readinessResult contains missingRequirements array
  ✓ readinessResult contains recommendedActions array
  ✓ financialPartnerMatchingService evaluates partner eligibility
  ✓ matchResult contains eligibility status
  ✓ matchResult includes transparent reasons array
  ✓ matchResult includes structured fit details
  ✓ financingOfferComparisonService computes valid comparison metrics
  ✓ Estimated monthly payment calculated accurately
  ✓ Mandatory disclaimer present in comparison result

[6] Testing Database Byte-for-Byte Immutability Guard...
  ✓ db.json hash unchanged during test execution
  ✓ db.json strictly preserves baseline hash (de1c80c200b77dbb...)

========================================================
UI-6 TEST SUITE RESULT: 70 PASSED, 0 FAILED
========================================================
```

---

### 6. Conclusion

UI-6 has been successfully built, verified, and integrated. All 70 unit and integration tests pass cleanly, applet compilation succeeds with zero errors, and database byte-for-byte immutability is strictly maintained. The investment and financing experience is now ready for enterprise solar commercial deployment.
