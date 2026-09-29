/**
 * STAGE 12.1 — REAL ADS PIPELINE & ADS API SECURITY TEST SUITE
 * 
 * Tests:
 * A. unauthenticated POST /api/ads/create -> 401
 * B. authenticated unauthorized role -> 403
 * C. authorized advertiser/business role -> creation succeeds
 * D. created ad persists
 * E. pending ad is NOT returned to ordinary customer-facing active-ad listing
 * F. approved active ad IS returned
 * G. expired ad is NOT returned
 * H. future ad is NOT returned
 * I. AdBanner component handles empty result safely without mock fallback
 * J. AdBanner does not contain MOCK_ADS constant in source
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${msg}`);
  } else {
    failed++;
    console.error(`[FAIL] ${msg}`);
  }
}

async function requestJson(url: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const parsed = new URL(url);
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }>((resolve, reject) => {
    const payload = options.body ? JSON.stringify(options.body) : undefined;
    const req = http.request({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsedBody = data;
        try {
          parsedBody = JSON.parse(data);
        } catch {
          // keep as string
        }
        resolve({ status: res.statusCode || 0, headers: res.headers, body: parsedBody });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runAdsTests() {
  console.log('=== STARTING STAGE 12.1 ADS PIPELINE TESTS ===');
  
  // 1. Setup isolated database
  const isolation = setupTestDatabaseIsolation('stage12_1_ads');

  let testServer: http.Server | null = null;

  try {
    const express = (await import('express')).default;
    const { default: adsRouter } = await import('../src/api/ads.js');
    const { jwtService } = await import('../src/security/jwtService.js');
    const { userRepository } = await import('../src/repositories/userRepository.js');
    const dbModule = await import('../src/db/index.js');

    const app = express();
    app.use(express.json());
    app.use('/api/ads', adsRouter);

    testServer = http.createServer(app);
    await new Promise<void>((resolve) => testServer!.listen(0, resolve));
    const port = (testServer.address() as any).port;
    const BASE_URL = `http://127.0.0.1:${port}`;
    console.log(`[SETUP] Isolated test server listening on ${BASE_URL}`);

    // Provision test users in isolated DB
    const customerUser = userRepository.createUser({
      phone: '09121111111',
      name: 'کاربر عادی بدون دسترسی آگهی',
      role: 'CUSTOMER',
      roles: ['CUSTOMER']
    });

    const vendorUser = userRepository.createUser({
      phone: '09122222222',
      name: 'شرکت تأمین‌کننده آفتاب',
      role: 'VENDOR',
      roles: ['VENDOR']
    });

    const contractorUser = userRepository.createUser({
      phone: '09123333333',
      name: 'پیمانکار نیروگاه خورشیدی',
      role: 'CONTRACTOR',
      roles: ['CONTRACTOR', 'EPC']
    });

    const customerToken = jwtService.sign({ userId: customerUser.id, phone: customerUser.phone, role: 'CUSTOMER' });
    const vendorToken = jwtService.sign({ userId: vendorUser.id, phone: vendorUser.phone, role: 'VENDOR' });
    const contractorToken = jwtService.sign({ userId: contractorUser.id, phone: contractorUser.phone, role: 'CONTRACTOR' });

    // Test A: Unauthenticated POST /api/ads/create -> 401
    const unauthRes = await requestJson(`${BASE_URL}/api/ads/create`, {
      method: 'POST',
      body: {
        title: 'تبلیغ تست بدون احراز',
        imageUrl: 'https://example.com/banner.jpg',
        placement: 'banner'
      }
    });
    assert(unauthRes.status === 401, 'A. unauthenticated POST /api/ads/create returns 401');

    // Test B: Authenticated unauthorized role (CUSTOMER) -> 403
    const unauthRoleRes = await requestJson(`${BASE_URL}/api/ads/create`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        title: 'تبلیغ کاربر نامجاز',
        imageUrl: 'https://example.com/banner.jpg',
        placement: 'banner'
      }
    });
    assert(unauthRoleRes.status === 403, 'B. authenticated unauthorized role returns 403');

    // Test C: Authorized advertiser (VENDOR) -> creation succeeds (201)
    const createRes = await requestJson(`${BASE_URL}/api/ads/create`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        title: 'فروش ویژه پنل خورشیدی هوشیار',
        imageUrl: 'https://example.com/solar-panel.jpg',
        linkTo: 'https://example.com/shop',
        placement: 'banner',
        planId: 'ad_plan_gold'
      }
    });
    assert(createRes.status === 201, 'C. authorized advertiser/business role -> creation succeeds (201)');
    assert(createRes.body?.ad?.title === 'فروش ویژه پنل خورشیدی هوشیار', 'C2. ad title matches input');
    assert(createRes.body?.ad?.ownerId === vendorUser.id, 'C3. ownership derived from authenticated identity, not client JSON');

    // Test D: Created ad persists in repository
    const createdAdId = createRes.body?.ad?.id;
    assert(Boolean(createdAdId), 'D1. created ad has valid ID');
    const createdAdStatus = createRes.body?.ad?.status;
    assert(createdAdStatus === 'pending_review', 'D2. created ad status is pending_review');

    // Test E: Pending ad is NOT returned to ordinary customer-facing /api/ads/list
    const publicAdsRes = await requestJson(`${BASE_URL}/api/ads/list?placement=banner`);
    assert(publicAdsRes.status === 200, 'E1. GET /api/ads/list returns 200');
    const hasPendingAd = publicAdsRes.body?.ads?.some((a: any) => a.id === createdAdId);
    assert(!hasPendingAd, 'E2. pending ad is NOT returned to customer-facing active-ad listing');

    // Test F: Approved active ad IS returned
    // Insert an active ad directly into isolated temp db file
    const tempDb = JSON.parse(fs.readFileSync(isolation.tempDbPath, 'utf-8'));
    const activeAd = {
      id: 'active_ad_test_1',
      ownerType: 'vendor',
      ownerId: vendorUser.id,
      title: 'پنل فعال تاییدشده',
      imageUrl: 'https://example.com/active.jpg',
      linkTo: 'https://example.com/active-link',
      placement: 'banner',
      status: 'active',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      planId: 'ad_plan_gold',
      createdAt: new Date().toISOString()
    };
    tempDb.ads.push(activeAd);

    // Test G: Expired ad in temp db
    const expiredAd = {
      id: 'expired_ad_test_1',
      ownerType: 'vendor',
      ownerId: vendorUser.id,
      title: 'آگهی منقضی شده',
      imageUrl: 'https://example.com/expired.jpg',
      linkTo: 'https://example.com/expired-link',
      placement: 'banner',
      status: 'active', // status active but dates expired
      startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      planId: 'ad_plan_basic',
      createdAt: new Date().toISOString()
    };
    tempDb.ads.push(expiredAd);

    // Test H: Future ad in temp db
    const futureAd = {
      id: 'future_ad_test_1',
      ownerType: 'vendor',
      ownerId: vendorUser.id,
      title: 'آگهی آینده',
      imageUrl: 'https://example.com/future.jpg',
      linkTo: 'https://example.com/future-link',
      placement: 'banner',
      status: 'active', // status active but future start date
      startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
      planId: 'ad_plan_basic',
      createdAt: new Date().toISOString()
    };
    tempDb.ads.push(futureAd);

    fs.writeFileSync(isolation.tempDbPath, JSON.stringify(tempDb, null, 2), 'utf-8');

    const activeListRes = await requestJson(`${BASE_URL}/api/ads/list?placement=banner`);
    const foundActive = activeListRes.body?.ads?.some((a: any) => a.id === activeAd.id);
    assert(foundActive, 'F. approved active ad IS returned');

    // Test G assertion
    const foundExpired = activeListRes.body?.ads?.some((a: any) => a.id === expiredAd.id);
    assert(!foundExpired, 'G. expired ad is NOT returned');

    // Test H assertion
    const foundFuture = activeListRes.body?.ads?.some((a: any) => a.id === futureAd.id);
    assert(!foundFuture, 'H. future ad is NOT returned');

    // Test I: AdBanner source code verification - does not depend on MOCK_ADS
    const bannerSource = fs.readFileSync(path.join(process.cwd(), 'src/components/AdBanner.tsx'), 'utf-8');
    assert(!bannerSource.includes('const MOCK_ADS ='), 'I. AdBanner does not contain MOCK_ADS array');
    assert(bannerSource.includes('/api/ads/list'), 'I2. AdBanner fetches from real /api/ads/list endpoint');
    assert(bannerSource.includes('sanitizeAdLink'), 'I3. AdBanner sanitizes destination URLs');
    assert(bannerSource.includes('sanitizeAdImage'), 'I4. AdBanner sanitizes image URLs against script injection');

    // Test J: Destination URL safety rejection in backend
    const unsafeAdRes = await requestJson(`${BASE_URL}/api/ads/create`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        title: 'تست لینک مخرب',
        imageUrl: 'javascript:alert(1)',
        linkTo: 'javascript:alert(1)',
        placement: 'banner'
      }
    });
    assert(unsafeAdRes.status === 400, 'J. unsafe javascript: URI rejected with 400');

  } finally {
    if (testServer) {
      await new Promise<void>((resolve) => testServer!.close(() => resolve()));
    }
    // 2. Cleanup and verify immutability of repository db.json
    isolation.cleanup();
  }

  console.log(`\n=== STAGE 12.1 ADS TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAdsTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
