import { projectRepository } from '../repositories/projectRepository.js';
import { maintenanceRepository } from '../repositories/maintenanceRepository.js';
import { professionalRepository } from '../repositories/professionalRepository.js';
import { TechnicianMatch } from '../types/maintenance.js';

export const technicianMatchingService = {
  /**
   * Matches verified technicians and professionals to a maintenance case
   */
  matchTechnicians: (params: {
    projectId?: string;
    assetId?: string;
    symptoms?: string[];
    category?: string;
    componentType?: string;
    skillsRequired?: string[];
    location?: string;
    province?: string;
    equipmentType?: string;
  }): TechnicianMatch[] => {
    const project = projectRepository.findById(params.projectId);
    const projectCity = (project?.location?.city || (params as any).location || '').toLowerCase();
    
    const allPros = professionalRepository.getProfessionals() || [];
    // Authoritative candidate filtration: Only approved professionals may enter customer-facing matching.
    // Pending, draft, rejected, suspended, unverified, or missing-status professionals MUST NOT enter the matching pipeline at all.
    const candidates = allPros.filter(pro => 
      pro.status === 'approved' || (pro as any).approvalStatus === 'APPROVED'
    );

    const symptomsJoined = (params.symptoms || (params as any).skillsRequired || []).join(' ').toLowerCase();
    const category = (params.category || '').toLowerCase();
    const compType = (params.componentType || (params as any).equipmentType || '').toLowerCase();

    const matches: TechnicianMatch[] = candidates.map(pro => {
      let score = 0;
      const reasons: string[] = [];

      // 1. City / Location Match (Up to 40 pts)
      const proCities = (pro.serviceCities || []).map(c => c.toLowerCase());
      const hasCityMatch = projectCity && proCities.some(c => c.includes(projectCity) || projectCity.includes(c));

      if (hasCityMatch) {
        score += 40;
        reasons.push(`پوشش خدمات در شهر پروژه (${project?.location?.city})`);
      } else if (proCities.length > 0) {
        score += 15;
        reasons.push(`ارائه خدمات در سایر شهرهای مجاور`);
      }

      // 2. Specialty Relevance Match (Up to 35 pts)
      const proSpecialties = (pro.specialties || []).map(s => s.toLowerCase());
      const matchingSpecs: string[] = [];

      const checkKeywords = (keywords: string[], tag: string) => {
        const matchesSymptom = keywords.some(k => 
          symptomsJoined.includes(k) || category.includes(k) || compType.includes(k)
        );
        const matchesPro = keywords.some(k => proSpecialties.some(ps => ps.includes(k)));
        if (matchesPro && matchesSymptom) {
          matchingSpecs.push(tag);
        } else if (matchesPro) {
          // General relevant skill
          matchingSpecs.push(tag);
        }
      };

      checkKeywords(['خورشیدی', 'solar', 'پنل', 'فتوولتائیک'], 'سیستم‌های خورشیدی');
      checkKeywords(['اینورتر', 'inverter', 'مبدل'], 'اینورتر و ادوات قدرت');
      checkKeywords(['باتری', 'battery', 'bms', 'ذخیره‌ساز'], 'باتری و سیستم‌های ذخیره‌ساز');
      checkKeywords(['برق', 'electrical', 'پست', 'فشار متوسط'], 'تاسیسات برق و اتوماسیون خورشیدی');

      if (matchingSpecs.length > 0) {
        const uniqueSpecs = Array.from(new Set(matchingSpecs));
        score += Math.min(35, uniqueSpecs.length * 15);
        reasons.push(`تخصص مرتبط در ${uniqueSpecs.join('، ')}`);
      }

      // 3. Experience Match (Up to 15 pts) - Only when authentic experience exists
      if (typeof pro.yearsExperience === 'number' && pro.yearsExperience > 0) {
        const exp = pro.yearsExperience;
        const expPoints = Math.min(15, Math.round(exp * 1.5));
        if (expPoints > 0) {
          score += expPoints;
          reasons.push(`${exp} سال سابقه کار تخصصی`);
        }
      }

      // 4. Rating & Verification (Up to 10 pts)
      if (typeof pro.rating === 'number' && pro.rating >= 4.0) {
        score += 10;
        reasons.push(`امتیاز کیفیت و رضایت بالا (${pro.rating} از ۵)`);
      }

      if (pro.status === 'approved' || pro.approvalStatus === 'APPROVED') {
        score += 5;
        reasons.push('احراز هویت و تایید مدارک رسمی');
      }

      // Data-truth: score is deterministic. Zero relevance remains 0, never boosted to 20%
      const finalScore = Math.min(100, Math.max(0, score));

      return {
        technicianId: pro.id,
        fullName: pro.fullName || pro.name || null,
        phone: pro.phone,
        specialties: pro.specialties || [],
        serviceCities: pro.serviceCities || [],
        yearsExperience: pro.yearsExperience ?? null,
        rating: pro.rating ?? null,
        matchScore: finalScore,
        matchReasons: reasons,
        status: pro.status || pro.approvalStatus,
        profile: { userId: (pro as any).userId },
        technician: { userId: (pro as any).userId }
      } as any;
    });

    // Sort descending by score
    matches.sort((a, b) => b.matchScore - a.matchScore);
    return matches;
  },

  /**
   * Matches verified technicians for a specific maintenance case ID
   */
  matchTechniciansForCase: (caseId: string): TechnicianMatch[] => {
    const mCase = maintenanceRepository.getCaseById(caseId);
    if (!mCase) return [];
    return technicianMatchingService.matchTechnicians({
      projectId: mCase.projectId,
      assetId: mCase.assetId,
      symptoms: [mCase.title, mCase.description],
      category: mCase.category,
      componentType: mCase.componentId
    });
  }
};
