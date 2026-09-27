import express, { Request, Response } from "express";
import { assetRepository } from '../repositories/assetRepository.js';
import { verifyAuthToken, requireAuth } from "./auth.js";

const assetsRouter = express.Router();

// Middleware to get user from request
const authMW = [verifyAuthToken, requireAuth];

const checkIsAdmin = (user: any): boolean => {
  if (!user) return false;
  const roleUpper = (user.role || '').toUpperCase();
  if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') return true;
  if (Array.isArray(user.roles)) {
    return user.roles.some((r: string) => {
      const u = String(r).toUpperCase();
      return u === 'ADMIN' || u === 'SUPER_ADMIN';
    });
  }
  return false;
};

const checkIsProjectOwner = (user: any): boolean => {
  if (!user) return false;
  const roleUpper = (user.role || '').toUpperCase();
  if (roleUpper === 'PROJECT_OWNER') return true;
  if (Array.isArray(user.roles)) {
    return user.roles.some((r: string) => String(r).toUpperCase() === 'PROJECT_OWNER');
  }
  return false;
};

// GET /api/assets -> public list (only APPROVED for non-owners, all for owners)
assetsRouter.get("/", verifyAuthToken, (req: Request, res: Response) => {
  const user = req.user;
  const allAssets = assetRepository.getSolarAssets();
  
  if (checkIsAdmin(user)) {
    return res.json(allAssets);
  }

  const filtered = allAssets.filter(asset => {
    if (asset.projectStatus === "APPROVED") return true;
    if (user && asset.ownerId === user.id) return true;
    return false;
  });

  res.json(filtered);
});

// POST /api/assets -> create new project (PROJECT_OWNER only)
assetsRouter.post("/", authMW, (req: Request, res: Response) => {
  const user = req.user;
  if (!checkIsProjectOwner(user) && !checkIsAdmin(user)) {
    return res.status(403).json({
      code: "FORBIDDEN",
      error: "ثبت دارایی خورشیدی جدید نیازمند نقش مالک پروژه (PROJECT_OWNER) است."
    });
  }

  const { projectName, location, capacityKw, technology, commissionDate, projectLifetimeYears } = req.body;
  
  const newAsset = assetRepository.createSolarAsset({
    projectName: projectName || "پروژه جدید",
    ownerId: user.id,
    epcCompanyId: null,
    location: location || { city: "", lat: null, lon: null },
    capacityKw: Number(capacityKw) || 0,
    technology: technology || "monocrystalline",
    commissionDate: commissionDate || null,
    projectStatus: "DRAFT",
    projectValueIRR: null,
    expectedAnnualGenerationKwh: null,
    projectLifetimeYears: Number(projectLifetimeYears) || 25,
    verificationStatus: "not_verified",
  });

  assetRepository.createAssetAuditLog({
    assetId: newAsset.id,
    userId: user.id,
    action: "asset_created",
    oldValue: null,
    newValue: newAsset,
  });

  res.json(newAsset);
});

// GET /api/assets/:id
assetsRouter.get("/:id", verifyAuthToken, (req: Request, res: Response) => {
  const asset = assetRepository.getSolarAssetById((req.params.id as string));
  if (!asset) return res.status(404).json({ error: "پروژه مورد نظر یافت نشد." });

  const user = req.user;
  const isAdmin = checkIsAdmin(user);
  const isOwner = user?.id === asset.ownerId;

  if (asset.projectStatus !== "APPROVED" && !isAdmin && !isOwner) {
    return res.status(403).json({
      code: "FORBIDDEN",
      error: "دسترسی به اطلاعات این پروژه مجاز نمی‌باشد."
    });
  }

  const documents = assetRepository.getAssetDocuments(asset.id);
  res.json({ ...asset, documents: isOwner || isAdmin ? documents : documents.filter(d => d.verificationStatus === 'verified') });
});

// PUT /api/assets/:id
assetsRouter.put("/:id", authMW, (req: Request, res: Response) => {
  const asset = assetRepository.getSolarAssetById((req.params.id as string));
  if (!asset) return res.status(404).json({ error: "پروژه مورد نظر یافت نشد." });

  const user = req.user;
  const isAdmin = checkIsAdmin(user);
  const isOwner = user?.id === asset.ownerId;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      code: "FORBIDDEN",
      error: "دسترسی جهت ویرایش مشخصات این پروژه مجاز نمی‌باشد."
    });
  }

  // Only allow updating certain fields by owner
  const { projectName, location, capacityKw, technology, commissionDate, projectLifetimeYears, projectStatus } = req.body;
  
  const updates: any = {};
  if (projectName !== undefined) updates.projectName = projectName;
  if (location !== undefined) updates.location = location;
  if (capacityKw !== undefined) updates.capacityKw = Number(capacityKw);
  if (technology !== undefined) updates.technology = technology;
  if (commissionDate !== undefined) updates.commissionDate = commissionDate;
  if (projectLifetimeYears !== undefined) updates.projectLifetimeYears = Number(projectLifetimeYears);
  
  // Only allow owner or admin to transition DRAFT -> SUBMITTED
  if (projectStatus === "SUBMITTED" && asset.projectStatus === "DRAFT" && (isOwner || isAdmin)) {
      // Check documents logic
      const docs = assetRepository.getAssetDocuments(asset.id);
      if (docs.length === 0) {
          return res.status(400).json({ error: "ارسال پروژه جهت بررسی، بدون بارگذاری مستندات اولیه امکان‌پذیر نیست." });
      }
      updates.projectStatus = "SUBMITTED";
  }

  const updatedAsset = assetRepository.updateSolarAsset(asset.id, updates);

  assetRepository.createAssetAuditLog({
    assetId: asset.id,
    userId: user.id,
    action: "asset_updated",
    oldValue: asset,
    newValue: updatedAsset,
  });

  res.json(updatedAsset);
});

// PUT /api/assets/:id/status (ADMIN ONLY)
assetsRouter.put("/:id/status", authMW, (req: Request, res: Response) => {
  const asset = assetRepository.getSolarAssetById((req.params.id as string));
  if (!asset) return res.status(404).json({ error: "پروژه مورد نظر یافت نشد." });

  const user = req.user;
  if (!checkIsAdmin(user)) {
    return res.status(403).json({
      code: "FORBIDDEN",
      error: "دسترسی مجاز نمی‌باشد. تغییر وضعیت پروژه تنها در اختیار مدیر ارشد سیستم است."
    });
  }

  const { projectStatus, verificationNotes } = req.body;
  if (!projectStatus) return res.status(400).json({ error: "projectStatus الزامی است." });

  const updatedAsset = assetRepository.updateSolarAsset(asset.id, { projectStatus });

  assetRepository.createAssetAuditLog({
    assetId: asset.id,
    userId: user.id,
    action: "status_changed",
    oldValue: { projectStatus: asset.projectStatus },
    newValue: { projectStatus, verificationNotes },
  });

  res.json(updatedAsset);
});

// POST /api/assets/:id/documents
assetsRouter.post("/:id/documents", authMW, (req: Request, res: Response) => {
  const asset = assetRepository.getSolarAssetById((req.params.id as string));
  if (!asset) return res.status(404).json({ error: "پروژه مورد نظر یافت نشد." });

  const user = req.user;
  const isOwner = user?.id === asset.ownerId;
  const isAdmin = checkIsAdmin(user);

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      code: "FORBIDDEN",
      error: "دسترسی جهت بارگذاری مدارک این پروژه مجاز نمی‌باشد."
    });
  }

  const { documentType, fileUrl } = req.body;
  if (!documentType || !fileUrl) return res.status(400).json({ error: "documentType and fileUrl required" });

  const newDoc = assetRepository.createAssetDocument({
    assetId: asset.id,
    documentType,
    fileUrl,
    uploadedBy: user.id,
    verificationStatus: "pending_review",
    verificationNotes: "",
  });

  assetRepository.createAssetAuditLog({
    assetId: asset.id,
    userId: user.id,
    action: "document_uploaded",
    oldValue: null,
    newValue: newDoc,
  });

  res.json(newDoc);
});

export default assetsRouter;
