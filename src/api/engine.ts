// Rule Engine logic (Deterministic)

export interface Appliance {
  id: string;
  name: string;
  defaultWatt: number;
  defaultHours: number;
}

export interface SelectedAppliance {
  id: string;
  quantity: number;
  hours: number;
  watt: number;
}

export const DIVERSITY_FACTORS = {
  residential: 0.6,
  industrial_warehouse: 0.7,
  factory: 0.75,
  agricultural: 0.8,
};

export function calculateDailyConsumption(
  appliances: SelectedAppliance[],
  locationType: keyof typeof DIVERSITY_FACTORS,
  actualMonthlyKwh?: number
) {
  if (actualMonthlyKwh && actualMonthlyKwh > 0) {
    return actualMonthlyKwh / 30; // Daily kWh
  }

  let totalDailyKwh = 0;
  for (const app of appliances) {
    totalDailyKwh += (app.watt / 1000) * app.quantity * app.hours;
  }

  const factor = DIVERSITY_FACTORS[locationType] || 0.6;
  return totalDailyKwh * factor;
}

export function calculateSolarSizing(
  dailyKwh: number,
  usableAreaSqM: number,
  sunHours: number = 5.5,
  panelWatt: number = 550
) {
  const requiredKwp = dailyKwh / (sunHours * 0.775);
  const maxKwpFromArea = usableAreaSqM / 6.5;

  let finalKwp = requiredKwp;
  let spaceConstrained = false;

  if (requiredKwp > maxKwpFromArea) {
    finalKwp = maxKwpFromArea;
    spaceConstrained = true;
  }

  const numberOfPanels = Math.ceil((finalKwp * 1000) / panelWatt);
  const inverterKw = finalKwp * 1.1;

  return { requiredKwp, finalKwp, spaceConstrained, numberOfPanels, inverterKw };
}

export function calculateGeneratorSizing(
  appliances: SelectedAppliance[],
  isThreePhase: boolean
) {
  let totalWatt = 0;
  let maxMotorWatt = 0;

  for (const app of appliances) {
    const totalAppWatt = app.watt * app.quantity;
    totalWatt += totalAppWatt;
    // Simplistic motor check based on wattage or known ids
    if (app.id.includes("ac") || app.id.includes("cooler") || app.id.includes("pump") || app.id.includes("fridge")) {
      if (app.watt > maxMotorWatt) maxMotorWatt = app.watt;
    }
  }

  const continuousKva = (totalWatt / 1000) / 0.8;
  const startingFactor = isThreePhase ? 6 : 3;
  const startingWatt = (maxMotorWatt * startingFactor) + (totalWatt - maxMotorWatt);
  const startingKva = (startingWatt / 1000) / 0.8;

  const finalKva = Math.max(continuousKva, startingKva) * 1.275;

  return { finalKva };
}

export function calculatePowerbankSizing(
  essentialAppliances: SelectedAppliance[],
  supportHours: number
) {
  let totalDailyKwh = 0;
  let maxOutputWatt = 0;

  for (const app of essentialAppliances) {
    totalDailyKwh += (app.watt / 1000) * app.quantity * supportHours; // Only run for supportHours instead of full daily? The prompt says "support hours needed"
    const totalAppWatt = app.watt * app.quantity;
    if (totalAppWatt > maxOutputWatt) maxOutputWatt = totalAppWatt;
  }

  // DoD factor
  const capacityKwh = totalDailyKwh / 0.85; // Assuming Lithium DoD 0.85

  return { capacityKwh, maxOutputWatt };
}

const STANDARD_AREA_PER_KW_M2 = 1.95; // فقط Fallback وقتی ابعاد دقیق پنل در کاتالوگ نیست

export function estimatePanelArea(panel: any) {
  if (panel.widthM && panel.heightM) return panel.widthM * panel.heightM;
  return (panel.powerWatt / 1000) * STANDARD_AREA_PER_KW_M2;
}

export function evaluatePanelOption(panel: any, targetSystemKwp: number, usableAreaM2: number) {
  const panelAreaM2 = estimatePanelArea(panel);
  const idealCount = Math.ceil((targetSystemKwp * 1000) / panel.powerWatt);
  const maxCountBySpace = Math.floor(usableAreaM2 / panelAreaM2);

  const spaceConstrained = idealCount > maxCountBySpace;
  const finalCount = spaceConstrained ? maxCountBySpace : idealCount;

  const actualSystemKwp = +((finalCount * panel.powerWatt) / 1000).toFixed(2);
  const requiredAreaM2 = +(finalCount * panelAreaM2).toFixed(1);
  const totalCost = finalCount * panel.price;
  const costPerWatt = +(panel.price / panel.powerWatt).toFixed(0);
  const wattPerM2 = +(panel.powerWatt / panelAreaM2).toFixed(0); // شاخص فشردگی/بهرهوری فضا

  return {
    productId: panel.id,
    brand: panel.brand,
    model: panel.model,
    panelWattage: panel.powerWatt,
    panelCount: finalCount,
    actualSystemKwp,
    requiredAreaM2,
    spaceConstrained,
    totalCost,
    costPerWatt,
    wattPerM2,
    warrantyYears: panel.warrantyYears || null,
    meetsTargetPower: actualSystemKwp >= targetSystemKwp * 0.95, // ۵٪ تلورانس رندشدن تعداد پنل
  };
}

export function selectPanelOptions({ targetSystemKwp, usableAreaM2, catalogPanels }: any) {
  if (!catalogPanels || catalogPanels.length === 0) {
    return { error: "no_catalog_data", options: [] };
  }

  const evaluated = catalogPanels.map((p: any) => evaluatePanelOption(p, targetSystemKwp, usableAreaM2));

  const fitting = evaluated.filter((o: any) => !o.spaceConstrained && o.meetsTargetPower);
  const pool = fitting.length > 0 ? fitting : evaluated;

  const economy = [...pool].sort((a: any, b: any) => a.totalCost - b.totalCost)[0];
  const balanced = [...pool].sort((a: any, b: any) => a.costPerWatt - b.costPerWatt)[0];
  const spaceSaving = [...pool].sort((a: any, b: any) => b.wattPerM2 - a.wattPerM2)[0];

  const options = [
    { tier: "economy", label: "اقتصادی — کمترین هزینه کل", ...economy },
    { tier: "balanced", label: "متعادل — بهترین قیمت به ازای هر وات", ...balanced },
    { tier: "space_saving", label: "کمفضا — کمترین تعداد پنل و فضای اشغالی", ...spaceSaving },
  ].filter(
    (opt, idx, arr) => arr.findIndex((o) => o.productId === opt.productId) === idx // حذف تکراریها
  );

  return { error: null, options, allSpaceConstrained: fitting.length === 0 };
}
