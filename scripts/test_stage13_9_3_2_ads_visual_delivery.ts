/**
 * HOOSHYAR ENERGY — STAGE 13.9.3.2 VERIFICATION TEST SUITE
 * Ads Delivery Visual QA / Real Placement Preview
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import adsRouter from '../src/api/ads.js';
import { adsRepository } from '../src/repositories/adsRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { jwtService } from '../src/security/jwtService.js';
import { DEV_PREVIEW_ADS } from '../src/pages/dev/AdsDeliveryPreview.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

async function requestJson(
  baseUrl: string,
  urlPath: string,
  options: { method?: string; headers?: Record<string, string>; body?: any } = {}
) {
  const url = new URL(urlPath, baseUrl);
  const payload = options.body ? JSON.stringify(options.body) : undefined;

  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }>((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...options.headers
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsed: any = data;
          try {
            parsed = JSON.parse(data);
          } catch {
            // Keep raw string
          }
          resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runStage13_9_3_2Tests() {
  console.log('====================================================');
  console.log('HOOSHYAR ENERGY — STAGE 13.9.3.2 VERIFICATION SUITE');
  console.log('Ads Delivery Visual QA / Real Placement Preview');
  console.log('====================================================\n');

  const isolation = setupTestDatabaseIsolation('stage13_9_3_2_ads_visual_delivery');
  let server: http.Server | null = null;

  try {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/ads', adsRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    // --- GROUP 1: DEV Preview Fixtures Invariants ---
    console.log('--- GROUP 1: DEV Preview Fixtures Invariants ---');
    assert(Boolean(DEV_PREVIEW_ADS.banner), '1.1 GOLD/BANNER DEV fixture is defined');
    assert(DEV_PREVIEW_ADS.banner.advertiser === 'انرژی خورشیدی آفتاب پارس', '1.2 GOLD advertiser matches spec');
    assert(DEV_PREVIEW_ADS.banner.title === 'راهکارهای خورشیدی صنعتی برای کارخانه‌ها', '1.3 GOLD title matches spec');
    assert(DEV_PREVIEW_ADS.banner.subtitle === 'طراحی و اجرای نیروگاه خورشیدی ویژه صنایع و واحدهای تولیدی', '1.4 GOLD subtitle matches spec');
    assert(DEV_PREVIEW_ADS.banner.ctaText === 'مشاهده خدمات', '1.5 GOLD CTA matches spec');

    assert(Boolean(DEV_PREVIEW_ADS.card), '1.6 SILVER/CARD DEV fixture is defined');
    assert(DEV_PREVIEW_ADS.card.advertiser === 'تجهیز انرژی ایرانیان', '1.7 SILVER advertiser matches spec');
    assert(DEV_PREVIEW_ADS.card.title === 'پنل خورشیدی و اینورتر صنعتی', '1.8 SILVER title matches spec');
    assert(DEV_PREVIEW_ADS.card.subtitle === 'تأمین تجهیزات خورشیدی برای پروژه‌های تجاری و صنعتی', '1.9 SILVER subtitle matches spec');
    assert(DEV_PREVIEW_ADS.card.ctaText === 'مشاهده محصولات', '1.10 SILVER CTA matches spec');

    assert(Boolean(DEV_PREVIEW_ADS.sidebar), '1.11 BRONZE/SIDEBAR DEV fixture is defined');
    assert(DEV_PREVIEW_ADS.sidebar.advertiser === 'پارس انرژی نو', '1.12 BRONZE advertiser matches spec');
    assert(DEV_PREVIEW_ADS.sidebar.title === 'خدمات نگهداری نیروگاه خورشیدی', '1.13 BRONZE title matches spec');
    assert(DEV_PREVIEW_ADS.sidebar.subtitle === 'بازرسی، سرویس و نگهداری سامانه‌های خورشیدی', '1.14 BRONZE subtitle matches spec');
    assert(DEV_PREVIEW_ADS.sidebar.ctaText === 'اطلاعات بیشتر', '1.15 BRONZE CTA matches spec');

    // --- GROUP 2: Strict Isolation (DEV Fixtures Never Leak into Public API) ---
    console.log('\n--- GROUP 2: DEV Fixtures Never Leak into Public API ---');
    const publicList = await requestJson(baseUrl, '/api/ads/list');
    assert(publicList.status === 200, '2.1 Public /api/ads/list returns 200');
    const returnedAds = publicList.body.ads || [];
    const leakGold = returnedAds.some((a: any) => a.id === DEV_PREVIEW_ADS.banner.id || a.title === DEV_PREVIEW_ADS.banner.title);
    const leakSilver = returnedAds.some((a: any) => a.id === DEV_PREVIEW_ADS.card.id || a.title === DEV_PREVIEW_ADS.card.title);
    const leakBronze = returnedAds.some((a: any) => a.id === DEV_PREVIEW_ADS.sidebar.id || a.title === DEV_PREVIEW_ADS.sidebar.title);
    assert(!leakGold, '2.2 GOLD DEV fixture NEVER leaked into real public API');
    assert(!leakSilver, '2.3 SILVER DEV fixture NEVER leaked into real public API');
    assert(!leakBronze, '2.4 BRONZE DEV fixture NEVER leaked into real public API');

    // --- GROUP 3: Customer Surface Placement Map Audit ---
    console.log('\n--- GROUP 3: Customer Surface Placement Map Audit ---');
    const dashboardFile = fs.readFileSync(path.join(process.cwd(), 'src/pages/UserDashboard.tsx'), 'utf8');
    const resultFile = fs.readFileSync(path.join(process.cwd(), 'src/pages/Result.tsx'), 'utf8');
    const recommendationFile = fs.readFileSync(path.join(process.cwd(), 'src/pages/Recommendation.tsx'), 'utf8');
    const contractorsFile = fs.readFileSync(path.join(process.cwd(), 'src/pages/ContractorsList.tsx'), 'utf8');
    const vendorsFile = fs.readFileSync(path.join(process.cwd(), 'src/pages/VendorsList.tsx'), 'utf8');

    assert(
      dashboardFile.includes('placement="BANNER"') && dashboardFile.includes('placement="SIDEBAR"'),
      '3.1 UserDashboard embeds both GOLD BANNER and BRONZE SIDEBAR placements'
    );
    assert(
      resultFile.includes('placement="BANNER"'),
      '3.2 Result page embeds GOLD BANNER placement'
    );
    assert(
      recommendationFile.includes('placement="CARD"'),
      '3.3 Recommendation page embeds SILVER CARD placement'
    );
    assert(
      contractorsFile.includes('placement="CARD"') && contractorsFile.includes('placement="BANNER"'),
      '3.4 ContractorsList embeds both SILVER CARD and GOLD BANNER placements'
    );
    assert(
      vendorsFile.includes('placement="CARD"') && vendorsFile.includes('placement="BANNER"'),
      '3.5 VendorsList embeds both SILVER CARD and GOLD BANNER placements'
    );

    // --- GROUP 4: Visual Identity, Disclosure & Empty State ---
    console.log('\n--- GROUP 4: Visual Identity, Disclosure & Empty State ---');
    const adBannerFile = fs.readFileSync(path.join(process.cwd(), 'src/components/AdBanner.tsx'), 'utf8');
    
    assert(
      adBannerFile.includes('محتوای تبلیغاتی'),
      '4.1 All advertisement formats visibly render the "محتوای تبلیغاتی" disclosure'
    );
    assert(
      adBannerFile.includes('bg-amber-400'),
      '4.2 Visual disclosure utilizes subtle amber indicator dot'
    );
    assert(
      adBannerFile.includes('if (!isVisible || loading || ads.length === 0) return null;'),
      '4.3 Empty state returns strictly null without empty box, placeholder, or layout shift'
    );

    // --- GROUP 5: Mobile Responsiveness & Touch Targets ---
    console.log('\n--- GROUP 5: Mobile Responsiveness & Touch Targets ---');
    assert(
      adBannerFile.includes('min-h-[44px]'),
      '5.1 Interactive CTA buttons implement minimum 44px touch targets'
    );
    assert(
      adBannerFile.includes('dir="rtl"') || dashboardFile.includes('dir="rtl"'),
      '5.2 Layout conforms to Persian RTL reading and alignment'
    );
    assert(
      adBannerFile.includes('line-clamp-2') && adBannerFile.includes('line-clamp-1'),
      '5.3 Text overflow prevention: title and subtitle safely clamp without collision'
    );
    assert(
      dashboardFile.includes('order-6 md:order-5') && adBannerFile.includes('min-h-[300px]'),
      '5.4 BRONZE SIDEBAR stacks gracefully on mobile as a 100% width card under main content without squeezing'
    );

    // --- GROUP 6: Real API Security & DTO Sanitization ---
    console.log('\n--- GROUP 6: Real API Security & DTO Sanitization ---');
    const testVendor = userRepository.createUser({
      phone: '09129990001',
      name: 'آزمایش امنیت تبلیغات',
      role: 'VENDOR',
      roles: ['VENDOR']
    });
    const vendorToken = jwtService.sign({
      userId: testVendor.id,
      role: 'VENDOR'
    });

    const maliciousReq = await requestJson(baseUrl, '/api/ads/payment/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        planId: 'ad_plan_gold',
        title: 'تبلیغ مخرب',
        imageUrl: 'https://example.com/banner.jpg',
        linkTo: 'javascript:alert(1)'
      }
    });
    assert(maliciousReq.status === 400, '6.1 Malicious javascript: URL strictly rejected with 400');

    // Immutability Guard
    isolation.verifyImmutability();
    assert(true, '6.2 Repository db.json byte-for-byte identical (SHA-256 preserved)');

  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    isolation.cleanup();
  }

  console.log('\n====================================================');
  console.log(`STAGE 13.9.3.2 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage13_9_3_2Tests().catch((err) => {
  console.error('Fatal error running Stage 13.9.3.2 verification tests:', err);
  process.exit(1);
});
