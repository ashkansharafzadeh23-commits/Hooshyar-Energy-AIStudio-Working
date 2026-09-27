import express from "express";
import { organizationRepository } from '../repositories/organizationRepository.js';

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
  specialties: string[];
  bio?: string | null;
  createdAt: string | null;
}

export function toPublicEpc(org: any): PublicEpcProfile {
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
    specialties: Array.isArray(org.specialties) ? org.specialties : [],
    bio: org.bio || org.description || null,
    createdAt: org.createdAt || null,
  };
}

contractorsRouter.get("/", (req, res) => {
  const allOrgs = organizationRepository.findAll?.() || [];
  const epcs = allOrgs
    .filter((o: any) => (!o.type || o.type === "EPC_CONTRACTOR") && (o.verificationStatus === "VERIFIED" || o.isPublished === true))
    .map(toPublicEpc);
  res.json({ contractors: epcs });
});

contractorsRouter.get("/:id", (req, res) => {
  const org = organizationRepository.findById?.(req.params.id);
  if (!org) {
    return res.status(404).json({ error: "شرکت پیمانکار یافت نشد." });
  }
  res.json({ contractor: toPublicEpc(org) });
});

export default contractorsRouter;
