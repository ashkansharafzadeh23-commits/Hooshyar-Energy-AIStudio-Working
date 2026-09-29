import express, { Request, Response } from "express";
import { adsRepository } from '../repositories/adsRepository.js';
import { verifyAuthToken, requireAuth } from "./auth.js";

const adsRouter = express.Router();

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

adsRouter.post("/create", verifyAuthToken, requireAuth, (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  // Derive roles from authenticated user
  const userRoles: string[] = [];
  if (user.role) userRoles.push(user.role.toUpperCase());
  if (Array.isArray(user.roles)) {
    user.roles.forEach((r: string) => userRoles.push(r.toUpperCase()));
  }

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

  // Note: The ad is created with "pending_review" status.
  // In a real app, successful payment would trigger an update to "active" or an admin would review it.

  res.status(201).json({ message: "Ad request submitted successfully. Pending review/payment.", ad: newAd });
});

adsRouter.get("/list", (req: Request, res: Response) => {
  const placement = req.query.placement as string | undefined;
  let ads = adsRepository.getAds(placement);
  
  // Filter by active status and date bounds
  const now = new Date();
  ads = ads.filter((ad: any) => {
    const isApprovedAndActive = ad.status === "active";
    const isStarted = new Date(ad.startDate) <= now;
    const isNotExpired = new Date(ad.endDate) >= now;
    return isApprovedAndActive && isStarted && isNotExpired;
  });

  res.json({ ads });
});

// Admin Advertisement Moderation Endpoints
adsRouter.get("/admin", verifyAuthToken, requireAuth, (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  const userRoles: string[] = [];
  if (user.role) userRoles.push(user.role.toUpperCase());
  if (Array.isArray(user.roles)) {
    user.roles.forEach((r: string) => userRoles.push(r.toUpperCase()));
  }

  const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");
  if (!isAdmin) {
    return res.status(403).json({ error: "دسترسی به بخش مدیریت تبلیغات فقط مختص مدیران سامانه است." });
  }

  const status = req.query.status as string | undefined;
  const ads = adsRepository.getAllAds ? adsRepository.getAllAds(status) : [];
  res.json({ ads });
});

adsRouter.patch("/:id/status", verifyAuthToken, requireAuth, (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  const userRoles: string[] = [];
  if (user.role) userRoles.push(user.role.toUpperCase());
  if (Array.isArray(user.roles)) {
    user.roles.forEach((r: string) => userRoles.push(r.toUpperCase()));
  }

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

  // If activating, enforce strict validation of advertisement integrity
  if (status === "active") {
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

