import express from "express";
import { professionalRepository } from '../repositories/professionalRepository.js';

const professionalsRouter = express.Router();

export interface PublicProfessionalProfile {
  id: string;
  fullName: string | null;
  specialties: string[];
  serviceCities: string[];
  yearsExperience: number | null;
  bio: string | null;
  profileImageUrl: string | null;
  verified: boolean;
  status: string;
  createdAt: string | null;
}

export function toPublicProfessional(pro: any): PublicProfessionalProfile {
  const hasExp = pro.yearsExperience !== undefined && pro.yearsExperience !== null && pro.yearsExperience !== '';
  return {
    id: pro.id,
    fullName: pro.fullName || null,
    specialties: Array.isArray(pro.specialties) ? pro.specialties : (pro.specialties ? [pro.specialties] : []),
    serviceCities: Array.isArray(pro.serviceCities) ? pro.serviceCities : (pro.serviceCities ? [pro.serviceCities] : []),
    yearsExperience: hasExp ? Number(pro.yearsExperience) : null,
    bio: pro.bio || null,
    profileImageUrl: pro.profileImageUrl || null,
    verified: pro.status === "approved" || pro.approvalStatus === "APPROVED",
    status: pro.status || pro.approvalStatus,
    createdAt: pro.createdAt || null,
  };
}

professionalsRouter.post("/register", (req, res) => {
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
    professional: toPublicProfessional(newPro) 
  });
});

professionalsRouter.get("/:id", (req, res) => {
  const pro = professionalRepository.getProfessionalById(req.params.id);
  if (!pro) return res.status(404).json({ error: "متخصص یافت نشد." });
  res.json({ professional: toPublicProfessional(pro) });
});

professionalsRouter.get("/", (req, res) => {
  const pros = (professionalRepository.getProfessionals() || [])
    .filter(p => p.status === "approved" || (p as any).approvalStatus === "APPROVED")
    .map(toPublicProfessional);
  res.json({ professionals: pros });
});

export default professionalsRouter;
