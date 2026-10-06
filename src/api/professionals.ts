import express from "express";
import { professionalRepository } from '../repositories/professionalRepository.js';
import { signMediaItem, signMediaArray } from './partners.js';

const professionalsRouter = express.Router();

export interface PublicProfessionalProfile {
  id: string;
  fullName: string | null;
  phone?: string | null;
  specialties: string[];
  serviceCities: string[];
  yearsExperience: number | null;
  bio: string | null;
  profileImageUrl: string | null;
  certifications?: any[];
  workSamples?: any[];
  verified: boolean;
  status: string;
  createdAt: string | null;
}

export async function toPublicProfessional(pro: any): Promise<PublicProfessionalProfile> {
  const hasExp = pro.yearsExperience !== undefined && pro.yearsExperience !== null && pro.yearsExperience !== '';
  const signedPhoto = pro.profileImageKey ? await signMediaItem(pro.profileImageKey) : (pro.profileImageUrl || null);

  const rawCerts = Array.isArray(pro.certifications) ? pro.certifications : [];
  const certifications = await Promise.all(
    rawCerts.map(async (c: any) => ({
      ...c,
      imageUrl: c.fileKey ? await signMediaItem(c.fileKey) : (c.imageUrl || '')
    }))
  );

  const rawSamples = Array.isArray(pro.workSamples) ? pro.workSamples : [];
  const workSamples = await Promise.all(
    rawSamples.map(async (w: any) => ({
      ...w,
      images: await signMediaArray(w.images)
    }))
  );

  return {
    id: pro.id,
    fullName: pro.fullName || null,
    phone: pro.phone || null,
    specialties: Array.isArray(pro.specialties) ? pro.specialties : (pro.specialties ? [pro.specialties] : []),
    serviceCities: Array.isArray(pro.serviceCities) ? pro.serviceCities : (pro.serviceCities ? [pro.serviceCities] : []),
    yearsExperience: hasExp ? Number(pro.yearsExperience) : null,
    bio: pro.bio || null,
    profileImageUrl: signedPhoto,
    certifications,
    workSamples,
    verified: pro.status === "approved" || pro.approvalStatus === "APPROVED",
    status: pro.status || pro.approvalStatus,
    createdAt: pro.createdAt || null,
  };
}

professionalsRouter.post("/register", async (req, res) => {
  const {
    fullName,
    phone,
    specialties,
    serviceCities,
    yearsExperience,
    bio,
    profileImageUrl,
    certifications,
  } = req.body;

  if (!fullName || !phone) {
    return res.status(400).json({ error: "نام و شماره همراه الزامی است." });
  }

  const hasExp = yearsExperience !== undefined && yearsExperience !== null && yearsExperience !== '';
  const newPro = professionalRepository.createProfessional({
    fullName,
    phone,
    specialties: Array.isArray(specialties) ? specialties : (specialties ? [specialties] : []),
    serviceCities: Array.isArray(serviceCities) ? serviceCities : (serviceCities ? [serviceCities] : []),
    yearsExperience: hasExp ? Number(yearsExperience) : null,
    bio: bio || "",
    profileImageUrl: profileImageUrl || "",
    certifications: certifications || [],
    rating: null,
  });

  res.json({ 
    message: "ثبت‌نام با موفقیت انجام شد. پروفایل در انتظار بررسی است.", 
    professional: await toPublicProfessional(newPro) 
  });
});

professionalsRouter.get("/:id", async (req, res) => {
  const pro = professionalRepository.getProfessionalById(req.params.id);
  if (!pro) return res.status(404).json({ error: "متخصص یافت نشد." });
  res.json({ professional: await toPublicProfessional(pro) });
});

professionalsRouter.get("/", async (req, res) => {
  const pros = (professionalRepository.getProfessionals() || [])
    .filter(p => p.status === "approved" || (p as any).approvalStatus === "APPROVED");
  const publicPros = await Promise.all(pros.map(toPublicProfessional));
  res.json({ professionals: publicPros });
});

export default professionalsRouter;
