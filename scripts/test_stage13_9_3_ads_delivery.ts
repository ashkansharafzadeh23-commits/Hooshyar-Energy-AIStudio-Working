/**
 * HOOSHYAR ENERGY — STAGE 13.9.3 VERIFICATION TEST SUITE
 * Ads End-to-End Delivery, Placement Engine & Customer Visibility
 * 
 * Requirements:
 * 1. unpaid ad cannot display
 * 2. unpaid ad cannot activate
 * 3. paid but pending-review ad cannot display
 * 4. rejected ad cannot display
 * 5. active paid approved ad can display
 * 6. expired ad cannot display
 * 7. future-start ad cannot display
 * 8. GOLD maps to BANNER
 * 9. SILVER maps to CARD
 * 10. BRONZE maps to SIDEBAR
 * 11. authoritative prices remain correct
 * 12. duration remains 30 days
 * 13. activation begins on first activation
 * 14. payment request does not start billing period
 * 15. repeated activation does not incorrectly reset billing
 * 16. dangerous destination URLs rejected
 * 17. safe HTTPS URL accepted
 * 18. customer API does not leak private payment metadata
 * 19. anonymous/customer delivery behavior matches intended existing policy
 * 20. admin authorization remains protected
 * 21. advertiser cannot self-approve
 * 22. Zarinpal verification remains server-authoritative
 * 23. duplicate callback remains idempotent
 * 24. no fake advertisement generated for empty state
 * 25. db.json remains byte-for-byte unchanged by tests
 */

import http from 'http';
import fs from 'fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import adsRouter from '../src/api/ads.js';
import authRouter from '../src/api/auth.js';
import { adsRepository } from '../src/repositories/adsRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { subscriptionRepository } from '../src/repositories/subscriptionRepository.js';
import { jwtService } from '../src/security/jwtService.js';
import { AD_PLANS, resolveAdPlan } from '../src/types/adPlans.js';

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
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: any } = {}
) {
  const url = new URL(path, baseUrl);
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

async function runStage13_9_3Tests() {
  console.log('====================================================');
  console.log('HOOSHYAR ENERGY — STAGE 13.9.3 VERIFICATION SUITE');
  console.log('Ads Delivery, Placement Engine & Customer Visibility');
  console.log('====================================================\n');

  const isolation = setupTestDatabaseIsolation('stage13_9_3_ads_delivery');
  let server: http.Server | null = null;

  try {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/ads', adsRouter);
    app.use('/api/auth', authRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    // Create Test Identities
    const adminUser = userRepository.createUser({
      phone: '09120000001',
      name: 'مدیر سامانه تبلیغات',
      role: 'ADMIN',
      roles: ['ADMIN']
    });
    const adminToken = jwtService.sign({
      userId: adminUser.id,
      id: adminUser.id,
      phone: adminUser.phone,
      roles: ['ADMIN'],
      role: 'ADMIN'
    });

    const vendorUser = userRepository.createUser({
      phone: '09120000002',
      name: 'تأمین‌کننده تجهیزات البرز',
      role: 'VENDOR',
      roles: ['VENDOR']
    });
    const vendorToken = jwtService.sign({
      userId: vendorUser.id,
      id: vendorUser.id,
      phone: vendorUser.phone,
      roles: ['VENDOR'],
      role: 'VENDOR'
    });

    const customerUser = userRepository.createUser({
      phone: '09120000003',
      name: 'مشتری خانگی',
      role: 'CUSTOMER',
      roles: ['CUSTOMER']
    });
    const customerToken = jwtService.sign({
      userId: customerUser.id,
      id: customerUser.id,
      phone: customerUser.phone,
      roles: ['CUSTOMER'],
      role: 'CUSTOMER'
    });

    // --- GROUP 1: Authoritative Plan Specifications & Pricing ---
    console.log('--- GROUP 1: Authoritative Plan Specifications & Pricing ---');
    assert(AD_PLANS.ad_plan_bronze.priceToman === 10_000_000, '11.1 Bronze price is 10,000,000 Toman');
    assert(AD_PLANS.ad_plan_bronze.priceIRR === 100_000_000, '11.2 Bronze price in IRR is 100,000,000 Rial');
    assert(AD_PLANS.ad_plan_silver.priceToman === 15_000_000, '11.3 Silver price is 15,000,000 Toman');
    assert(AD_PLANS.ad_plan_silver.priceIRR === 150_000_000, '11.4 Silver price in IRR is 150,000,000 Rial');
    assert(AD_PLANS.ad_plan_gold.priceToman === 20_000_000, '11.5 Gold price is 20,000,000 Toman');
    assert(AD_PLANS.ad_plan_gold.priceIRR === 200_000_000, '11.6 Gold price in IRR is 200,000,000 Rial');
    assert(AD_PLANS.ad_plan_bronze.durationDays === 30, '12.1 Bronze duration is 30 days');
    assert(AD_PLANS.ad_plan_silver.durationDays === 30, '12.2 Silver duration is 30 days');
    assert(AD_PLANS.ad_plan_gold.durationDays === 30, '12.3 Gold duration is 30 days');
    assert(AD_PLANS.ad_plan_gold.placement === 'banner', '8.1 Gold plan placement is banner');
    assert(AD_PLANS.ad_plan_silver.placement === 'card', '9.1 Silver plan placement is card');
    assert(AD_PLANS.ad_plan_bronze.placement === 'sidebar', '10.1 Bronze plan placement is sidebar');

    // --- GROUP 2: Creation, URL Security & Payment Request Lifecycle ---
    console.log('\n--- GROUP 2: Creation, URL Security & Payment Request Lifecycle ---');

    // 16. Dangerous destination URLs rejected
    const dangerousRes1 = await requestJson(baseUrl, '/api/ads/payment/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        planId: 'ad_plan_gold',
        title: 'تبلیغ حاوی جاوااسکریپت',
        imageUrl: 'https://images.unsplash.com/photo-1509391366360-120953a15443',
        linkTo: 'javascript:alert("pwned")'
      }
    });
    assert(dangerousRes1.status === 400, '16.1 Dangerous javascript: destination URL rejected with 400');

    const dangerousRes2 = await requestJson(baseUrl, '/api/ads/payment/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        planId: 'ad_plan_gold',
        title: 'تبلیغ حاوی data URI',
        imageUrl: 'https://images.unsplash.com/photo-1509391366360-120953a15443',
        linkTo: 'data:text/html,<script>alert(1)</script>'
      }
    });
    assert(dangerousRes2.status === 400, '16.2 Dangerous data: destination URL rejected with 400');

    // 17. Safe HTTPS URL accepted
    const safeReq = await requestJson(baseUrl, '/api/ads/payment/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        planId: 'ad_plan_gold',
        title: 'پنل‌های باکیفیت خورشیدی ۵۵۰ وات',
        imageUrl: 'https://images.unsplash.com/photo-1509391366360-120953a15443?w=800',
        linkTo: 'https://example-solar-company.ir/products'
      }
    });
    assert(safeReq.status === 200, '17.1 Safe HTTPS URL accepted and payment initiated (200)');
    assert(Boolean(safeReq.body.adId), '17.2 Created ad ID generated and returned');
    assert(Boolean(safeReq.body.authority), '17.3 Zarinpal authority created');
    const goldAdId = safeReq.body.adId;
    const goldAuthority = safeReq.body.authority;

    // 14. Payment request does not start billing period
    const createdAdInDb = adsRepository.getAdById(goldAdId);
    assert(createdAdInDb.status === 'pending_review', '14.1 New ad created in pending_review status');
    assert(createdAdInDb.paymentStatus === 'unpaid', '14.2 Payment status is initially unpaid');
    assert(createdAdInDb.activatedAt === undefined, '14.3 activatedAt is strictly undefined prior to admin approval');

    // 1. Unpaid ad cannot display in customer API
    const publicList1 = await requestJson(baseUrl, '/api/ads/list');
    assert(publicList1.status === 200, '19.1 Public /api/ads/list accessible without authentication');
    const foundUnpaid = (publicList1.body.ads || []).some((a: any) => a.id === goldAdId);
    assert(!foundUnpaid, '1.1 Unpaid ad does NOT appear in public customer ad list');

    // 2. Unpaid ad cannot activate
    const unpaidActivateRes = await requestJson(baseUrl, `/api/ads/${goldAdId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'active' }
    });
    assert(unpaidActivateRes.status === 400, '2.1 Admin activation of unpaid ad is strictly blocked with 400');
    assert(unpaidActivateRes.body.error?.includes('پرداخت نشده'), '2.2 Error explains ad is unpaid');

    // --- GROUP 3: Payment Verification & Review Queue ---
    console.log('\n--- GROUP 3: Payment Verification & Review Queue ---');

    // 22. Server-side payment verification
    const verifyRes = await requestJson(baseUrl, '/api/ads/payment/verify-status', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        authority: goldAuthority,
        status: 'OK'
      }
    });
    assert(verifyRes.status === 200, '22.1 Payment verification endpoint succeeds');
    assert(verifyRes.body.verified === true, '22.2 Payment verified: true recorded server-side');

    const paidAdInDb = adsRepository.getAdById(goldAdId);
    assert(paidAdInDb.paymentStatus === 'paid', '22.3 Ad paymentStatus transitioned to paid');
    assert(paidAdInDb.status === 'pending_review', '22.4 Paid ad remains in pending_review status (awaiting admin)');

    // 23. Duplicate callback remains idempotent
    const duplicateVerifyRes = await requestJson(baseUrl, '/api/ads/payment/verify-status', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        authority: goldAuthority,
        status: 'OK'
      }
    });
    assert(duplicateVerifyRes.status === 200, '23.1 Repeated payment verification succeeds');
    assert(duplicateVerifyRes.body.alreadyVerified === true, '23.2 Idempotency: flagged as alreadyVerified without side effects');

    // 3. Paid but pending-review ad cannot display
    const publicList2 = await requestJson(baseUrl, '/api/ads/list');
    const foundPaidPending = (publicList2.body.ads || []).some((a: any) => a.id === goldAdId);
    assert(!foundPaidPending, '3.1 Paid but pending-review ad does NOT display to customers');

    // --- GROUP 4: Authorization Protection & Admin Approval ---
    console.log('\n--- GROUP 4: Authorization Protection & Admin Approval ---');

    // 20. Admin authorization protected
    const anonAdminRes = await requestJson(baseUrl, '/api/ads/admin');
    assert(anonAdminRes.status === 401, '20.1 Unauthenticated access to /api/ads/admin returns 401');

    const customerAdminRes = await requestJson(baseUrl, '/api/ads/admin', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert(customerAdminRes.status === 403, '20.2 Customer access to /api/ads/admin returns 403');

    // 21. Advertiser cannot self-approve
    const selfApproveRes = await requestJson(baseUrl, `/api/ads/${goldAdId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: { status: 'active' }
    });
    assert(selfApproveRes.status === 403, '21.1 Advertiser cannot self-approve their own ad (403)');

    // 4. Rejected ad cannot display
    const rejectRes = await requestJson(baseUrl, `/api/ads/${goldAdId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'rejected', rejectionReason: 'تصویر نامناسب' }
    });
    assert(rejectRes.status === 200, '4.1 Admin rejection succeeds');
    const publicList3 = await requestJson(baseUrl, '/api/ads/list');
    const foundRejected = (publicList3.body.ads || []).some((a: any) => a.id === goldAdId);
    assert(!foundRejected, '4.2 Rejected ad does NOT display in customer list');

    // --- GROUP 5: First-time Activation, Duration & Public Delivery ---
    console.log('\n--- GROUP 5: First-time Activation, Duration & Public Delivery ---');

    // 13. Activation begins on first activation
    const beforeActivationTime = Date.now();
    const approveRes = await requestJson(baseUrl, `/api/ads/${goldAdId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'active' }
    });
    assert(approveRes.status === 200, '5.1 Admin approval succeeds (200)');

    const activatedAd = adsRepository.getAdById(goldAdId);
    assert(activatedAd.status === 'active', '5.2 Ad status is active');
    assert(Boolean(activatedAd.activatedAt), '13.1 activatedAt timestamp recorded');
    const startMs = new Date(activatedAd.startDate).getTime();
    const endMs = new Date(activatedAd.endDate).getTime();
    assert(startMs >= beforeActivationTime - 2000, '13.2 startDate matches admin activation time');
    const diffDays = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
    assert(diffDays === 30, '13.3 Duration is exactly 30 days from activation time');

    // 15. Repeated activation does not extend duration
    const origEndDate = activatedAd.endDate;
    await requestJson(baseUrl, `/api/ads/${goldAdId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'active' }
    });
    const recheckedAd = adsRepository.getAdById(goldAdId);
    assert(recheckedAd.endDate === origEndDate, '15.1 Repeated activation does NOT extend endDate or grant free time');

    // 5. Active paid approved ad can display
    const publicList4 = await requestJson(baseUrl, '/api/ads/list');
    const foundActiveGold = (publicList4.body.ads || []).find((a: any) => a.id === goldAdId);
    assert(Boolean(foundActiveGold), '5.3 Active approved paid ad IS returned in customer delivery list');

    // 18. Customer API does not leak private payment metadata
    assert(foundActiveGold.transactionId === undefined, '18.1 transactionId is redacted from customer DTO');
    assert(foundActiveGold.paymentAuthority === undefined, '18.2 paymentAuthority is redacted from customer DTO');
    assert(foundActiveGold.paymentRefId === undefined, '18.3 paymentRefId is redacted from customer DTO');
    assert(foundActiveGold.paymentAmount === undefined, '18.4 paymentAmount is redacted from customer DTO');

    // --- GROUP 6: Placement Matching Engine ---
    console.log('\n--- GROUP 6: Placement Matching Engine ---');

    // Create Silver (Card) and Bronze (Sidebar) ads
    const silverAd = adsRepository.createAd({
      ownerType: 'vendor',
      ownerId: vendorUser.id,
      title: 'اینورتر ۱۰ کیلووات هیبرید',
      imageUrl: 'https://images.unsplash.com/photo-1548611716-ad78255b706c',
      linkTo: 'https://example-solar.ir/inverter',
      placement: 'card',
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() + 29 * 24 * 3600000).toISOString(),
      planId: 'ad_plan_silver',
      status: 'active',
      paymentStatus: 'paid',
      activatedAt: new Date().toISOString()
    });

    const bronzeAd = adsRepository.createAd({
      ownerType: 'vendor',
      ownerId: vendorUser.id,
      title: 'کابل و کانکتور خورشیدی',
      imageUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86',
      linkTo: 'https://example-solar.ir/cables',
      placement: 'sidebar',
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() + 29 * 24 * 3600000).toISOString(),
      planId: 'ad_plan_bronze',
      status: 'active',
      paymentStatus: 'paid',
      activatedAt: new Date().toISOString()
    });

    // 8. GOLD maps to BANNER
    const bannerList = await requestJson(baseUrl, '/api/ads/list?placement=banner');
    const bannerIds = (bannerList.body.ads || []).map((a: any) => a.id);
    assert(bannerIds.includes(goldAdId), '8.2 GOLD ad returned in ?placement=banner query');
    assert(!bannerIds.includes(silverAd.id), '8.3 Silver card ad excluded from ?placement=banner');
    assert(!bannerIds.includes(bronzeAd.id), '8.4 Bronze sidebar ad excluded from ?placement=banner');

    // 9. SILVER maps to CARD
    const cardList = await requestJson(baseUrl, '/api/ads/list?placement=card');
    const cardIds = (cardList.body.ads || []).map((a: any) => a.id);
    assert(cardIds.includes(silverAd.id), '9.2 SILVER ad returned in ?placement=card query');
    assert(!cardIds.includes(goldAdId), '9.3 Gold banner ad excluded from ?placement=card');
    assert(!cardIds.includes(bronzeAd.id), '9.4 Bronze sidebar ad excluded from ?placement=card');

    // 10. BRONZE maps to SIDEBAR
    const sidebarList = await requestJson(baseUrl, '/api/ads/list?placement=sidebar');
    const sidebarIds = (sidebarList.body.ads || []).map((a: any) => a.id);
    assert(sidebarIds.includes(bronzeAd.id), '10.2 BRONZE ad returned in ?placement=sidebar query');
    assert(!sidebarIds.includes(goldAdId), '10.3 Gold banner ad excluded from ?placement=sidebar');
    assert(!sidebarIds.includes(silverAd.id), '10.4 Silver card ad excluded from ?placement=sidebar');

    // Case-insensitivity check (e.g., BANNER uppercase)
    const upperBannerList = await requestJson(baseUrl, '/api/ads/list?placement=BANNER');
    assert(
      (upperBannerList.body.ads || []).some((a: any) => a.id === goldAdId),
      '8.5 Case-insensitive: uppercase ?placement=BANNER correctly returns banner ad'
    );

    // --- GROUP 7: Temporal Boundaries (Expired & Future Ads) ---
    console.log('\n--- GROUP 7: Temporal Boundaries (Expired & Future Ads) ---');

    // 6. Expired ad cannot display
    const expiredAd = adsRepository.createAd({
      ownerType: 'vendor',
      ownerId: vendorUser.id,
      title: 'آگهی منقضی‌شده جشنواره تابستانه',
      imageUrl: 'https://images.unsplash.com/photo-1509391366360-120953a15443',
      linkTo: 'https://example.com/expired',
      placement: 'banner',
      startDate: new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
      endDate: new Date(Date.now() - 30 * 24 * 3600000).toISOString(), // expired 30 days ago
      planId: 'ad_plan_gold',
      status: 'active',
      paymentStatus: 'paid'
    });
    const checkExpiredList = await requestJson(baseUrl, '/api/ads/list');
    const foundExpired = (checkExpiredList.body.ads || []).some((a: any) => a.id === expiredAd.id);
    assert(!foundExpired, '6.1 Expired ad with endDate in past is strictly excluded from customer delivery');

    // 7. Future-start ad cannot display
    const futureAd = adsRepository.createAd({
      ownerType: 'vendor',
      ownerId: vendorUser.id,
      title: 'آگهی جشنواره نوروزی آینده',
      imageUrl: 'https://images.unsplash.com/photo-1509391366360-120953a15443',
      linkTo: 'https://example.com/future',
      placement: 'banner',
      startDate: new Date(Date.now() + 5 * 24 * 3600000).toISOString(), // starts in 5 days
      endDate: new Date(Date.now() + 35 * 24 * 3600000).toISOString(),
      planId: 'ad_plan_gold',
      status: 'active',
      paymentStatus: 'paid'
    });
    const checkFutureList = await requestJson(baseUrl, '/api/ads/list');
    const foundFuture = (checkFutureList.body.ads || []).some((a: any) => a.id === futureAd.id);
    assert(!foundFuture, '7.1 Future-start ad with startDate in future is strictly excluded from customer delivery');

    // 24. No fake advertisement generated for empty placement
    const emptyPlacementList = await requestJson(baseUrl, '/api/ads/list?placement=nonexistent_placement');
    assert(emptyPlacementList.status === 200, '24.1 Non-matching placement returns 200 OK');
    assert(Array.isArray(emptyPlacementList.body.ads) && emptyPlacementList.body.ads.length === 0, '24.2 Empty placement returns empty ads array (no mock/fake ads injected)');

    // --- GROUP 8: Database Immutability Verification ---
    console.log('\n--- GROUP 8: Database Immutability Verification ---');
    isolation.verifyImmutability();
    assert(true, '25.1 Repository db.json byte-for-byte identical (SHA-256 preserved)');

  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    isolation.cleanup();
  }

  console.log('\n====================================================');
  console.log(`STAGE 13.9.3 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage13_9_3Tests().catch((err) => {
  console.error('Fatal error running Stage 13.9.3 verification tests:', err);
  process.exit(1);
});
