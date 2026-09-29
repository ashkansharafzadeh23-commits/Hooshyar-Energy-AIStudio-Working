export interface AdPlan {
  id: string;
  name: string;
  nameFa: string;
  tier: 'bronze' | 'silver' | 'gold';
  priceIRR: number; // Rial
  priceToman: number; // Toman
  durationDays: number;
  placement: 'sidebar' | 'card' | 'banner';
  descriptionFa: string;
}

export const AD_PLANS: Record<string, AdPlan> = {
  ad_plan_bronze: {
    id: 'ad_plan_bronze',
    name: 'Bronze',
    nameFa: 'برنزی',
    tier: 'bronze',
    priceIRR: 100_000_000, // 10,000,000 Toman = 100,000,000 Rial
    priceToman: 10_000_000,
    durationDays: 30,
    placement: 'sidebar',
    descriptionFa: 'نمایش در صفحات داخلی و لیست همکاران'
  },
  ad_plan_silver: {
    id: 'ad_plan_silver',
    name: 'Silver',
    nameFa: 'نقره‌ای',
    tier: 'silver',
    priceIRR: 150_000_000, // 15,000,000 Toman = 150,000,000 Rial
    priceToman: 15_000_000,
    durationDays: 30,
    placement: 'card',
    descriptionFa: 'نمایش در داشبورد تعمیرات و صفحه نتایج'
  },
  ad_plan_gold: {
    id: 'ad_plan_gold',
    name: 'Gold',
    nameFa: 'طلایی',
    tier: 'gold',
    priceIRR: 200_000_000, // 20,000,000 Toman = 200,000,000 Rial
    priceToman: 20_000_000,
    durationDays: 30,
    placement: 'banner',
    descriptionFa: 'نمایش در صفحه اصلی، ابزار سه‌بعدی و نتایج (بالاترین شانس دیده شدن)'
  }
};

// Helper aliases to resolve plan by tier or legacy id
export function resolveAdPlan(planIdOrTier: string): AdPlan | null {
  if (!planIdOrTier || typeof planIdOrTier !== 'string') return null;
  const key = planIdOrTier.toLowerCase().trim();
  
  if (AD_PLANS[key]) return AD_PLANS[key];
  if (key === 'bronze' || key === 'ad_plan_basic') return AD_PLANS.ad_plan_bronze;
  if (key === 'silver') return AD_PLANS.ad_plan_silver;
  if (key === 'gold') return AD_PLANS.ad_plan_gold;
  
  return null;
}
