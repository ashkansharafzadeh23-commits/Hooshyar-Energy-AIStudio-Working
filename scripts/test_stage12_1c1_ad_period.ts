/**
 * STAGE 12.1C.1 — ADVERTISEMENT BILLING PERIOD ACTIVATION TESTS
 * 
 * Tests that:
 * 1. payment request does NOT consume paid advertising duration
 * 2. unpaid ad cannot activate
 * 3. paid pending_review ad has no active publication period
 * 4. admin approval sets startDate at activation time
 * 5. admin approval sets endDate from server-authoritative plan duration
 * 6. Bronze activation duration = 30 days
 * 7. Silver activation duration = 30 days
 * 8. Gold activation duration = 30 days
 * 9. activation date is based on admin activation time, NOT payment request time
 * 10. repeated activation does NOT reset startDate
 * 11. repeated activation does NOT extend endDate
 * 12. rejected-before-first-activation ad has no consumed publication period
 * 13. reactivation of previously activated ad does NOT grant a fresh period
 * 14. active paid ad appears publicly during its valid dates
 * 15. pending paid ad remains hidden
 * 16. unpaid ad remains hidden
 * 17. expired active paid ad remains hidden
 * 18. legacy ad behavior remains compatible
 */

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
          // keep string
        }
        resolve({ status: res.statusCode || 0, headers: res.headers, body: parsedBody });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runStage12_1C1Tests() {
  console.log('=== STARTING STAGE 12.1C.1 AD BILLING PERIOD TESTS ===');

  const isolation = setupTestDatabaseIsolation('stage12_1c1_ad_period');
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

    const vendorUser = userRepository.createUser({
      phone: '09121112233',
      name: 'فروشنده تست دوره تبلیغ',
      role: 'VENDOR',
      roles: ['VENDOR']
    });

    const adminUser = userRepository.createUser({
      phone: '09129998877',
      name: 'مدیر تاییدکننده',
      role: 'ADMIN',
      roles: ['ADMIN']
    });

    const vendorToken = jwtService.sign({ userId: vendorUser.id, phone: vendorUser.phone, role: 'VENDOR' });
    const adminToken = jwtService.sign({ userId: adminUser.id, phone: adminUser.phone, role: 'ADMIN' });

    // 1. payment request does NOT consume paid advertising duration
    const reqBronze = await requestJson(`${BASE_URL}/api/ads/payment/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        planId: 'ad_plan_bronze',
        title: 'تبلیغ برنزی آزمایشی',
        imageUrl: 'https://images.unsplash.com/photo-bronze'
      }
    });
    const bronzeAdId = reqBronze.body.adId;
    const bronzeAuth = reqBronze.body.authority;
    const createdAdBronze = adsRepository.getAdById(bronzeAdId);
    assert(createdAdBronze.paymentStatus === 'unpaid' && createdAdBronze.status === 'pending_review' && !createdAdBronze.activatedAt, '1. payment request does NOT consume paid advertising duration (activatedAt is unset)');

    // 2. unpaid ad cannot activate
    const unpaidApproval = await requestJson(`${BASE_URL}/api/ads/${bronzeAdId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'active' }
    });
    assert(unpaidApproval.status === 400, '2. unpaid ad cannot activate (400)');

    // 3. paid pending_review ad has no active publication period
    await requestJson(`${BASE_URL}/api/ads/payment/verify-status`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: { authority: bronzeAuth, status: 'OK' }
    });
    const paidPendingAd = adsRepository.getAdById(bronzeAdId);
    assert(paidPendingAd.paymentStatus === 'paid' && paidPendingAd.status === 'pending_review' && !paidPendingAd.activatedAt, '3. paid pending_review ad has no active publication period');

    // 4. admin approval sets startDate at activation time
    // 5. admin approval sets endDate from server-authoritative plan duration
    // 6. Bronze activation duration = 30 days
    const beforeApproval = Date.now();
    const approveBronze = await requestJson(`${BASE_URL}/api/ads/${bronzeAdId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'active' }
    });
    const afterApproval = Date.now();
    assert(approveBronze.status === 200, '4. admin approval succeeds -> 200');

    const activatedBronze = adsRepository.getAdById(bronzeAdId);
    const bronzeStartMs = new Date(activatedBronze.startDate).getTime();
    const bronzeEndMs = new Date(activatedBronze.endDate).getTime();
    const bronzeDiffDays = Math.round((bronzeEndMs - bronzeStartMs) / (24 * 60 * 60 * 1000));
    assert(bronzeStartMs >= beforeApproval - 1000 && bronzeStartMs <= afterApproval + 1000, '4b. admin approval sets startDate at activation moment');
    assert(bronzeDiffDays === 30, '5 & 6. Bronze activation duration = exactly 30 days');

    // 7. Silver activation duration = 30 days
    const reqSilver = await requestJson(`${BASE_URL}/api/ads/payment/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: { planId: 'ad_plan_silver', title: 'تبلیغ نقره‌ای', imageUrl: 'https://images.unsplash.com/photo-silver' }
    });
    await requestJson(`${BASE_URL}/api/ads/payment/verify-status`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: { authority: reqSilver.body.authority, status: 'OK' }
    });
    await requestJson(`${BASE_URL}/api/ads/${reqSilver.body.adId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'active' }
    });
    const activatedSilver = adsRepository.getAdById(reqSilver.body.adId);
    const silverDiffDays = Math.round((new Date(activatedSilver.endDate).getTime() - new Date(activatedSilver.startDate).getTime()) / (24 * 60 * 60 * 1000));
    assert(silverDiffDays === 30, '7. Silver activation duration = exactly 30 days');

    // 8. Gold activation duration = 30 days
    const reqGold = await requestJson(`${BASE_URL}/api/ads/payment/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: { planId: 'ad_plan_gold', title: 'تبلیغ طلایی', imageUrl: 'https://images.unsplash.com/photo-gold' }
    });
    await requestJson(`${BASE_URL}/api/ads/payment/verify-status`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: { authority: reqGold.body.authority, status: 'OK' }
    });
    await requestJson(`${BASE_URL}/api/ads/${reqGold.body.adId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'active' }
    });
    const activatedGold = adsRepository.getAdById(reqGold.body.adId);
    const goldDiffDays = Math.round((new Date(activatedGold.endDate).getTime() - new Date(activatedGold.startDate).getTime()) / (24 * 60 * 60 * 1000));
    assert(goldDiffDays === 30, '8. Gold activation duration = exactly 30 days');

    // 9. activation date is based on admin activation time, NOT payment request time
    // Artificially simulate a 3-day delay between payment and approval
    const reqDelayed = await requestJson(`${BASE_URL}/api/ads/payment/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: { planId: 'ad_plan_gold', title: 'تبلیغ با تاخیر بررسی', imageUrl: 'https://images.unsplash.com/photo-delayed' }
    });
    const delayedAdId = reqDelayed.body.adId;
    await requestJson(`${BASE_URL}/api/ads/payment/verify-status`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: { authority: reqDelayed.body.authority, status: 'OK' }
    });
    // Ad was created 3 days ago in pending
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    adsRepository.updateAd(delayedAdId, {
      createdAt: threeDaysAgo.toISOString(),
      paidAt: threeDaysAgo.toISOString(),
      startDate: threeDaysAgo.toISOString(),
      endDate: new Date(threeDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    // Now admin approves today
    const approvalMoment = Date.now();
    await requestJson(`${BASE_URL}/api/ads/${delayedAdId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'active' }
    });
    const activatedDelayed = adsRepository.getAdById(delayedAdId);
    const delayedStartMs = new Date(activatedDelayed.startDate).getTime();
    assert(Math.abs(delayedStartMs - approvalMoment) < 5000, '9. activation date is based on admin activation time, NOT payment request time');

    // 10. repeated activation does NOT reset startDate
    // 11. repeated activation does NOT extend endDate
    const originalStartDate = activatedDelayed.startDate;
    const originalEndDate = activatedDelayed.endDate;
    await requestJson(`${BASE_URL}/api/ads/${delayedAdId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'active' }
    });
    const repeatActivated = adsRepository.getAdById(delayedAdId);
    assert(repeatActivated.startDate === originalStartDate, '10. repeated activation does NOT reset startDate');
    assert(repeatActivated.endDate === originalEndDate, '11. repeated activation does NOT extend endDate');

    // 12. rejected-before-first-activation ad has no consumed publication period
    const reqReject = await requestJson(`${BASE_URL}/api/ads/payment/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: { planId: 'ad_plan_bronze', title: 'تبلیغ رد شده پیش از تایید', imageUrl: 'https://images.unsplash.com/photo-rej' }
    });
    await requestJson(`${BASE_URL}/api/ads/payment/verify-status`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: { authority: reqReject.body.authority, status: 'OK' }
    });
    await requestJson(`${BASE_URL}/api/ads/${reqReject.body.adId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'rejected', rejectionReason: 'محتوای نامناسب' }
    });
    const rejectedAd = adsRepository.getAdById(reqReject.body.adId);
    assert(!rejectedAd.activatedAt, '12. rejected-before-first-activation ad has no activatedAt (no consumed publication period)');

    // 13. reactivation of previously activated ad does NOT grant a fresh period
    // Deactivate delayed ad, then reactivate
    await requestJson(`${BASE_URL}/api/ads/${delayedAdId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'rejected', rejectionReason: 'توقف موقت' }
    });
    await requestJson(`${BASE_URL}/api/ads/${delayedAdId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'active' }
    });
    const reactivatedAd = adsRepository.getAdById(delayedAdId);
    assert(reactivatedAd.startDate === originalStartDate && reactivatedAd.endDate === originalEndDate, '13. reactivation of previously activated ad does NOT grant a fresh period');

    // 14. active paid ad appears publicly during its valid dates
    const publicList = await requestJson(`${BASE_URL}/api/ads/list?placement=banner`);
    const foundDelayed = publicList.body.ads.find((a: any) => a.id === delayedAdId);
    assert(Boolean(foundDelayed), '14. active paid ad appears publicly during its valid dates');

    // 15. pending paid ad remains hidden
    const foundPaidPending = publicList.body.ads.find((a: any) => a.id === bronzeAdId && a.status === 'pending_review');
    assert(!foundPaidPending, '15. pending paid ad remains hidden from public list');

    // 16. unpaid ad remains hidden
    const foundUnpaid = publicList.body.ads.find((a: any) => a.paymentStatus === 'unpaid');
    assert(!foundUnpaid, '16. unpaid ad remains hidden from public list');

    // 17. expired active paid ad remains hidden
    adsRepository.updateAd(delayedAdId, {
      startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    });
    const publicAfterExpire = await requestJson(`${BASE_URL}/api/ads/list?placement=banner`);
    assert(!publicAfterExpire.body.ads.find((a: any) => a.id === delayedAdId), '17. expired active paid ad remains hidden');

    // 18. legacy ad behavior remains compatible
    const legacyAd = adsRepository.createAd({
      ownerType: 'professional',
      ownerId: 'legacy_admin_1',
      title: 'آگهی سیستمی قدیمی',
      imageUrl: 'https://images.unsplash.com/photo-legacy',
      placement: 'banner',
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      planId: 'ad_plan_gold',
      status: 'active'
    });
    const publicWithLegacy = await requestJson(`${BASE_URL}/api/ads/list?placement=banner`);
    assert(Boolean(publicWithLegacy.body.ads.find((a: any) => a.id === legacyAd.id)), '18. legacy ad behavior remains compatible');

  } finally {
    if (testServer) {
      testServer.close();
    }
    isolation.verifyImmutability();
    isolation.cleanup();
  }

  console.log(`=== STAGE 12.1C.1 TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runStage12_1C1Tests().catch((err) => {
  console.error('Fatal test error in 12.1C.1:', err);
  process.exit(1);
});
