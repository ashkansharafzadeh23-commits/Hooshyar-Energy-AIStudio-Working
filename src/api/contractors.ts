import express from "express";
import { organizationRepository } from '../repositories/organizationRepository.js';
import { signMediaItem, signMediaArray } from './partners.js';
import { db } from '../db/index.js';

const contractorsRouter = express.Router();

export interface PublicEpcProfile {
  id: string;
  name: string;
  tradeName: string;
  legalName?: string;
  type: string;
  verificationStatus: string;
  verified: boolean;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  specialties: string[];
  bio?: string | null;
  logoUrl?: string;
  projectPortfolio?: any[];
  products?: any[];
  createdAt: string | null;
}

export async function toPublicEpc(org: any): Promise<PublicEpcProfile> {
  const signedLogoUrl = org.logoKey ? await signMediaItem(org.logoKey) : (org.logoUrl || "");
  
  const rawPortfolio = Array.isArray(org.projectPortfolio) ? org.projectPortfolio : [];
  const projectPortfolio = await Promise.all(
    rawPortfolio.map(async (p: any) => ({
      ...p,
      images: await signMediaArray(p.images)
    }))
  );

  const allProducts = db.getProducts?.() || [];
  const rawProducts = allProducts.filter((p: any) => p.contractorId === org.id || p.ownerId === org.id);
  const products = await Promise.all(
    rawProducts.map(async (p: any) => ({
      ...p,
      images: await signMediaArray(p.images)
    }))
  );

  return {
    id: org.id,
    name: org.tradeName || org.legalName || "",
    tradeName: org.tradeName || org.legalName || "",
    legalName: org.legalName || org.tradeName,
    type: org.type || "EPC_CONTRACTOR",
    verificationStatus: org.verificationStatus || "NOT_VERIFIED",
    verified: org.verificationStatus === "VERIFIED",
    city: org.city || org.address || null,
    address: org.address || null,
    phone: org.phone || null,
    specialties: Array.isArray(org.specialties) ? org.specialties : [],
    bio: org.bio || org.description || null,
    logoUrl: signedLogoUrl,
    projectPortfolio,
    products,
    createdAt: org.createdAt || null,
  };
}

contractorsRouter.get("/", async (req, res) => {
  const allOrgs = organizationRepository.findAll?.() || [];
  const epcOrgs = allOrgs
    .filter((o: any) => (!o.type || o.type === "EPC_CONTRACTOR") && (o.verificationStatus === "VERIFIED" || o.isPublished === true));
  
  const epcs = await Promise.all(epcOrgs.map(toPublicEpc));
  res.json({ contractors: epcs });
});

contractorsRouter.get("/:id", async (req, res) => {
  const org = organizationRepository.findById?.(req.params.id);
  if (!org) {
    return res.status(404).json({ error: "شرکت پیمانکار یافت نشد." });
  }
  const publicEpc = await toPublicEpc(org);
  res.json({ contractor: publicEpc });
});

export default contractorsRouter;
