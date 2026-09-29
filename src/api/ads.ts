import express, { Request, Response } from "express";
import { adsRepository } from '../repositories/adsRepository.js';
import { subscriptionRepository } from '../repositories/subscriptionRepository.js';
import { verifyAuthToken, requireAuth } from "./auth.js";
import { paymentService } from "../services/paymentService.js";
import { AD_PLANS, resolveAdPlan } from "../types/adPlans.js";

const adsRouter = express.Router();
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

// Valid ad placements
const VALID_PLACEMENTS = ['home_banner', 'banner', 'card', 'inline', 'marquee', 'hero', 'sidebar'];

// Roles permitted to create advertisements (Business Partners, EPC, Vendors, Technicians, Admin)
const AD_CREATOR_ROLES = ['VENDOR', 'CONTRACTOR', 'EPC', 'TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'];

function isSafeUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSafeImageUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) return false;
  if (trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getUserRoles(user: any): string[] {
  const userRoles: string[] = [];
  if (user?.role) userRoles.push(user.role.toUpperCase());
  if (Array.isArray(user?.roles)) {
    user.roles.forEach((r: string) => userRoles.push(r.toUpperCase()));
  }
  return userRoles;
}

/**
 * Public advertising plans catalog (Server-Authoritative)
 */
adsRouter.get("/plans", (req: Request, res: Response) => {
  res.json({
    plans: Object.values(AD_PLANS).map(p => ({
      id: p.id,
      name: p.name,
      nameFa: p.nameFa,
      tier: p.tier,
      priceIRR: p.priceIRR,
      priceToman: p.priceToman,
      durationDays: p.durationDays,
      placement: p.placement,
      descriptionFa: p.descriptionFa
    }))
  });
});

/**
 * Direct create endpoint (from Stage 12.1)
 * Preserved for direct administrative creations and backward compatibility
 */
adsRouter.post("/create", verifyAuthToken, requireAuth, (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  const userRoles = getUserRoles(user);
  const hasAuthorizedRole = userRoles.some(r => AD_CREATOR_ROLES.includes(r));
  if (!hasAuthorizedRole) {
    return res.status(403).json({
      error: "شما دسترسی مجاز جهت ثبت آگهی تبلیغاتی ندارید. این امکان مختص تأمین‌کنندگان، پیمانکاران، تکنسین‌ها و مدیران است."
    });
  }

  const { title, imageUrl, linkTo, placement, startDate, endDate, planId } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: "عنوان تبلیغ الزامی است" });
  }

  if (!imageUrl || typeof imageUrl !== 'string' || !isSafeImageUrl(imageUrl)) {
    return res.status(400).json({ error: "آدرس تصویر تبلیغ نامعتبر یا غیرمجاز است" });
  }

  if (linkTo && !isSafeUrl(linkTo)) {
    return res.status(400).json({ error: "آدرس مقصد تبلیغ نامعتبر یا دارای پروتکل غیرمجاز است" });
  }

  const cleanPlacement = placement && VALID_PLACEMENTS.includes(placement) ? placement : "home_banner";

  // Enforce server-authoritative ownership based on authenticated user
  const ownerType = (userRoles.includes('VENDOR') ? 'vendor' : 'professional') as "vendor" | "professional";
  const ownerId = user.id;

  const validStartDate = startDate && !isNaN(new Date(startDate).getTime()) 
    ? new Date(startDate).toISOString() 
    : new Date().toISOString();
    
  const validEndDate = endDate && !isNaN(new Date(endDate).getTime())
    ? new Date(endDate).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  if (new Date(validEndDate).getTime() <= new Date(validStartDate).getTime()) {
    return res.status(400).json({ error: "تاریخ پایان آگهی باید بعد از تاریخ شروع باشد" });
  }

  const newAd = adsRepository.createAd({
    ownerType,
    ownerId,
    title: title.trim(),
    imageUrl: imageUrl.trim(),
    linkTo: (linkTo || "").trim(),
    placement: cleanPlacement,
    startDate: validStartDate,
    endDate: validEndDate,
    planId: planId || "ad_plan_basic"
  });

  res.status(201).json({ message: "Ad request submitted successfully. Pending review/payment.", ad: newAd });
});

/**
 * Phase 6: Commercial Advertising Payment Request Endpoint
 * POST /api/ads/payment/request
 * - Requires authentication
 * - Authorized advertising roles only (VENDOR, CONTRACTOR, TECHNICIAN, ADMIN, SUPER_ADMIN)
 * - Server resolves price, duration, placement from planId (NEVER trusts client amount)
 * - Validates ad content & safe URLs
 * - Derives ownership securely from authenticated identity (immune to owner spoofing)
 * - Creates ad record in draft/payment_pending (unpaid) state
 * - Initiates payment with Zarinpal / PaymentService
 * - Persists transaction linked to adId and userId
 */
adsRouter.post("/payment/request", verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  const userRoles = getUserRoles(user);
  const hasAuthorizedRole = userRoles.some(r => AD_CREATOR_ROLES.includes(r));
  if (!hasAuthorizedRole) {
    return res.status(403).json({
      error: "شما دسترسی مجاز جهت ثبت آگهی تبلیغاتی و پرداخت را ندارید. این بخش مختص شرکای تجاری، پیمانکاران و تکنسین‌ها است."
    });
  }

  const { planId, title, imageUrl, linkTo } = req.body;

  // 1. Validate & resolve plan server-side
  const plan = resolveAdPlan(planId);
  if (!plan) {
    return res.status(400).json({ error: "پلن تبلیغاتی انتخابی نامعتبر است." });
  }

  // 2. Validate advertisement content
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: "عنوان آگهی الزامی است." });
  }

  if (!imageUrl || typeof imageUrl !== 'string' || !isSafeImageUrl(imageUrl)) {
    return res.status(400).json({ error: "آدرس تصویر آگهی نامعتبر یا دارای پروتکل غیرمجاز است." });
  }

  if (linkTo && !isSafeUrl(linkTo)) {
    return res.status(400).json({ error: "لینک ارجاع تبلیغ نامعتبر یا دارای اسکریپت غیرمجاز است." });
  }

  // 3. Server-authoritative ownership derivation
  const ownerType = (userRoles.includes('VENDOR') ? 'vendor' : 'professional') as "vendor" | "professional";
  const ownerId = user.id;

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  // 4. Create advertisement in draft status with paymentStatus="unpaid"
  const createdAd = adsRepository.createAd({
    ownerType,
    ownerId,
    title: title.trim(),
    imageUrl: imageUrl.trim(),
    linkTo: (linkTo || "").trim(),
    placement: plan.placement,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    planId: plan.id,
    status: "pending_review", // Not active yet
    paymentStatus: "unpaid"
  });

  // 5. Request payment via PaymentService
  const callbackUrl = `${APP_BASE_URL}/api/ads/payment/callback`;

  try {
    const paymentRequest = await paymentService.requestPayment({
      userId: user.id,
      planId: plan.id,
      userPhone: user.phone,
      callbackUrl,
      adId: createdAd.id,
      amountIRR: plan.priceIRR,
      descriptionFa: `تبلیغات سامانه هوشیار انرژی - پلن ${plan.nameFa}`
    });

    // Link transaction to ad
    adsRepository.updateAd(createdAd.id, {
      transactionId: paymentRequest.transactionId,
      paymentAuthority: paymentRequest.authority,
      paymentAmount: plan.priceIRR
    });

    res.json({
      adId: createdAd.id,
      paymentUrl: paymentRequest.paymentUrl,
      authority: paymentRequest.authority,
      transactionId: paymentRequest.transactionId,
      amount: plan.priceIRR,
      plan: {
        id: plan.id,
        nameFa: plan.nameFa,
        priceToman: plan.priceToman
      },
      isSandbox: paymentRequest.isSandbox
    });
  } catch (err: any) {
    const isConfigError = err.message?.includes('NOT_CONFIGURED') || err.message?.includes('Mock payment is prohibited');
    const statusCode = isConfigError ? 503 : 500;
    res.status(statusCode).json({
      code: isConfigError ? 'SERVICE_NOT_CONFIGURED' : 'PAYMENT_REQUEST_FAILED',
      error: err.message || "خطا در برقراری ارتباط با درگاه پرداخت"
    });
  }
});

/**
 * Phase 7 & 8: Commercial Advertising Payment Callback / Verification Endpoint
 * GET /api/ads/payment/callback
 * - Locates transaction by Authority
 * - Verifies payment server-to-server with provider
 * - Idempotency & replay protection: already-verified returns safe status without duplicate effects
 * - Amount verification: guarantees paid amount matches server plan price
 * - User and Ad association verification
 * - On success: paymentStatus="paid", ad becomes eligible for pending_review
 * - Redirects to frontend or returns verification status
 */
adsRouter.get("/payment/callback", async (req: Request, res: Response) => {
  const { Authority, Status } = req.query;

  if (!Authority || typeof Authority !== "string") {
    return res.redirect("/ads/portal?error=invalid_authority");
  }

  try {
    const result = await paymentService.verifyPayment({
      authority: Authority,
      status: String(Status || 'FAILED')
    });

    const tx = subscriptionRepository.getTransactionByAuthority(Authority);
    const adId = tx?.adId;

    if (result.verified && adId) {
      // Transition ad to paid state
      adsRepository.updateAd(adId, {
        paymentStatus: "paid",
        paidAt: tx.verifiedAt || new Date().toISOString(),
        paymentRefId: result.refId || tx.refId,
        paymentAmount: tx.amount,
        status: "pending_review" // Ready for Admin Moderation
      });

      return res.redirect(`/ads/portal?payment_status=success&adId=${adId}&refId=${result.refId || ''}`);
    } else {
      if (adId) {
        adsRepository.updateAd(adId, {
          paymentStatus: "failed"
        });
      }
      return res.redirect(`/ads/portal?payment_status=failed&error=${encodeURIComponent(result.message || 'پرداخت لغو شد یا ناموفق بود')}`);
    }
  } catch (err: any) {
    return res.redirect(`/ads/portal?payment_status=failed&error=${encodeURIComponent(err.message || 'خطا در تأیید تراکنش')}`);
  }
});

/**
 * Authenticated API Verification check (for frontend polling / direct check)
 */
adsRouter.post("/payment/verify-status", verifyAuthToken, requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const { authority, status } = req.body;

  if (!authority || typeof authority !== 'string') {
    return res.status(400).json({ error: "شناسه پرداخت (Authority) الزامی است." });
  }

  const tx = subscriptionRepository.getTransactionByAuthority(authority);
  if (!tx) {
    return res.status(404).json({ error: "تراکنش یافت نشد." });
  }

  // Security: prevent verifying another user's transaction
  if (tx.userId !== user.id) {
    return res.status(403).json({ error: "دسترسی غیرمجاز به این تراکنش." });
  }

  try {
    const result = await paymentService.verifyPayment({
      authority,
      status: status || 'OK',
      userId: user.id
    });

    if (result.verified && tx.adId) {
      adsRepository.updateAd(tx.adId, {
        paymentStatus: "paid",
        paidAt: tx.verifiedAt || new Date().toISOString(),
        paymentRefId: result.refId || tx.refId,
        paymentAmount: tx.amount,
        status: "pending_review"
      });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "خطا در استعلام وضعیت پرداخت" });
  }
});

/**
 * Phase 11: User Advertisement History Endpoint
 * GET /api/ads/my-ads
 * - Authenticated business users only
 * - Enforces server-side ownership (user only sees their own ads)
 * - Returns paymentStatus, status, dates, plan details
 */
adsRouter.get("/my-ads", verifyAuthToken, requireAuth, (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  const userRoles = getUserRoles(user);
  const hasAuthorizedRole = userRoles.some(r => AD_CREATOR_ROLES.includes(r));
  if (!hasAuthorizedRole) {
    return res.status(403).json({
      error: "شما دسترسی مجاز جهت مشاهده تاریخچه تبلیغات تجاری را ندارید."
    });
  }

  const userAds = adsRepository.getUserAds ? adsRepository.getUserAds(user.id) : [];
  res.json({ ads: userAds });
});

/**
 * Phase 9: Public Ad Listing
 * GET /api/ads/list
 * Commercial Rule:
 * Requires:
 *  - ad.status === 'active'
 *  - paymentStatus is paid (or legacy active ad preserved)
 *  - startDate <= now <= endDate
 */
adsRouter.get("/list", (req: Request, res: Response) => {
  const placement = req.query.placement as string | undefined;
  let ads = adsRepository.getAds(placement);
  
  const now = new Date();
  ads = ads.filter((ad: any) => {
    const isApprovedAndActive = ad.status === "active";
    // For newly managed commercial ads, require paymentStatus === 'paid'.
    // If an ad is an existing approved ad without a paymentStatus property, allow it for backward compatibility,
    // but if paymentStatus exists and is NOT 'paid', exclude it.
    const isPaidOrLegacy = ad.paymentStatus === undefined || ad.paymentStatus === "paid";
    const isStarted = new Date(ad.startDate) <= now;
    const isNotExpired = new Date(ad.endDate) >= now;

    return isApprovedAndActive && isPaidOrLegacy && isStarted && isNotExpired;
  });

  res.json({ ads });
});

/**
 * Phase 12: Admin Advertisement Moderation Endpoints
 * GET /api/ads/admin
 */
adsRouter.get("/admin", verifyAuthToken, requireAuth, (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  const userRoles = getUserRoles(user);
  const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");
  if (!isAdmin) {
    return res.status(403).json({ error: "دسترسی به بخش مدیریت تبلیغات فقط مختص مدیران سامانه است." });
  }

  const status = req.query.status as string | undefined;
  const ads = adsRepository.getAllAds ? adsRepository.getAllAds(status) : [];
  res.json({ ads });
});

/**
 * Phase 12: Admin Status Moderation & Commercial Validation
 * PATCH /api/ads/:id/status
 * Invariants:
 *  - Admin / Super Admin only
 *  - Arbitrary statuses rejected
 *  - Cannot activate UNPAID advertisement! (Server-side barrier)
 *  - Validates ad content before activation
 *  - Immutable ownerId and ownerType
 */
adsRouter.patch("/:id/status", verifyAuthToken, requireAuth, (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  const userRoles = getUserRoles(user);
  const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");
  if (!isAdmin) {
    return res.status(403).json({ error: "تغییر وضعیت تبلیغات فقط توسط مدیران سامانه مجاز است." });
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status, rejectionReason } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: "شناسه تبلیغ نامعتبر است." });
  }

  // Strict allowlist for status transitions
  const ALLOWED_STATUSES = ["active", "rejected"];
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: "وضعیت ارسالی نامعتبر است. فقط 'active' یا 'rejected' مجاز است." });
  }

  const existingAd = adsRepository.getAdById ? adsRepository.getAdById(id) : null;
  if (!existingAd) {
    return res.status(404).json({ error: "تبلیغ مورد نظر یافت نشد." });
  }

  // If activating, enforce strict validation of advertisement integrity AND PAYMENT
  if (status === "active") {
    // 1. PAYMENT CHECK: Unpaid ads CANNOT be activated!
    if (existingAd.paymentStatus && existingAd.paymentStatus !== "paid") {
      return res.status(400).json({
        error: "این آگهی پرداخت نشده است و امکان فعال‌سازی آن وجود ندارد. وضعیت پرداخت: " + existingAd.paymentStatus
      });
    }

    if (!existingAd.title || typeof existingAd.title !== "string" || !existingAd.title.trim()) {
      return res.status(400).json({ error: "عنوان تبلیغ نامعتبر است و امکان فعال‌سازی وجود ندارد." });
    }
    if (!existingAd.imageUrl || !isSafeImageUrl(existingAd.imageUrl)) {
      return res.status(400).json({ error: "تصویر تبلیغ نامعتبر است و امکان فعال‌سازی وجود ندارد." });
    }
    if (existingAd.linkTo && !isSafeUrl(existingAd.linkTo)) {
      return res.status(400).json({ error: "لینک مقصد تبلیغ نامعتبر یا دارای اسکریپت غیرمجاز است." });
    }
    if (!existingAd.placement || !VALID_PLACEMENTS.includes(existingAd.placement)) {
      return res.status(400).json({ error: "جایگاه تبلیغ نامعتبر است." });
    }
    const start = new Date(existingAd.startDate).getTime();
    const end = new Date(existingAd.endDate).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) {
      return res.status(400).json({ error: "بازه زمانی تاریخ شروع و پایان تبلیغ نامعتبر است." });
    }
  }

  // Update status with audit metadata while strictly preserving immutable ownerId and ownerType
  const updatedAd = adsRepository.updateAdStatus(id, status, {
    reviewedBy: user.id,
    reviewedAt: new Date().toISOString(),
    rejectionReason: status === "rejected" ? (rejectionReason || "عدم تطابق با ضوابط سامانه") : undefined
  });

  res.json({ message: `وضعیت تبلیغ با موفقیت به '${status}' تغییر یافت.`, ad: updatedAd });
});

export default adsRouter;
