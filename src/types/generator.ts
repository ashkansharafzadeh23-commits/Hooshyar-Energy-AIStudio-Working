/**
 * HOOSHYAR ENERGY — GENERATOR ASSESSMENT & SIZING CONTRACTS
 * Stage 13.11-C: Standalone Generator Needs Assessment & Preliminary Sizing
 *
 * Explicitly decoupled from solar calculations. No combined solar-generator engineering.
 */

export type GeneratorApplication =
  | 'RESIDENTIAL'
  | 'COMMERCIAL'
  | 'INDUSTRIAL'
  | 'AGRICULTURAL'
  | 'OTHER';

export type ElectricalPhaseType =
  | 'SINGLE_PHASE'
  | 'THREE_PHASE'
  | 'UNKNOWN';

export type GeneratorDutyType =
  | 'STANDBY_EMERGENCY' // قطعی موقت و اضطراری
  | 'PRIME_POWER'        // بهره‌برداری طولانی‌مدت / روزانه
  | 'CONTINUOUS';        // دائم‌کار صنعتی

export type GeneratorFuelType =
  | 'GASOLINE'      // بنزینی
  | 'NATURAL_GAS'   // گازسوز شهری (CNG/NG)
  | 'DIESEL'        // دیزل / گازوئیل
  | 'DUAL_FUEL';    // دوگانه‌سوز

export type MotorStartingType =
  | 'DIRECT_ONLINE'      // استارت مستقیم (DOL) - ضریب معمولاً ۵ تا ۷ برابر
  | 'STAR_DELTA'        // ستاره-مثلث - ضریب حدود ۲.۵ تا ۳ برابر
  | 'SOFT_STARTER'       // سافت‌استارتر - ضریب حدود ۲ تا ۳ برابر
  | 'VFD_INVERTER'       // درایو فرکانس متغیر (VFD) - ضریب حدود ۱.۱ تا ۱.۳ برابر
  | 'UNKNOWN';           // نامشخص

export interface LoadItemInput {
  id: string;
  name: string;
  category:
    | 'LIGHTING'
    | 'REFRIGERATION'
    | 'TELECOM_IT'
    | 'PUMP'
    | 'HVAC'
    | 'AGRICULTURAL'
    | 'WORKSHOP'
    | 'MACHINERY'
    | 'CUSTOM';
  runningWatts: number;
  quantity: number;
  isMotorDriven: boolean;
  startingCurrentKnown?: boolean;
  startingMultiplier?: number; // e.g. 3.0, 5.0 or undefined if unknown
  startingWatts?: number;      // specific starting wattage if measured or from nameplate
  startingType?: MotorStartingType;
  notes?: string;
}

export interface GeneratorAssessmentInput {
  application: GeneratorApplication;
  phase: ElectricalPhaseType;
  dutyType: GeneratorDutyType;
  availableFuels: GeneratorFuelType[];
  typicalOutageHours?: number;
  requiredBackupHours?: number;
  installationEnvironment: 'INDOOR_VENTILATED' | 'OUTDOOR_COVERED' | 'OUTDOOR_OPEN' | 'UNKNOWN';
  loads: LoadItemInput[];
  powerFactorAssumption?: number; // Default 0.8 for AC gensets unless specified
  engineeringReservePercent?: number; // Default 20% (planning headroom)
  futureExpansionPercent?: number;    // Optional expansion headroom
  budgetTomanRange?: {
    minToman?: number;
    maxToman?: number;
  };
  locationCity?: string;
  locationProvince?: string;
}

export type SizingConfidenceStatus =
  | 'PRELIMINARY_ESTIMATE'
  | 'NEEDS_ADDITIONAL_INFORMATION'
  | 'REQUIRES_PROFESSIONAL_REVIEW';

export interface GeneratorEngineeringWarning {
  code: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL_SAFETY';
  title: string;
  description: string;
}

export interface GeneratorSizingResult {
  status: SizingConfidenceStatus;
  isCalculable: boolean;
  
  // Power Metrics
  totalRunningWatts: number;
  totalRunningKw: number;
  powerFactor: number;
  runningKva: number;
  
  // Engineering Reserve & Sizing
  engineeringReservePercent: number;
  preliminaryRecommendedKw: number | null;
  preliminaryRecommendedKva: number | null;
  
  // Motor-driven dynamics & Starting Demand
  hasMotorLoads: boolean;
  hasUnknownMotorStarting: boolean;
  startingCapabilityStatus?: 'NOT_APPLICABLE' | 'UNVERIFIED' | 'NEEDS_MANUFACTURER_DATA';
  estimatedPeakStartingKva: number | null;
  largestMotorStartingKva: number | null;
  
  // Operational and Electrical Attributes
  phase: ElectricalPhaseType;
  dutyType: GeneratorDutyType;
  availableFuels: GeneratorFuelType[];
  requiredBackupHours?: number;
  
  // Diagnostics & Transparency
  warnings: GeneratorEngineeringWarning[];
  missingInputs: string[];
  assumptions: string[];
  safetyNotices: string[];
  disclaimers: string[];
  
  // Metadata
  calculatedAt: string;
}
