/**
 * STAGE 12.1B — COMPLETE ADMIN AD APPROVAL & MODERATION TEST SUITE
 * 
 * Verifies all 25 required test cases in isolated temporary storage:
 * 1. unauthenticated admin list -> 401
 * 2. CUSTOMER admin list -> 403
 * 3. VENDOR admin list -> 403
 * 4. ADMIN admin list -> 200
 * 5. SUPER_ADMIN admin list -> 200
 * 6. advertiser creates ad -> pending_review
 * 7. pending ad invisible to public list
 * 8. CUSTOMER cannot approve (403)
 * 9. VENDOR cannot approve (403)
 * 10. ADMIN can approve (200)
 * 11. approved ad persists as active
 * 12. approved active ad becomes visible through /api/ads/list
 * 13. ADMIN can reject pending ad
 * 14. rejected ad remains invisible publicly
 * 15. arbitrary status value rejected (400)
 * 16. ownerId unchanged after moderation
 * 17. ownerType unchanged after moderation
 * 18. invalid advertisement cannot be activated (400)
 * 19. placement filtering still works
 * 20. expired advertisement remains invisible
 * 21. future advertisement remains invisible
 * 22. production MOCK_ADS remains absent
 * 23. admin navigation hidden from CUSTOMER
 * 24. admin navigation visible to ADMIN
 * 25. primary mobile navigation still contains exactly five primary items
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

async function runStage12_1BTests() {
  console.log('=== STARTING STAGE 12.1B ADMIN AD APPROVAL TESTS ===');

  const isolation = setupTestDatabaseIsolation('stage12_1b_ads');
  let testServer: http.Server | null = null;

  try {
    const express = (await import('express')).default;
    const { default: adsRouter } = await import('../src/api/ads.js');
    const { jwtService } = await import('../src/security/jwtService.js');
    const { userRepository } = await import('../src/repositories/userRepository.js');
    const { adsRepository } = await import('../src/repositories/adsRepository.js');

    const app = express();
    app.use(express.json());
    app.use('/api/ads', adsRouter);

    testServer = http.createServer(app);
    await new Promise<void>((resolve) => testServer!.listen(0, resolve));
    const port = (testServer.address() as any).port;
    const BASE_URL = `http://127.0.0.1:${port}`;
    console.log(`[SETUP] Isolated test server listening on ${BASE_URL}`);

    // Provision test users
    const customerUser = userRepository.createUser({
      phone: '09121111111',
      name: 'کاربر مشتری',
      role: 'CUSTOMER',
      roles: ['CUSTOMER']
    });

    const vendorUser = userRepository.createUser({
      phone: '09122222222',
      name: 'فروشنده تجهیزات',
      role: 'VENDOR',
      roles: ['VENDOR']
    });

    const adminUser = userRepository.createUser({
      phone: '09123333333',
      name: 'مدیر فنی سامانه',
      role: 'ADMIN',
      roles: ['ADMIN']
    });

    const superAdminUser = userRepository.createUser({
      phone: '09124444444',
      name: 'مدیر ارشد سامانه',
      role: 'SUPER_ADMIN',
      roles: ['SUPER_ADMIN']
    });

    const customerToken = jwtService.sign({ userId: customerUser.id, phone: customerUser.phone, role: 'CUSTOMER' });
    const vendorToken = jwtService.sign({ userId: vendorUser.id, phone: vendorUser.phone, role: 'VENDOR' });
    const adminToken = jwtService.sign({ userId: adminUser.id, phone: adminUser.phone, role: 'ADMIN' });
    const superAdminToken = jwtService.sign({ userId: superAdminUser.id, phone: superAdminUser.phone, role: 'SUPER_ADMIN' });

    // 1. unauthenticated admin list -> 401
    const res1 = await requestJson(`${BASE_URL}/api/ads/admin`);
    assert(res1.status === 401, '1. unauthenticated admin list -> 401');

    // 2. CUSTOMER admin list -> 403
    const res2 = await requestJson(`${BASE_URL}/api/ads/admin`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert(res2.status === 403, '2. CUSTOMER admin list -> 403');

    // 3. VENDOR admin list -> 403
    const res3 = await requestJson(`${BASE_URL}/api/ads/admin`, {
      headers: { Authorization: `Bearer ${vendorToken}` }
    });
    assert(res3.status === 403, '3. VENDOR admin list -> 403');

    // 4. ADMIN admin list -> 200
    const res4 = await requestJson(`${BASE_URL}/api/ads/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(res4.status === 200, '4. ADMIN admin list -> 200');

    // 5. SUPER_ADMIN admin list -> 200
    const res5 = await requestJson(`${BASE_URL}/api/ads/admin`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    assert(res5.status === 200, '5. SUPER_ADMIN admin list -> 200');

    // 6. advertiser creates ad -> pending_review
    const res6 = await requestJson(`${BASE_URL}/api/ads/create`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        title: 'پنل ۵۵۰ وات با گارانتی تعویض',
        imageUrl: 'https://example.com/panel-550.jpg',
        linkTo: 'https://example.com/products/550w',
        placement: 'banner',
        planId: 'ad_plan_gold'
      }
    });
    assert(res6.status === 201, '6. advertiser creates ad -> 201');
    const createdAd = res6.body?.ad;
    assert(createdAd?.status === 'pending_review', '6b. created ad status is pending_review');

    // 7. pending ad invisible to public list
    const res7 = await requestJson(`${BASE_URL}/api/ads/list?placement=banner`);
    const publicList = res7.body?.ads || [];
    assert(!publicList.some((a: any) => a.id === createdAd.id), '7. pending ad invisible to public list');

    // 8. CUSTOMER cannot approve
    const res8 = await requestJson(`${BASE_URL}/api/ads/${createdAd.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { status: 'active' }
    });
    assert(res8.status === 403, '8. CUSTOMER cannot approve -> 403');

    // 9. VENDOR cannot approve
    const res9 = await requestJson(`${BASE_URL}/api/ads/${createdAd.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: { status: 'active' }
    });
    assert(res9.status === 403, '9. VENDOR cannot approve -> 403');

    // 10. ADMIN can approve
    const res10 = await requestJson(`${BASE_URL}/api/ads/${createdAd.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'active' }
    });
    assert(res10.status === 200, '10. ADMIN can approve -> 200');

    // 11. approved ad persists as active
    const res11 = await requestJson(`${BASE_URL}/api/ads/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const foundInAdmin = res11.body?.ads?.find((a: any) => a.id === createdAd.id);
    assert(foundInAdmin?.status === 'active', '11. approved ad persists as active');
    assert(foundInAdmin?.reviewedBy === adminUser.id, '11b. moderation metadata reviewedBy recorded');

    // 12. approved active ad becomes visible through /api/ads/list
    const res12 = await requestJson(`${BASE_URL}/api/ads/list?placement=banner`);
    const foundInPublic = res12.body?.ads?.find((a: any) => a.id === createdAd.id);
    assert(Boolean(foundInPublic), '12. approved active ad becomes visible through /api/ads/list');

    // 13. ADMIN can reject pending ad
    // Create second ad to reject
    const resAd2 = await requestJson(`${BASE_URL}/api/ads/create`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        title: 'آگهی غیرمجاز یا نامناسب',
        imageUrl: 'https://example.com/bad.jpg',
        linkTo: 'https://example.com/bad',
        placement: 'card',
        planId: 'ad_plan_silver'
      }
    });
    const ad2Id = resAd2.body?.ad?.id;
    const res13 = await requestJson(`${BASE_URL}/api/ads/${ad2Id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'rejected', rejectionReason: 'تصویر مغایر با هویت بصری سایت' }
    });
    assert(res13.status === 200, '13. ADMIN can reject pending ad -> 200');

    // 14. rejected ad remains invisible publicly
    const res14 = await requestJson(`${BASE_URL}/api/ads/list?placement=card`);
    const foundAd2InPublic = res14.body?.ads?.find((a: any) => a.id === ad2Id);
    assert(!foundAd2InPublic, '14. rejected ad remains invisible publicly');

    // 15. arbitrary status value rejected
    const res15 = await requestJson(`${BASE_URL}/api/ads/${createdAd.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'SUPER_PROMOTED_HACK' }
    });
    assert(res15.status === 400, '15. arbitrary status value rejected -> 400');

    // 16. ownerId unchanged after moderation
    assert(foundInAdmin?.ownerId === vendorUser.id, '16. ownerId unchanged after moderation');

    // 17. ownerType unchanged after moderation
    assert(foundInAdmin?.ownerType === 'vendor', '17. ownerType unchanged after moderation');

    // 18. invalid advertisement cannot be activated
    const tempDb = JSON.parse(fs.readFileSync(isolation.tempDbPath, 'utf-8'));
    const invalidAd = {
      id: 'invalid_broken_ad',
      ownerType: 'vendor',
      ownerId: vendorUser.id,
      title: '', // broken empty title
      imageUrl: 'javascript:alert(1)', // malicious image
      linkTo: 'javascript:alert(1)', // malicious link
      placement: 'INVALID_PLACEMENT',
      status: 'pending_review',
      startDate: 'invalid_date',
      endDate: 'invalid_date',
      planId: 'ad_plan_basic',
      createdAt: new Date().toISOString()
    };
    tempDb.ads.push(invalidAd);
    fs.writeFileSync(isolation.tempDbPath, JSON.stringify(tempDb, null, 2), 'utf-8');

    const res18 = await requestJson(`${BASE_URL}/api/ads/invalid_broken_ad/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'active' }
    });
    assert(res18.status === 400, '18. invalid advertisement cannot be activated -> 400');

    // 19. placement filtering still works
    const res19 = await requestJson(`${BASE_URL}/api/ads/list?placement=sidebar`);
    const notInSidebar = res19.body?.ads?.find((a: any) => a.id === createdAd.id);
    assert(!notInSidebar, '19. placement filtering still works (banner ad not in sidebar)');

    // 20. expired advertisement remains invisible
    const expiredAd = {
      id: 'expired_test_ad',
      ownerType: 'vendor',
      ownerId: vendorUser.id,
      title: 'منقضی شده',
      imageUrl: 'https://example.com/exp.jpg',
      linkTo: 'https://example.com',
      placement: 'banner',
      status: 'active',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      planId: 'ad_plan_gold',
      createdAt: new Date().toISOString()
    };
    tempDb.ads.push(expiredAd);
    fs.writeFileSync(isolation.tempDbPath, JSON.stringify(tempDb, null, 2), 'utf-8');

    const res20 = await requestJson(`${BASE_URL}/api/ads/list?placement=banner`);
    const foundExpired = res20.body?.ads?.find((a: any) => a.id === expiredAd.id);
    assert(!foundExpired, '20. expired advertisement remains invisible');

    // 21. future advertisement remains invisible
    const futureAd = {
      id: 'future_test_ad',
      ownerType: 'vendor',
      ownerId: vendorUser.id,
      title: 'آینده',
      imageUrl: 'https://example.com/fut.jpg',
      linkTo: 'https://example.com',
      placement: 'banner',
      status: 'active',
      startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      planId: 'ad_plan_gold',
      createdAt: new Date().toISOString()
    };
    tempDb.ads.push(futureAd);
    fs.writeFileSync(isolation.tempDbPath, JSON.stringify(tempDb, null, 2), 'utf-8');

    const res21 = await requestJson(`${BASE_URL}/api/ads/list?placement=banner`);
    const foundFuture = res21.body?.ads?.find((a: any) => a.id === futureAd.id);
    assert(!foundFuture, '21. future advertisement remains invisible');

    // 22. production MOCK_ADS remains absent
    const adBannerSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/AdBanner.tsx'), 'utf-8');
    assert(!adBannerSrc.includes('const MOCK_ADS ='), '22. production MOCK_ADS remains absent from AdBanner');

    // 23. admin navigation hidden from CUSTOMER (DesktopHeader source check)
    const desktopHeaderSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/navigation/DesktopHeader.tsx'), 'utf-8');
    assert(desktopHeaderSrc.includes('{isAdmin && (') && desktopHeaderSrc.includes('/admin/ads'), '23. admin ads navigation conditional on isAdmin in DesktopHeader');

    // 24. admin navigation visible to ADMIN in Mobile drawer
    const mobileNavSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/navigation/MobileBottomNav.tsx'), 'utf-8');
    assert(mobileNavSrc.includes('{isAdmin && (') && mobileNavSrc.includes('/admin/ads'), '24. admin ads navigation conditional on isAdmin in MobileBottomNav action sheet');

    // 25. primary mobile navigation still contains exactly five primary items
    const bottomBarSection = mobileNavSrc.split('<nav')[1]?.split('</nav>')[0] || '';
    const bottomLinks = bottomBarSection.match(/<Link/g) || [];
    const bottomButtons = bottomBarSection.match(/<button/g) || [];
    const totalBottomNavItems = bottomLinks.length + bottomButtons.length;
    assert(totalBottomNavItems === 5, `25. primary mobile navigation still contains exactly 5 primary items (found: ${totalBottomNavItems})`);

  } finally {
    if (testServer) {
      await new Promise<void>((resolve) => testServer!.close(() => resolve()));
    }
    isolation.cleanup();
  }

  console.log(`\n=== STAGE 12.1B TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runStage12_1BTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
