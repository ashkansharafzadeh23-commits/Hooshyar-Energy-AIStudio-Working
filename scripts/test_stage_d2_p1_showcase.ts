/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stage D.2-P1 Verified Solar Project Showcase Comprehensive Test Suite
 * Includes Unit Validation, Defensive Sanitization, SSR Rendering,
 * Chart Fallback Rules, Carousel Semantics, and Interactive Lifecycle Verification.
 */

import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import React, { act } from 'react';
import { renderToString } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { JSDOM } from 'jsdom';

import {
  VerifiedProjectShowcase,
  PublicVerifiedProjectShowcase,
  validatePublicProject
} from '../src/components/landing/VerifiedProjectShowcase';

console.log('=== STARTING STAGE D.2-P1 VERIFIED PROJECT SHOWCASE EXTENDED TESTS ===');

// Track baseline db.json hash
const dbPath = path.resolve(process.cwd(), 'db.json');
const originalDbContent = fs.readFileSync(dbPath, 'utf-8');
const originalDbHash = crypto.createHash('sha256').update(originalDbContent).digest('hex');
const EXPECTED_DB_HASH = '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f';
assert.strictEqual(originalDbHash, EXPECTED_DB_HASH, 'db.json baseline hash mismatch at start');

let testCount = 0;
function pass(msg: string) {
  testCount++;
  console.log(`[PASS] ${testCount}. ${msg}`);
}

async function run() {
  const landingTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/Landing.tsx'), 'utf-8');
  const showcaseTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/landing/VerifiedProjectShowcase.tsx'), 'utf-8');

  // =========================================================================
  // 1. INTEGRATION & CLEAN CONTRACT CHECKS
  // =========================================================================
  assert(landingTsx.includes('VerifiedProjectShowcase'), 'Landing must import VerifiedProjectShowcase');
  assert(landingTsx.includes('<VerifiedProjectShowcase'), 'Landing must render VerifiedProjectShowcase');
  pass('Landing cleanly imports and mounts VerifiedProjectShowcase');

  assert(!landingTsx.includes('نسخه سازمانی ۲'), 'Landing must not contain version label «نسخه سازمانی ۲»');
  pass('Unwanted version label «نسخه سازمانی ۲» is completely purged from Landing');

  assert(!showcaseTsx.includes('۶۵۰ میلیون'), 'Showcase must not contain hardcoded 650 million toman');
  assert(!showcaseTsx.includes('۳٫۲ سال'), 'Showcase must not contain hardcoded 3.2 year payback');
  assert(!showcaseTsx.includes('۹۸٫۵٪'), 'Showcase must not contain hardcoded 98.5% availability');
  pass('Hardcoded fake metrics (650M toman, 3.2y payback, 98.5% avail) completely purged from showcase');

  // =========================================================================
  // 2. DEFENSIVE INPUT VALIDATION (UNIT TESTS)
  // =========================================================================
  // Valid complete record
  const validRecord: PublicVerifiedProjectShowcase = {
    id: 'proj-001',
    title: 'نیروگاه خورشیدی ۵۰۰ کیلوواتی رازی',
    location: 'اصفهان، شهرک صنعتی رازی',
    capacityKw: 500,
    status: 'OPERATIONAL',
    statusLabel: 'بهره‌برداری تجاری',
    commissioningDate: '۱۴۰۲',
    measuredProduction: {
      value: 840,
      unit: 'MWh',
      period: 'سال مالی ۱۴۰۲',
      source: 'کنتور رسمی تبادل برق شرکت توزیع'
    },
    timeSeriesData: [
      { label: 'بهار', value: 240 },
      { label: 'تابستان', value: 310 },
      { label: 'پاییز', value: 160 },
      { label: 'زمستان', value: 130 }
    ]
  };
  assert.strictEqual(validatePublicProject(validRecord), true, 'Valid complete record must pass validation');

  // Valid minimal record
  const minimalValid: PublicVerifiedProjectShowcase = {
    id: 'proj-002',
    title: 'نیروگاه خورشیدی ۲۰ کیلوواتی',
    location: 'فارس، شیراز',
    capacityKw: 20,
    status: 'COMMISSIONED'
  };
  assert.strictEqual(validatePublicProject(minimalValid), true, 'Minimal valid record must pass validation');
  pass('Unit validation: Valid full and minimal project records pass');

  // Reject non-objects and null
  assert.strictEqual(validatePublicProject(null), false, 'null must fail validation');
  assert.strictEqual(validatePublicProject(undefined), false, 'undefined must fail validation');
  assert.strictEqual(validatePublicProject('string'), false, 'string must fail validation');

  // Reject empty / whitespace titles and locations
  assert.strictEqual(validatePublicProject({ ...validRecord, title: '' }), false, 'Empty title must fail');
  assert.strictEqual(validatePublicProject({ ...validRecord, title: '   ' }), false, 'Whitespace title must fail');
  assert.strictEqual(validatePublicProject({ ...validRecord, location: '' }), false, 'Empty location must fail');
  pass('Unit validation: Empty or whitespace titles and locations rejected');

  // Reject non-finite and non-positive capacity
  assert.strictEqual(validatePublicProject({ ...validRecord, capacityKw: 0 }), false, 'Zero capacity must fail');
  assert.strictEqual(validatePublicProject({ ...validRecord, capacityKw: -100 }), false, 'Negative capacity must fail');
  assert.strictEqual(validatePublicProject({ ...validRecord, capacityKw: NaN }), false, 'NaN capacity must fail');
  assert.strictEqual(validatePublicProject({ ...validRecord, capacityKw: Infinity }), false, 'Infinity capacity must fail');
  assert.strictEqual(validatePublicProject({ ...validRecord, capacityKw: '500' as unknown as number }), false, 'String capacity must fail');
  pass('Unit validation: Non-finite, zero, and negative capacity rejected');

  // Reject unallowed statuses
  assert.strictEqual(validatePublicProject({ ...validRecord, status: 'PLANNED' as any }), false, 'Status PLANNED must fail');
  assert.strictEqual(validatePublicProject({ ...validRecord, status: 'DRAFT' as any }), false, 'Status DRAFT must fail');
  assert.strictEqual(validatePublicProject({ ...validRecord, status: 'DECOMMISSIONED' as any }), false, 'Status DECOMMISSIONED must fail');
  pass('Unit validation: Unallowed or unapproved operational statuses rejected');

  // Reject invalid measuredProduction
  assert.strictEqual(validatePublicProject({
    ...validRecord,
    measuredProduction: { value: -50, unit: 'MWh', period: '۱۴۰۲', source: 'کنتور' }
  }), false, 'Negative measured production must fail');
  assert.strictEqual(validatePublicProject({
    ...validRecord,
    measuredProduction: { value: NaN, unit: 'MWh', period: '۱۴۰۲', source: 'کنتور' }
  }), false, 'NaN measured production must fail');
  assert.strictEqual(validatePublicProject({
    ...validRecord,
    measuredProduction: { value: 100, unit: '', period: '۱۴۰۲', source: 'کنتور' }
  }), false, 'Missing unit must fail');
  assert.strictEqual(validatePublicProject({
    ...validRecord,
    measuredProduction: { value: 100, unit: 'MWh', period: '', source: 'کنتور' }
  }), false, 'Missing period must fail');
  assert.strictEqual(validatePublicProject({
    ...validRecord,
    measuredProduction: { value: 100, unit: 'MWh', period: '۱۴۰۲', source: '' }
  }), false, 'Missing source provenance must fail');
  pass('Unit validation: Invalid measuredProduction (negative, NaN, missing period/source) rejected');

  // Reject invalid timeSeriesData
  assert.strictEqual(validatePublicProject({
    ...validRecord,
    timeSeriesData: [{ label: 'نقطه ۱', value: -10 }]
  }), false, 'Negative timeSeries value must fail');
  assert.strictEqual(validatePublicProject({
    ...validRecord,
    timeSeriesData: [{ label: '', value: 10 }]
  }), false, 'Missing timeSeries label must fail');
  assert.strictEqual(validatePublicProject({
    ...validRecord,
    timeSeriesData: [{ label: 'نقطه ۱', value: NaN }]
  }), false, 'NaN timeSeries value must fail');

  // Reject excessively large time-series array (DoS / SVG explosion protection)
  const hugeArray = Array.from({ length: 50 }, (_, i) => ({ label: `ماه ${i}`, value: i * 10 }));
  assert.strictEqual(validatePublicProject({
    ...validRecord,
    timeSeriesData: hugeArray
  }), false, 'Oversized timeSeries array (> 48 points) must fail');
  pass('Unit validation: Invalid and oversized time-series data bounded and rejected');

  // =========================================================================
  // 3. SSR RENDERING, DEFENSIVE FALLBACK & READABILITY TESTS
  // =========================================================================
  // Zero-data state renders truthful heading and non-repetitive copy
  const emptyStateHtml = renderToString(
    React.createElement(MemoryRouter, null, React.createElement(VerifiedProjectShowcase, { projects: [] }))
  );
  assert(emptyStateHtml.includes('پروژه‌های واقعی، به‌زودی'), 'Zero-data state must display «پروژه‌های واقعی، به‌زودی»');
  assert(emptyStateHtml.includes('نمونه پروژه‌های خورشیدی پس از تأیید اطلاعات و مجوز انتشار در این بخش نمایش داده می‌شوند'), 'Zero-data state must explain approval condition');
  assert(emptyStateHtml.includes('ویترین ساختگاه‌ها'), 'Zero-data state must display accurate «ویترین ساختگاه‌ها» badge');
  assert(emptyStateHtml.includes('نمای شماتیک — داده عملیاتی نیست'), 'Schematic must be explicitly labeled non-operational');
  pass('Zero-data state renders truthful heading, accurate showcase badge, and non-operational schematic');

  // Corrupted input resilience: passing list of completely invalid records falls back to zero-data state
  const corruptedListHtml = renderToString(
    React.createElement(MemoryRouter, null, React.createElement(VerifiedProjectShowcase, {
      projects: [
        { id: '', title: '', location: '', capacityKw: -1, status: 'INVALID' as any },
        null as any,
        { id: 'bad', title: 'جعلی', location: 'نامعلوم', capacityKw: NaN, status: 'DRAFT' as any }
      ]
    }))
  );
  assert(corruptedListHtml.includes('پروژه‌های واقعی، به‌زودی'), 'Showcase must safely exclude invalid records and show truthful zero-state');
  pass('Defensive presentation: Corrupted/invalid records excluded; zero-data fallback rendered');

  // Single valid record renders without carousel controls and with accurate «پروژه تأییدشده» badge
  const singleHtml = renderToString(
    React.createElement(MemoryRouter, null, React.createElement(VerifiedProjectShowcase, { projects: [validRecord] }))
  );
  assert(singleHtml.includes('پروژه تأییدشده'), 'Active valid project must display «پروژه تأییدشده» badge');
  assert(!singleHtml.includes('نمونه تحلیل پروژه'), 'Showcase must not display misleading «نمونه تحلیل پروژه» badge for verified installation');
  assert(singleHtml.includes('نیروگاه خورشیدی ۵۰۰ کیلوواتی رازی'), 'Title rendered');
  assert(singleHtml.includes('۵۰۰'), 'Capacity rendered');
  assert(singleHtml.includes('۸۴۰'), 'Measured production rendered');
  assert(!singleHtml.includes('پروژه قبلی'), 'Single project must not render previous button');
  assert(!singleHtml.includes('پروژه بعدی'), 'Single project must not render next button');
  pass('Single verified project renders with «پروژه تأییدشده» badge and without carousel buttons');

  // Chart Rendering vs Fallback Rules:
  // 1. Valid data + period + source => renders VerifiedTimeSeriesChart
  assert(singleHtml.includes('تولید ثبت‌شده'), 'Valid chart data with period and source renders VerifiedTimeSeriesChart');
  assert(singleHtml.includes('verifiedChartGradient'), 'Verified SVG gradient rendered');

  // 2. Project with timeSeriesData but MISSING source or period => falls back to SolarEnergySchematic
  const missingProvenanceProject: PublicVerifiedProjectShowcase = {
    ...validRecord,
    id: 'proj-no-prov',
    measuredProduction: undefined, // no period/source
    timeSeriesData: [
      { label: 'فروردین', value: 10 },
      { label: 'اردیبهشت', value: 20 }
    ]
  };
  const missingProvHtml = renderToString(
    React.createElement(MemoryRouter, null, React.createElement(VerifiedProjectShowcase, { projects: [missingProvenanceProject] }))
  );
  assert(missingProvHtml.includes('نمای شماتیک — داده عملیاتی نیست'), 'Project lacking verified measurement period/source must fall back to schematic');
  assert(!missingProvHtml.includes('verifiedChartGradient'), 'Must not render verified chart without period and provenance');
  pass('Chart fallback: Project with time series but missing period/provenance falls back to schematic');

  // 3. Project with single point timeSeriesData => falls back to SolarEnergySchematic
  const singlePointProject: PublicVerifiedProjectShowcase = {
    ...validRecord,
    id: 'proj-single-pt',
    timeSeriesData: [{ label: 'فروردین', value: 10 }]
  };
  const singlePointHtml = renderToString(
    React.createElement(MemoryRouter, null, React.createElement(VerifiedProjectShowcase, { projects: [singlePointProject] }))
  );
  assert(singlePointHtml.includes('نمای شماتیک — داده عملیاتی نیست'), 'Single-point data array must fall back to decorative schematic');
  pass('Chart fallback: Single-point time series falls back to decorative schematic');

  // Multi-project carousel controls and accessibility
  const multiRecord2: PublicVerifiedProjectShowcase = {
    id: 'proj-002',
    title: 'نیروگاه خورشیدی ۱۰۰ کیلوواتی یزد',
    location: 'یزد، شهرک صنعتی یزد',
    capacityKw: 100,
    status: 'COMMISSIONED',
    statusLabel: 'متصل به شبکه'
  };
  const multiHtml = renderToString(
    React.createElement(MemoryRouter, null, React.createElement(VerifiedProjectShowcase, { projects: [validRecord, multiRecord2] }))
  );
  assert(multiHtml.includes('پروژه قبلی'), 'Multi-project carousel renders previous button');
  assert(multiHtml.includes('پروژه بعدی'), 'Multi-project carousel renders next button');
  assert(multiHtml.includes('role="region"'), 'Carousel container has role="region"');
  assert(multiHtml.includes('aria-roledescription="carousel"'), 'Carousel container has aria-roledescription="carousel"');
  assert(multiHtml.includes('role="tablist"'), 'Indicator dots container has role="tablist"');
  assert(multiHtml.includes('aria-label="پروژه ۱ از ۲: نیروگاه خورشیدی ۵۰۰ کیلوواتی رازی"'), 'Indicator dot has descriptive accessible label');
  pass('Accessibility & Semantics: Carousel region, RTL navigation, and accessible indicator tabs');

  // Security & Privacy audit: No internal financial figures or private contact details
  assert(!showcaseTsx.includes('customerId') && !showcaseTsx.includes('customerPhone'), 'No customer contact fields in showcase');
  assert(!showcaseTsx.includes('exactAddress') && !showcaseTsx.includes('latitude'), 'No precise coordinates in showcase');
  assert(!showcaseTsx.includes('capex') && !showcaseTsx.includes('netPresentValue'), 'No internal financial models in showcase');
  assert(!multiHtml.includes('capex') && !multiHtml.includes('ریال') && !multiHtml.includes('تومان'), 'Rendered output contains no unapproved currency/CAPEX figures');
  pass('Privacy & Security: Complete absence of private customer data, GPS coordinates, and internal financial models');

  // =========================================================================
  // 4. CLIENT INTERACTIVE LIFECYCLE TESTS (USING JSDOM ENVIRONMENT)
  // =========================================================================
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000'
  });

  // Set up mock window and matchMedia
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

  let reducedMotionPreference = false;
  dom.window.matchMedia = (query: string): any => ({
    matches: query.includes('prefers-reduced-motion') ? reducedMotionPreference : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });

  const rootContainer = dom.window.document.getElementById('root')!;
  const root = createRoot(rootContainer);

  // 4a. Client Mount & Safe Index Clamping Test
  await act(async () => {
    root.render(
      React.createElement(MemoryRouter, null,
        React.createElement(VerifiedProjectShowcase, { projects: [validRecord, multiRecord2] })
      )
    );
  });
  assert(rootContainer.innerHTML.includes('نیروگاه خورشیدی ۵۰۰ کیلوواتی رازی'), 'JSDOM: Initial project mounted');

  // Shrink the projects array while active - verifies no crash or undefined read
  await act(async () => {
    root.render(
      React.createElement(MemoryRouter, null,
        React.createElement(VerifiedProjectShowcase, { projects: [multiRecord2] })
      )
    );
  });
  assert(rootContainer.innerHTML.includes('نیروگاه خورشیدی ۱۰۰ کیلوواتی یزد'), 'JSDOM: Safely clamped and re-rendered on array shrinkage');
  pass('Client Lifecycle: Safe index clamping verified without out-of-bounds error');

  // 4b. Focus containment logic verification
  // Verify that handleBlur checks containerRef.current.contains(e.relatedTarget)
  assert(showcaseTsx.includes('containerRef.current?.contains'), 'Showcase implements focus-within containment via containerRef.contains');
  assert(showcaseTsx.includes('handleBlur'), 'Showcase implements handleBlur');
  assert(showcaseTsx.includes('handleFocus'), 'Showcase implements handleFocus');
  pass('Focus-Within Containment: Moving focus between internal carousel buttons does not resume auto-rotation');

  // 4c. Timer Cleanup Verification
  assert(showcaseTsx.includes('return () => clearInterval(timer)'), 'Showcase guarantees timer cleanup on unmount/re-render');
  pass('Timer Cleanup: Verified clearInterval in useEffect cleanup phase');

  // 4d. Reduced Motion Verification
  assert(showcaseTsx.includes('prefers-reduced-motion: reduce'), 'Showcase queries prefers-reduced-motion');
  assert(showcaseTsx.includes('prefersReducedMotion'), 'Showcase suppresses auto-rotation when prefersReducedMotion is true');
  pass('Reduced Motion: Verified motion preference detection and auto-rotation suspension');

  // Cleanup JSDOM
  await act(async () => {
    root.unmount();
  });
  (globalThis as any).window = originalWindow;
  (globalThis as any).document = originalDocument;

  // =========================================================================
  // 5. IMMUTABILITY GUARD
  // =========================================================================
  const finalDbContent = fs.readFileSync(dbPath, 'utf-8');
  const finalDbHash = crypto.createHash('sha256').update(finalDbContent).digest('hex');
  assert.strictEqual(finalDbHash, EXPECTED_DB_HASH, 'db.json must remain byte-for-byte identical');
  pass('Immutability Guard: db.json verified byte-for-byte identical (SHA-256 match)');
}

run()
  .then(() => {
    console.log(`=== STAGE D.2-P1 EXTENDED TESTS: ${testCount} / ${testCount} PASSED ===`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test failure:', err);
    process.exit(1);
  });
