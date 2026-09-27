import fs from "fs";

import { EnergyProject, ProjectMember, ProjectDocument, ProjectActivity } from '../types/project.js';
import { ProjectRFQ, RFQInvitation, EPCBid, EPCBidRevision } from '../types/rfq.js';
import { Organization } from '../types/organization.js';
import { ProjectFinancialModel, FinancialAssumptionSet, FinancialScenario, ProjectProposal } from '../types/finance.js';
import { InvestmentOpportunity, LandProfile, InvestorProfile, ProjectMatch, ProjectReadinessScore } from '../types/investment.js';
import { BillOfQuantities, BOQItem, ProcurementRFQ, ProcurementPackage, SupplierInvitation, VendorQuote, VendorQuoteItem, VendorQuoteRevision, SupplierAward, PurchaseOrder, PurchaseOrderItem, DeliveryRecord, DeliveryItem, DeliveryInspection } from '../types/procurement.js';
import { EnergyAsset, AssetComponent, EquipmentWarranty, CommissioningRecord, CommissioningTest, AssetOwnershipRecord, AssetPassportSnapshot, AssetPerformanceBaseline, ProjectHandover, FinalProjectCostSummary, PunchListItem } from '../types/asset.js';
import { TelemetrySource, TelemetryReading, AssetPerformanceSnapshot, AssetHealthAssessment } from '../types/monitoring.js';
import { AssetAlert, AlertRule, MaintenanceCase, MaintenanceDiagnosis, MaintenanceAction, MaintenanceAssignmentHistory } from '../types/maintenance.js';
import { FinancialPartnerProfile, FinancingProduct, FinancingRequest, FinanceReadinessSnapshot, FinancialPartnerMatch, FinancingSubmission, FinanceInformationRequest, FinancingOffer, ProjectFinancingRecord, FinanceReviewNote, FinanceDueDiligenceChecklist, FinancingNeed, FinancingApplication, FinancingPartner, FinancingAgreementRecord } from '../types/financing.js';
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ProjectContract, ContractParty, ContractRevision, ProjectMilestone, MilestoneDependency, ApprovalRequest, ChangeRequest, ProjectBaseline } from '../types/execution.js';
import { Portfolio, OrganizationMember } from '../types/portfolio.js';

let currentDbPath = process.env.TEST_DB_PATH || path.join(process.cwd(), "db.json");

export const getDBPath = () => currentDbPath;
export const setDBPath = (newPath: string) => {
  currentDbPath = newPath;
};

interface Vendor {
  id: string;
  companyName: string;
  logoUrl: string;
  aboutUs: string;
  categories: string[];
  address: string;
  city: string;
  location?: { lat: number; lng: number };
  phones: { label: string; number: string }[];
  workingHours: string;
  website: string;
  status: "pending_review" | "approved" | "rejected";
  createdAt: string;
}

interface Product {
  id: string;
  vendorId: string;
  category: string;
  brand: string;
  model: string;
  specs: any;
  price: number;
  currency: string;
  images: string[];
  description: string;
  inStock: boolean;
  warrantyYears: number;
  createdAt: string;
}



export interface SolarAsset {
  id: string;
  projectId?: string | null;
  projectName: string;
  ownerId: string;
  epcCompanyId: string | null;
  location: { city: string; lat: number | null; lon: number | null };
  capacityKw: number;
  technology: string;
  commissionDate: string | null;
  projectStatus: "DRAFT" | "SUBMITTED" | "DOCUMENT_REVIEW" | "APPROVED" | "REJECTED";
  projectValueIRR: number | null;
  expectedAnnualGenerationKwh: number | null;
  projectLifetimeYears: number;
  verificationStatus: "not_verified" | "pending_review" | "verified";
  createdAt: string;
  updatedAt: string;
}

export interface AssetDocument {
  id: string;
  assetId: string;
  documentType: "ownership" | "permit" | "epc_contract" | "om_contract" | "equipment_invoice" | "other";
  fileUrl: string;
  uploadedBy: string;
  verificationStatus: "pending_review" | "verified" | "rejected";
  verificationNotes: string;
  createdAt: string;
}

export interface AssetAuditLog {
  id: string;
  assetId: string;
  userId: string;
  action: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
}

export interface User {
  roles?: string[]; // e.g. ["customer", "PROJECT_OWNER", "ADMIN"]
  id: string;
  phone: string;
  name: string;
  createdAt: string;
  activeSubscriptionId: string | null;
}

export interface OTP {
  phone: string;
  code: string;
  expiresAt: number;
}

export interface Professional {
  id: string;
  userId?: string;
  fullName: string;
  phone: string;
  specialties: string[];
  serviceCities: string[];
  yearsExperience: number;
  bio: string;
  profileImageUrl: string;
  certifications: { title: string; imageUrl: string }[];
  status: "pending_review" | "approved" | "rejected";
  rating: number | null;
  createdAt: string;
}

export interface Ad {
  id: string;
  ownerType: "vendor" | "professional";
  ownerId: string;
  title: string;
  imageUrl: string;
  linkTo: string;
  placement: string;
  startDate: string;
  endDate: string;
  status: "pending_review" | "active" | "expired" | "rejected";
  planId: string;
  createdAt: string;
}

export interface AnalysisHistory {
  id: string;
  userId: string;
  projectId?: string | null;
  createdAt: string;
  input: any;
  resultSummary: string;
  fullResult: any;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceIRR: number;
  durationDays: number | null;
  features: string[];
}

export interface Transaction {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  authority: string | null;
  status: "pending" | "success" | "failed";
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface CityIrradianceCache {
  city: string;
  sunHours: number;
  coords: { lat: number; lon: number };
  fetchedAt: number;
  monthlySunHours?: Record<string, number>;
}

interface DB {
  financialPartnerProfiles?: FinancialPartnerProfile[];
  financingPartners?: FinancingPartner[];
  financingProducts?: FinancingProduct[];
  financingRequests?: FinancingRequest[];
  financingNeeds?: FinancingNeed[];
  financingApplications?: FinancingApplication[];
  financeReadinessSnapshots?: FinanceReadinessSnapshot[];
  financialPartnerMatches?: FinancialPartnerMatch[];
  financingSubmissions?: FinancingSubmission[];
  financeInformationRequests?: FinanceInformationRequest[];
  financingOffers?: FinancingOffer[];
  projectFinancingRecords?: ProjectFinancingRecord[];
  financingAgreements?: FinancingAgreementRecord[];
  financeReviewNotes?: FinanceReviewNote[];
  financeDueDiligenceChecklists?: FinanceDueDiligenceChecklist[];
  energyAssets?: EnergyAsset[];
  assetComponents?: AssetComponent[];
  
  commissioningRecords?: CommissioningRecord[];
  commissioningTests?: CommissioningTest[];
  assetOwnershipRecords?: AssetOwnershipRecord[];
  assetPassportSnapshots?: AssetPassportSnapshot[];
  assetPerformanceBaselines?: AssetPerformanceBaseline[];
  telemetrySources?: TelemetrySource[];
  telemetryReadings?: TelemetryReading[];
  assetPerformanceSnapshots?: AssetPerformanceSnapshot[];
  assetHealthAssessments?: AssetHealthAssessment[];
  assetAlerts?: AssetAlert[];
  alertRules?: AlertRule[];
  maintenanceCases?: MaintenanceCase[];
  maintenanceDiagnoses?: MaintenanceDiagnosis[];
  maintenanceActions?: MaintenanceAction[];
  maintenanceAssignmentHistories?: MaintenanceAssignmentHistory[];
  projectHandovers?: ProjectHandover[];
  finalProjectCostSummaries?: FinalProjectCostSummary[];
  boqs?: BillOfQuantities[];
  boqItems?: BOQItem[];
  procurementPackages?: ProcurementPackage[];
  procurementRfqs?: ProcurementRFQ[];
  supplierInvitations?: SupplierInvitation[];
  vendorQuotes?: VendorQuote[];
  vendorQuoteItems?: VendorQuoteItem[];
  vendorQuoteRevisions?: VendorQuoteRevision[];
  supplierAwards?: SupplierAward[];
  purchaseOrders?: PurchaseOrder[];
  purchaseOrderItems?: PurchaseOrderItem[];
  deliveryRecords?: DeliveryRecord[];
  deliveryItems?: DeliveryItem[];
  deliveryInspections?: DeliveryInspection[];
  punchListItems?: PunchListItem[];
  equipmentWarranties?: EquipmentWarranty[];
  projectContracts?: ProjectContract[];
  contractParties?: ContractParty[];
  contractRevisions?: ContractRevision[];
  projectBaselines?: ProjectBaseline[];
  changeRequests?: ChangeRequest[];
  projectMilestones?: ProjectMilestone[];
  approvalRequests?: ApprovalRequest[];
  projectRfqs?: ProjectRFQ[];
  rfqInvitations?: RFQInvitation[];
  epcBids?: EPCBid[];
  epcBidRevisions?: EPCBidRevision[];
  energyProjects?: EnergyProject[];
  projectMembers?: ProjectMember[];
  projectDocuments?: ProjectDocument[];
  projectActivities?: ProjectActivity[];
  organizations?: Organization[];
  portfolios?: Portfolio[];
  organizationMembers?: OrganizationMember[];
  financialModels?: ProjectFinancialModel[];
  financialAssumptionSets?: FinancialAssumptionSet[];
  financialScenarios?: FinancialScenario[];
  projectProposals?: ProjectProposal[];
  investmentOpportunities?: InvestmentOpportunity[];
  landProfiles?: LandProfile[];
  investorProfiles?: InvestorProfile[];
  projectMatches?: ProjectMatch[];
  projectReadinessScores?: ProjectReadinessScore[];
  solarAssets: SolarAsset[];
  assetDocuments: AssetDocument[];
  assetAuditLogs: AssetAuditLog[];
  vendors: Vendor[];
  products: Product[];
  users: User[];
  otps: OTP[];
  professionals: Professional[];
  ads: Ad[];
  analysisHistory: AnalysisHistory[];
  aiRecommendationLogs?: any[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  subscriptionPlans: SubscriptionPlan[];
  cityIrradianceCache: CityIrradianceCache[];
}

const defaultDB: DB = {
  solarAssets: [],
  assetDocuments: [],
  assetAuditLogs: [],

  users: [],
  otps: [],
  professionals: [],
  ads: [],
  analysisHistory: [],
  transactions: [],
  subscriptions: [],
  cityIrradianceCache: [],
  subscriptionPlans: [
    { id: "plan_free", name: "رایگان", priceIRR: 0, durationDays: null, features: ["۳ تحلیل رایگان در ماه"] },
    { id: "plan_pro", name: "حرفه‌ای", priceIRR: 990000, durationDays: 30, features: ["تحلیل نامحدود", "دسترسی به تاریخچه کامل", "اولویت در نمایش پیشنهاد فروشندگان"] }
  ],

  vendors: [
    {
      id: "vendor_001",
      companyName: "انرژی نوین",
      logoUrl: "",
      aboutUs: "ارائه‌دهنده راهکارهای انرژی تجدیدپذیر",
      categories: ["solar_panel", "inverter", "battery"],
      address: "خیابان ولیعصر",
      city: "تهران",
      phones: [{ label: "فروش", number: "021-12345678" }],
      workingHours: "۸ الی ۱۷",
      website: "https://example.com",
      status: "approved",
      createdAt: new Date().toISOString(),
    }
  ],
  products: [
    {
      id: "prod_001",
      vendorId: "vendor_001",
      category: "solar_panel",
      brand: "JA Solar",
      model: "JAM54S31-550/MR",
      specs: { powerWatt: 550, widthM: 1.13, heightM: 2.27, type: "monocrystalline" },
      price: 4500000,
      currency: "IRR",
      images: [],
      description: "پنل خورشیدی 550 وات مونوکریستال هالف سل",
      inStock: true,
      warrantyYears: 12,
      createdAt: new Date().toISOString(),
    },
    {
      id: "prod_001b",
      vendorId: "vendor_001",
      category: "solar_panel",
      brand: "Yingli",
      model: "YL300P-29b",
      specs: { powerWatt: 300, widthM: 0.99, heightM: 1.64, type: "polycrystalline" },
      price: 2000000,
      currency: "IRR",
      images: [],
      description: "پنل خورشیدی 300 وات پلی کریستال (اقتصادی)",
      inStock: true,
      warrantyYears: 10,
      createdAt: new Date().toISOString(),
    },
    {
      id: "prod_001c",
      vendorId: "vendor_001",
      category: "solar_panel",
      brand: "SunPower",
      model: "Maxeon 6",
      specs: { powerWatt: 475, widthM: 1.04, heightM: 1.81, type: "monocrystalline" },
      price: 6500000,
      currency: "IRR",
      images: [],
      description: "پنل خورشیدی 475 وات راندمان بالا (کم‌فضا)",
      inStock: true,
      warrantyYears: 25,
      createdAt: new Date().toISOString(),
    },
    {
      id: "prod_002",
      vendorId: "vendor_001",
      category: "generator",
      brand: "Hyundai",
      model: "HG5355-PG",
      specs: { kva: 3, fuelType: "petrol", phase: 1 },
      price: 15000000,
      currency: "IRR",
      images: [],
      description: "موتور برق 3 کیلووات هیوندای",
      inStock: true,
      warrantyYears: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: "prod_003",
      vendorId: "vendor_001",
      category: "powerbank",
      brand: "EcoFlow",
      model: "DELTA Max",
      specs: { capacityKwh: 2, outputWatt: 2400 },
      price: 85000000,
      currency: "IRR",
      images: [],
      description: "پاوربانک خانگی 2 کیلووات ساعت با خروجی 2400 وات",
      inStock: true,
      warrantyYears: 2,
      createdAt: new Date().toISOString(),
    },
    {
      id: "prod_004",
      vendorId: "vendor_001",
      category: "inverter",
      brand: "Growatt",
      model: "MIN 5000TL-X",
      specs: { powerKw: 5, phase: 1, mode: "on-grid" },
      price: 32000000,
      currency: "IRR",
      images: [],
      description: "اینورتر متصل به شبکه 5 کیلووات تک فاز",
      inStock: true,
      warrantyYears: 5,
      createdAt: new Date().toISOString(),
    }
  ],
};
function readDB(): DB {
  if (!fs.existsSync(currentDbPath)) {
    writeDB(defaultDB);
    return defaultDB;
  }
  const data = fs.readFileSync(currentDbPath, "utf-8");
  try {
    const raw = JSON.parse(data) as Partial<DB>;
    const parsed: DB = { ...defaultDB, ...raw };
    if (!parsed.subscriptionPlans || parsed.subscriptionPlans.length === 0) {
      parsed.subscriptionPlans = defaultDB.subscriptionPlans;
    }
    if (!parsed.transactions) {
      parsed.transactions = [];
    }
    if (!parsed.subscriptions) {
      parsed.subscriptions = [];
    }
    if (!parsed.users) {
      parsed.users = [];
    }
    return parsed;
  } catch {
    return defaultDB;
  }
}

function writeDB(data: DB) {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_LOCAL_STORAGE) {
    throw new Error('FATAL: Filesystem database mutation is strictly forbidden in production mode. Use PostgreSQL adapter.');
  }
  const repoDbPath = path.resolve(process.cwd(), 'db.json');
  if (process.env.NODE_ENV === 'test' && path.resolve(currentDbPath) === repoDbPath) {
    throw new Error('FATAL: Test environment attempted write to repository db.json! Test database must be isolated via TEST_DB_PATH or setDBPath.');
  }
  fs.writeFileSync(currentDbPath, JSON.stringify(data, null, 2));
}

const defaultEPCs: Organization[] = [
  {
    id: "org_epc_001",
    legalName: "مهندسی توسعه انرژی‌های نوید خورشید پارس (سهامی خاص)",
    tradeName: "پارس سولار EPC",
    type: "EPC_CONTRACTOR",
    registrationNumber: "452109",
    nationalId: "14005891230",
    verificationStatus: "VERIFIED",
    createdAt: "2025-01-10T10:00:00.000Z",
    updatedAt: "2025-01-10T10:00:00.000Z"
  },
  {
    id: "org_epc_002",
    legalName: "شرکت صنایع نیروگاهی و انرژی پاک البرز",
    tradeName: "البرز کلین انرژی",
    type: "EPC_CONTRACTOR",
    registrationNumber: "389211",
    nationalId: "14003217890",
    verificationStatus: "VERIFIED",
    createdAt: "2025-01-12T11:00:00.000Z",
    updatedAt: "2025-01-12T11:00:00.000Z"
  },
  {
    id: "org_epc_003",
    legalName: "گروه مهندسی خورشید تابان آریا",
    tradeName: "آریا سولار",
    type: "EPC_CONTRACTOR",
    registrationNumber: "512490",
    nationalId: "14008923451",
    verificationStatus: "VERIFIED",
    createdAt: "2025-01-15T09:30:00.000Z",
    updatedAt: "2025-01-15T09:30:00.000Z"
  }
];

export const db: any = {

  // Execution & Workspace
  getProjectContracts: (projectId?: string) => {
    const list = readDB().projectContracts || [];
    return projectId ? list.filter((c: any) => c.projectId === projectId) : list;
  },
  getContractById: (id: string) => readDB().projectContracts?.find(c => c.id === id),
  createContract: (contract: Omit<ProjectContract, "id" | "createdAt" | "updatedAt">) => {
    const data = readDB();
    if (!data.projectContracts) data.projectContracts = [];
    const newContract = { ...contract, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.projectContracts.push(newContract as ProjectContract);
    writeDB(data);
    return newContract;
  },
  updateContract: (id: string, updates: Partial<ProjectContract>) => {
    const data = readDB();
    if (!data.projectContracts) data.projectContracts = [];
    const index = data.projectContracts.findIndex(c => c.id === id);
    if (index !== -1) {
      data.projectContracts[index] = { ...data.projectContracts[index], ...updates, updatedAt: new Date().toISOString() };
      writeDB(data);
      return data.projectContracts[index];
    }
    return null;
  },
  getProjectMilestones: (projectId: string) => readDB().projectMilestones?.filter(m => m.projectId === projectId) || [],
  getMilestoneById: (id: string) => readDB().projectMilestones?.find((m: any) => m.id === id),
  createMilestone: (milestone: Omit<ProjectMilestone, "id" | "createdAt" | "updatedAt">) => {
    const data = readDB();
    if (!data.projectMilestones) data.projectMilestones = [];
    const newMilestone = { ...milestone, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.projectMilestones.push(newMilestone as ProjectMilestone);
    writeDB(data);
    return newMilestone;
  },
  updateMilestone: (id: string, updates: Partial<ProjectMilestone>) => {
    const data = readDB();
    if (!data.projectMilestones) data.projectMilestones = [];
    const index = data.projectMilestones.findIndex(m => m.id === id);
    if (index !== -1) {
      data.projectMilestones[index] = { ...data.projectMilestones[index], ...updates, updatedAt: new Date().toISOString() };
      writeDB(data);
      return data.projectMilestones[index];
    }
    return null;
  },
  deleteMilestone: (id: string) => {
    const data = readDB();
    if (!data.projectMilestones) return false;
    const initialLen = data.projectMilestones.length;
    data.projectMilestones = data.projectMilestones.filter(m => m.id !== id);
    if (data.projectMilestones.length !== initialLen) {
      writeDB(data);
      return true;
    }
    return false;
  },
  getContractParties: (contractId: string) => readDB().contractParties?.filter((p: any) => p.contractId === contractId) || [],
  createContractParty: (party: Omit<ContractParty, "id">) => {
    const data = readDB();
    if (!data.contractParties) data.contractParties = [];
    const newParty = { ...party, id: uuidv4() };
    data.contractParties.push(newParty as ContractParty);
    writeDB(data);
    return newParty;
  },
  updateContractParty: (id: string, updates: Partial<ContractParty>) => {
    const data = readDB();
    if (!data.contractParties) data.contractParties = [];
    const index = data.contractParties.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      data.contractParties[index] = { ...data.contractParties[index], ...updates };
      writeDB(data);
      return data.contractParties[index];
    }
    return null;
  },
  getChangeRequests: (contractId: string) => readDB().changeRequests?.filter((c: any) => c.contractId === contractId) || [],
  getChangeRequestsByProjectId: (projectId?: string) => {
    const list = readDB().changeRequests || [];
    return projectId ? list.filter((c: any) => c.projectId === projectId) : list;
  },
  getChangeRequestById: (id: string) => readDB().changeRequests?.find((c: any) => c.id === id),
  createChangeRequest: (cr: Omit<ChangeRequest, "id" | "createdAt">) => {
    const data = readDB();
    if (!data.changeRequests) data.changeRequests = [];
    const newCR = { ...cr, id: uuidv4(), createdAt: new Date().toISOString() };
    data.changeRequests.push(newCR as ChangeRequest);
    writeDB(data);
    return newCR;
  },
  updateChangeRequest: (id: string, updates: Partial<ChangeRequest>) => {
    const data = readDB();
    if (!data.changeRequests) data.changeRequests = [];
    const index = data.changeRequests.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      data.changeRequests[index] = { ...data.changeRequests[index], ...updates };
      writeDB(data);
      return data.changeRequests[index];
    }
    return null;
  },
  getProjectBaseline: (projectId: string) => readDB().projectBaselines?.find((b: any) => b.projectId === projectId && b.status !== 'SUPERSEDED') || readDB().projectBaselines?.find((b: any) => b.projectId === projectId) || null,
  getProjectBaselines: (projectId: string) => readDB().projectBaselines?.filter((b: any) => b.projectId === projectId) || [],
  getProjectBaselineById: (id: string) => readDB().projectBaselines?.find((b: any) => b.id === id),
  createProjectBaseline: (bl: Omit<ProjectBaseline, "id" | "createdAt">) => {
    const data = readDB();
    if (!data.projectBaselines) data.projectBaselines = [];
    const newBaseline = { ...bl, id: uuidv4(), createdAt: new Date().toISOString() };
    data.projectBaselines.push(newBaseline as ProjectBaseline);
    writeDB(data);
    return newBaseline;
  },
  updateProjectBaseline: (id: string, updates: Partial<ProjectBaseline>) => {
    const data = readDB();
    if (!data.projectBaselines) data.projectBaselines = [];
    const index = data.projectBaselines.findIndex((b: any) => b.id === id);
    if (index !== -1) {
      data.projectBaselines[index] = { ...data.projectBaselines[index], ...updates, updatedAt: new Date().toISOString() };
      writeDB(data);
      return data.projectBaselines[index];
    }
    return null;
  },
  getContractRevisions: (contractId?: string) => {
    const list = readDB().contractRevisions || [];
    return contractId ? list.filter((r: any) => r.contractId === contractId) : list;
  },
  createContractRevision: (rev: Omit<ContractRevision, "id" | "createdAt">) => {
    const data = readDB();
    if (!data.contractRevisions) data.contractRevisions = [];
    const newRev = { ...rev, id: uuidv4(), createdAt: new Date().toISOString() };
    data.contractRevisions.push(newRev as ContractRevision);
    writeDB(data);
    return newRev;
  },
  getApprovalRequests: (projectId: string) => readDB().approvalRequests?.filter(a => a.projectId === projectId) || [],
  getApprovalRequestById: (id: string) => readDB().approvalRequests?.find(a => a.id === id),
  createApprovalRequest: (req: Omit<ApprovalRequest, "id" | "requestedAt">) => {
    const data = readDB();
    if (!data.approvalRequests) data.approvalRequests = [];
    const newReq = { ...req, id: uuidv4(), requestedAt: new Date().toISOString() };
    data.approvalRequests.push(newReq as ApprovalRequest);
    writeDB(data);
    return newReq;
  },
  updateApprovalRequest: (id: string, updates: Partial<ApprovalRequest>) => {
    const data = readDB();
    if (!data.approvalRequests) data.approvalRequests = [];
    const index = data.approvalRequests.findIndex(a => a.id === id);
    if (index !== -1) {
      data.approvalRequests[index] = { ...data.approvalRequests[index], ...updates };
      writeDB(data);
      return data.approvalRequests[index];
    }
    return null;
  },

  getEnergyProjects: () => readDB().energyProjects || [],
  getEnergyProjectById: (id: string) => readDB().energyProjects?.find(p => p.id === id),
  getProjectById: (id: string) => readDB().energyProjects?.find(p => p.id === id), // Alias for getEnergyProjectById
  createEnergyProject: (project: Omit<EnergyProject, "id" | "createdAt" | "updatedAt">) => {
    const data = readDB();
    if (!data.energyProjects) data.energyProjects = [];
    const newProject = { ...project, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.energyProjects.push(newProject as EnergyProject);
    writeDB(data);
    return newProject as EnergyProject;
  },
  createProject: (project: any) => {
    // Alias for createEnergyProject to support test files
    const data = readDB();
    if (!data.energyProjects) data.energyProjects = [];
    const newProject = { 
      ...project, 
      projectCode: project.projectCode || `PRJ-${Date.now()}`,
      title: project.title || project.name || 'Untitled Project',
      projectType: project.type || project.projectType || 'SOLAR',
      ownerId: project.userId || project.ownerId,
      targetCapacityKw: project.capacityKw || project.targetCapacityKw || 0,
      location: project.location || { province: project.province, city: project.city },
      status: project.status || 'DRAFT',
      id: uuidv4(), 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString() 
    };
    data.energyProjects.push(newProject as EnergyProject);
    writeDB(data);
    return newProject as EnergyProject;
  },
  updateEnergyProject: (id: string, updates: Partial<EnergyProject>) => {
    const data = readDB();
    if (!data.energyProjects) data.energyProjects = [];
    const index = data.energyProjects.findIndex(p => p.id === id);
    if (index !== -1) {
      data.energyProjects[index] = { ...data.energyProjects[index], ...updates, updatedAt: updates.updatedAt || new Date().toISOString() };
      writeDB(data);
      return data.energyProjects[index];
    }
    return null;
  },
  updateProject: (id: string, updates: any) => {
    const data = readDB();
    if (!data.energyProjects) data.energyProjects = [];
    const index = data.energyProjects.findIndex(p => p.id === id);
    if (index !== -1) {
      data.energyProjects[index] = { ...data.energyProjects[index], ...updates, updatedAt: new Date().toISOString() };
      writeDB(data);
      return data.energyProjects[index];
    }
    return null;
  },
  
  getProjectMembers: (projectId: string) => (readDB().projectMembers || []).filter(m => m.projectId === projectId),
  createProjectMember: (member: Omit<ProjectMember, "id" | "createdAt">) => {
    const data = readDB();
    if (!data.projectMembers) data.projectMembers = [];
    const newMember = { ...member, id: uuidv4(), createdAt: new Date().toISOString() };
    data.projectMembers.push(newMember as ProjectMember);
    writeDB(data);
    return newMember as ProjectMember;
  },

  getProjectDocuments: (projectId: string) => (readDB().projectDocuments || []).filter(d => d.projectId === projectId),
  createProjectDocument: (doc: Omit<ProjectDocument, "id" | "createdAt">) => {
    const data = readDB();
    if (!data.projectDocuments) data.projectDocuments = [];
    const newDoc = { ...doc, id: uuidv4(), createdAt: new Date().toISOString() };
    data.projectDocuments.push(newDoc as ProjectDocument);
    writeDB(data);
    return newDoc as ProjectDocument;
  },

  getProjectActivities: (projectId: string) => (readDB().projectActivities || []).filter(a => a.projectId === projectId),
  createProjectActivity: (activity: Omit<ProjectActivity, "id" | "createdAt">) => {
    const data = readDB();
    if (!data.projectActivities) data.projectActivities = [];
    const newActivity = { ...activity, id: uuidv4(), createdAt: new Date().toISOString() };
    data.projectActivities.push(newActivity as ProjectActivity);
    writeDB(data);
    return newActivity as ProjectActivity;
  },

  getOrganizations: () => {
    const list = readDB().organizations || [];
    if (list.length === 0) return defaultEPCs;
    // ensure default EPCs are also included if not already
    const ids = new Set(list.map(o => o.id));
    const merged = [...list];
    for (const epc of defaultEPCs) {
      if (!ids.has(epc.id)) merged.push(epc);
    }
    return merged;
  },
  getOrganizationById: (id: string) => {
    const list = readDB().organizations || [];
    const found = list.find(o => o.id === id);
    if (found) return found;
    return defaultEPCs.find(o => o.id === id);
  },
  createOrganization: (org: Omit<Organization, "id" | "createdAt" | "updatedAt">) => {
    const data = readDB();
    if (!data.organizations) data.organizations = [];
    const newOrg = { ...org, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.organizations.push(newOrg as Organization);
    writeDB(data);
    return newOrg as Organization;
  },

  // Portfolios (Phase 9)
  getPortfolios: (orgId?: string) => {
    const list = readDB().portfolios || [];
    if (orgId) return list.filter(p => p.organizationId === orgId);
    return list;
  },
  getPortfolioById: (id: string) => (readDB().portfolios || []).find(p => p.id === id),
  createPortfolio: (portfolio: Omit<Portfolio, "id" | "createdAt" | "updatedAt">) => {
    const data = readDB();
    if (!data.portfolios) data.portfolios = [];
    const newPortfolio: Portfolio = {
      ...portfolio,
      id: uuidv4(),
      projectIds: portfolio.projectIds || [],
      assetIds: portfolio.assetIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.portfolios.push(newPortfolio);
    writeDB(data);
    return newPortfolio;
  },
  updatePortfolio: (id: string, updates: Partial<Portfolio>) => {
    const data = readDB();
    if (!data.portfolios) data.portfolios = [];
    const index = data.portfolios.findIndex(p => p.id === id);
    if (index !== -1) {
      data.portfolios[index] = {
        ...data.portfolios[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      writeDB(data);
      return data.portfolios[index];
    }
    return null;
  },
  deletePortfolio: (id: string) => {
    const data = readDB();
    if (!data.portfolios) return false;
    const initialLen = data.portfolios.length;
    data.portfolios = data.portfolios.filter(p => p.id !== id);
    if (data.portfolios.length !== initialLen) {
      writeDB(data);
      return true;
    }
    return false;
  },

  // Organization Members (Phase 9)
  getOrganizationMembers: (orgId: string) => {
    return (readDB().organizationMembers || []).filter(m => m.organizationId === orgId);
  },
  getOrganizationMember: (orgId: string, userId: string) => {
    return (readDB().organizationMembers || []).find(m => m.organizationId === orgId && m.userId === userId);
  },
  getOrganizationMembersByUserId: (userId: string) => {
    return (readDB().organizationMembers || []).filter(m => m.userId === userId);
  },
  createOrganizationMember: (member: Omit<OrganizationMember, "id" | "createdAt">) => {
    const data = readDB();
    if (!data.organizationMembers) data.organizationMembers = [];
    const newMember: OrganizationMember = {
      ...member,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.organizationMembers.push(newMember);
    writeDB(data);
    return newMember;
  },
  updateOrganizationMember: (id: string, updates: Partial<OrganizationMember>) => {
    const data = readDB();
    if (!data.organizationMembers) data.organizationMembers = [];
    const index = data.organizationMembers.findIndex(m => m.id === id);
    if (index !== -1) {
      data.organizationMembers[index] = {
        ...data.organizationMembers[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      writeDB(data);
      return data.organizationMembers[index];
    }
    return null;
  },
  deleteOrganizationMember: (id: string) => {
    const data = readDB();
    if (!data.organizationMembers) return false;
    const initialLen = data.organizationMembers.length;
    data.organizationMembers = data.organizationMembers.filter(m => m.id !== id);
    if (data.organizationMembers.length !== initialLen) {
      writeDB(data);
      return true;
    }
    return false;
  },

  getProcurementPackages: (projectId?: string) => {
    const pkgs = readDB().procurementPackages || [];
    if (projectId) return pkgs.filter((p: any) => p.projectId === projectId);
    return pkgs;
  },
  createProcurementPackage: (pkg: any) => {
    const data = readDB();
    if (!data.procurementPackages) data.procurementPackages = [];
    const newPkg = {
      ...pkg,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.procurementPackages.push(newPkg);
    writeDB(data);
    return newPkg;
  },

  getProcurementPackagesByProjectId: (projectId?: string) => {
    const list = readDB().procurementPackages || [];
    return projectId ? list.filter((p: any) => p.projectId === projectId) : list;
  },
  getProcurementRFQsByProjectId: (projectId?: string) => {
    const list = readDB().procurementRfqs || [];
    return projectId ? list.filter((r: any) => r.projectId === projectId) : list;
  },
  getFinancingRequestsByProjectId: (projectId?: string) => {
    const list = readDB().financingRequests || [];
    return projectId ? list.filter((r: any) => r.projectId === projectId) : list;
  },
  getProjectFinancingRecordsByProjectId: (projectId?: string) => {
    const list = readDB().projectFinancingRecords || [];
    return projectId ? list.filter((r: any) => r.projectId === projectId) : list;
  },
  getAssetAlertsByAssetId: (assetId: string) => {
    return (readDB().assetAlerts || []).filter((a: any) => a.assetId === assetId);
  },
  getMaintenanceCasesByAssetId: (assetId: string) => {
    return (readDB().maintenanceCases || []).filter((m: any) => m.assetId === assetId);
  },
  getMaintenanceCasesByProjectId: (projectId: string) => {
    return (readDB().maintenanceCases || []).filter((m: any) => m.projectId === projectId);
  },
  getTelemetrySourcesByAssetId: (assetId: string) => {
    return (readDB().telemetrySources || []).filter((s: any) => s.assetId === assetId);
  },
  getTelemetryReadingsByAssetId: (assetId: string) => {
    return (readDB().telemetryReadings || []).filter((r: any) => r.assetId === assetId);
  },
  getDeliveryInspectionsByProjectId: (projectId?: string) => {
    const list = readDB().deliveryInspections || [];
    return projectId ? list.filter((i: any) => i.projectId === projectId) : list;
  },
  getBOQsByProjectId: (projectId: string) => {
    return (readDB().boqs || []).filter((b: any) => b.projectId === projectId);
  },
  getPurchaseOrdersByProjectId: (projectId: string) => {
    return (readDB().purchaseOrders || []).filter((p: any) => p.projectId === projectId);
  },
  getAlerts: () => {
    return readDB().assetAlerts || [];
  },

  // Project RFQs (Phase 1)
  getProjectRFQs: () => readDB().projectRfqs || [],
  getProjectRFQsByProjectId: (projectId: string) => (readDB().projectRfqs || []).filter(r => r.projectId === projectId),
  getProjectRFQById: (id: string) => readDB().projectRfqs?.find(r => r.id === id),
  createProjectRFQ: (rfq: Omit<ProjectRFQ, "id" | "createdAt">) => {
    const data = readDB();
    if (!data.projectRfqs) data.projectRfqs = [];
    const newRfq = { ...rfq, id: uuidv4(), createdAt: new Date().toISOString() };
    data.projectRfqs.push(newRfq as ProjectRFQ);
    writeDB(data);
    return newRfq as ProjectRFQ;
  },
  updateProjectRFQ: (id: string, updates: Partial<ProjectRFQ>) => {
    const data = readDB();
    if (!data.projectRfqs) data.projectRfqs = [];
    const index = data.projectRfqs.findIndex(r => r.id === id);
    if (index !== -1) {
      data.projectRfqs[index] = { ...data.projectRfqs[index], ...updates };
      writeDB(data);
      return data.projectRfqs[index];
    }
    return null;
  },

  // RFQ Invitations
  getRFQInvitations: (rfqId: string) => (readDB().rfqInvitations || []).filter(i => i.rfqId === rfqId),
  getRFQInvitationsByEpcOrg: (epcOrgId: string) => (readDB().rfqInvitations || []).filter(i => i.epcOrganizationId === epcOrgId),
  createRFQInvitation: (inv: Omit<RFQInvitation, "id" | "invitedAt">) => {
    const data = readDB();
    if (!data.rfqInvitations) data.rfqInvitations = [];
    const newInv = { ...inv, id: uuidv4(), invitedAt: new Date().toISOString() };
    data.rfqInvitations.push(newInv as RFQInvitation);
    writeDB(data);
    return newInv as RFQInvitation;
  },
  updateRFQInvitation: (id: string, updates: Partial<RFQInvitation>) => {
    const data = readDB();
    if (!data.rfqInvitations) data.rfqInvitations = [];
    const index = data.rfqInvitations.findIndex(i => i.id === id);
    if (index !== -1) {
      data.rfqInvitations[index] = { ...data.rfqInvitations[index], ...updates };
      writeDB(data);
      return data.rfqInvitations[index];
    }
    return null;
  },

  // EPC Bids
  getEPCBids: () => readDB().epcBids || [],
  getEPCBidsByRfqId: (rfqId: string) => (readDB().epcBids || []).filter(b => b.rfqId === rfqId),
  getEPCBidsByProjectId: (projectId: string) => (readDB().epcBids || []).filter(b => b.projectId === projectId),
  getEPCBidsByEpcOrgId: (epcOrgId: string) => (readDB().epcBids || []).filter(b => b.epcOrganizationId === epcOrgId),
  getEPCBidById: (id: string) => readDB().epcBids?.find(b => b.id === id),
  createEPCBid: (bid: Omit<EPCBid, "id" | "createdAt" | "currentRevisionNumber">) => {
    const data = readDB();
    if (!data.epcBids) data.epcBids = [];
    const newBid: EPCBid = { 
      ...bid, 
      id: uuidv4(), 
      currentRevisionNumber: 1, 
      createdAt: new Date().toISOString() 
    };
    data.epcBids.push(newBid);
    writeDB(data);
    return newBid;
  },
  updateEPCBid: (id: string, updates: Partial<EPCBid>) => {
    const data = readDB();
    if (!data.epcBids) data.epcBids = [];
    const index = data.epcBids.findIndex(b => b.id === id);
    if (index !== -1) {
      data.epcBids[index] = { ...data.epcBids[index], ...updates };
      writeDB(data);
      return data.epcBids[index];
    }
    return null;
  },

  // EPC Bid Revisions (Immutable snapshots)
  getEPCBidRevisions: (bidId: string) => (readDB().epcBidRevisions || []).filter(r => r.bidId === bidId),
  createEPCBidRevision: (rev: Omit<EPCBidRevision, "id" | "createdAt">) => {
    const data = readDB();
    if (!data.epcBidRevisions) data.epcBidRevisions = [];
    const newRev = { ...rev, id: uuidv4(), createdAt: new Date().toISOString() };
    data.epcBidRevisions.push(newRev as EPCBidRevision);
    writeDB(data);
    return newRev as EPCBidRevision;
  },
  
  updateAnalysisHistoryProjectId: (id: string, projectId: string) => {
    const data = readDB();
    const index = data.analysisHistory.findIndex(h => h.id === id);
    if (index !== -1) {
      data.analysisHistory[index].projectId = projectId;
      writeDB(data);
      return data.analysisHistory[index];
    }
    return null;
  },
  getAnalysisHistoryById: (id: string) => readDB().analysisHistory.find(h => h.id === id),


  getSolarAssets: () => readDB().solarAssets || [],
  getSolarAssetById: (id: string) => readDB().solarAssets?.find(a => a.id === id),
  createSolarAsset: (asset: Omit<SolarAsset, "id" | "createdAt" | "updatedAt">) => {
    const data = readDB();
    if (!data.solarAssets) data.solarAssets = [];
    const newAsset: SolarAsset = { ...asset, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.solarAssets.push(newAsset);
    writeDB(data);
    return newAsset;
  },
  updateSolarAsset: (id: string, updates: Partial<SolarAsset>) => {
    const data = readDB();
    if (!data.solarAssets) data.solarAssets = [];
    const index = data.solarAssets.findIndex(a => a.id === id);
    if (index !== -1) {
      data.solarAssets[index] = { ...data.solarAssets[index], ...updates, updatedAt: new Date().toISOString() };
      writeDB(data);
      return data.solarAssets[index];
    }
    return null;
  },
  getAssetDocuments: (assetId: string) => (readDB().assetDocuments || []).filter(d => d.assetId === assetId),
  createAssetDocument: (doc: Omit<AssetDocument, "id" | "createdAt">) => {
    const data = readDB();
    if (!data.assetDocuments) data.assetDocuments = [];
    const newDoc: AssetDocument = { ...doc, id: uuidv4(), createdAt: new Date().toISOString() };
    data.assetDocuments.push(newDoc);
    writeDB(data);
    return newDoc;
  },
  createAssetAuditLog: (log: Omit<AssetAuditLog, "id" | "timestamp">) => {
    const data = readDB();
    if (!data.assetAuditLogs) data.assetAuditLogs = [];
    const newLog: AssetAuditLog = { ...log, id: uuidv4(), timestamp: new Date().toISOString() };
    data.assetAuditLogs.push(newLog);
    writeDB(data);
    return newLog;
  },

  getCityIrradianceCache: (city: string) => readDB().cityIrradianceCache?.find(c => c.city === city),
  setCityIrradianceCache: (cache: CityIrradianceCache) => {
    const data = readDB();
    if (!data.cityIrradianceCache) data.cityIrradianceCache = [];
    const index = data.cityIrradianceCache.findIndex(c => c.city === cache.city);
    if (index !== -1) {
      data.cityIrradianceCache[index] = cache;
    } else {
      data.cityIrradianceCache.push(cache);
    }
    writeDB(data);
  },

  getUsers: () => readDB().users,
  getUserByPhone: (phone: string) => readDB().users.find(u => u.phone === phone),
  getUserById: (id: string) => readDB().users.find(u => u.id === id),
  createUser: (user: Omit<User, "id" | "createdAt">) => {
    const data = readDB();
    if (!data.users) data.users = [];
    const newUser: User = { ...user, id: uuidv4(), createdAt: new Date().toISOString() };
    data.users.push(newUser);
    writeDB(data);
    return newUser;
  },
  updateUser: (id: string, updates: Partial<User>) => {
    const data = readDB();
    if (!data.users) data.users = [];
    const index = data.users.findIndex(u => u.id === id);
    if (index !== -1) {
      data.users[index] = { ...data.users[index], ...updates };
      writeDB(data);
      return data.users[index];
    }
    return null;
  },
  saveOTP: (phone: string, code: string) => {
    const data = readDB();
    if (!data.otps) data.otps = [];
    data.otps = data.otps.filter(o => o.phone !== phone);
    data.otps.push({ phone, code, expiresAt: Date.now() + 2 * 60 * 1000 });
    writeDB(data);
  },
  verifyOTP: (phone: string, code: string) => {
    const data = readDB();
    if (!data.otps) data.otps = [];
    const otp = data.otps.find(o => o.phone === phone && o.code === code);
    if (otp && otp.expiresAt > Date.now()) {
      data.otps = data.otps.filter(o => o.phone !== phone);
      writeDB(data);
      return true;
    }
    return false;
  },
  getProfessionals: () => readDB().professionals,
  getProfessionalById: (id: string) => readDB().professionals.find(p => p.id === id),
  createProfessional: (professional: Omit<Professional, "id" | "createdAt" | "status">) => {
    const data = readDB();
    const newPro: Professional = { ...professional, id: uuidv4(), status: "pending_review", createdAt: new Date().toISOString(), rating: null };
    data.professionals.push(newPro);
    writeDB(data);
    return newPro;
  },
  updateProfessional: (id: string, updates: Partial<Professional>) => {
    const data = readDB();
    const idx = data.professionals.findIndex(p => p.id === id);
    if (idx !== -1) {
      data.professionals[idx] = { ...data.professionals[idx], ...updates };
      writeDB(data);
      return data.professionals[idx];
    }
    return null;
  },
  updateProfessionalStatus: (id: string, status: "pending_review" | "approved" | "rejected") => {
    const data = readDB();
    const idx = data.professionals.findIndex(p => p.id === id);
    if (idx !== -1) {
      data.professionals[idx].status = status;
      writeDB(data);
      return data.professionals[idx];
    }
    return null;
  },
  getAds: (placement?: string) => {
    const ads = readDB().ads.filter(a => a.status === "active");
    if (placement) return ads.filter(a => a.placement === placement);
    return ads;
  },
  createAd: (ad: Omit<Ad, "id" | "createdAt" | "status">) => {
    const data = readDB();
    const newAd: Ad = { ...ad, id: uuidv4(), status: "pending_review", createdAt: new Date().toISOString() };
    data.ads.push(newAd);
    writeDB(data);
    return newAd;
  },
  getHistoryByUserId: (userId: string) => {
    return readDB().analysisHistory.filter(h => h.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  addRecommendationLog: (log: any) => {
    const data = readDB();
    if (!data.aiRecommendationLogs) data.aiRecommendationLogs = [];
    data.aiRecommendationLogs.push({ ...log, id: uuidv4(), createdAt: new Date().toISOString() });
    writeDB(data);
  },
  addHistory: (history: Omit<AnalysisHistory, "id" | "createdAt">) => {
    const data = readDB();
    const newHist: AnalysisHistory = { ...history, id: uuidv4(), createdAt: new Date().toISOString() };
    data.analysisHistory.push(newHist);
    writeDB(data);
    return newHist;
  },
  getSubscriptionPlans: () => readDB().subscriptionPlans,
  getSubscriptionPlanById: (id: string) => readDB().subscriptionPlans.find(p => p.id === id),
  createTransaction: (tx: Omit<Transaction, "id" | "createdAt" | "status" | "authority"> & { authority?: string | null }) => {
    const data = readDB();
    const newTx: Transaction = { ...tx, id: uuidv4(), authority: tx.authority || null, status: "pending", createdAt: new Date().toISOString() };
    data.transactions.push(newTx);
    writeDB(data);
    return newTx;
  },
  updateTransactionAuthority: (id: string, authority: string) => {
    const data = readDB();
    const tx = data.transactions.find(t => t.id === id);
    if (tx) {
      tx.authority = authority;
      writeDB(data);
      return tx;
    }
    return null;
  },
  getTransactionByAuthority: (authority: string) => readDB().transactions.find(t => t.authority === authority),
  updateTransaction: (id: string, updates: Partial<Transaction>) => {
    const data = readDB();
    const tx = data.transactions.find(t => t.id === id);
    if (tx) {
      Object.assign(tx, updates);
      writeDB(data);
      return tx;
    }
    return null;
  },
  updateTransactionStatus: (id: string, status: Transaction["status"]) => {
    const data = readDB();
    const tx = data.transactions.find(t => t.id === id);
    if (tx) {
      tx.status = status;
      writeDB(data);
      return tx;
    }
    return null;
  },
  createSubscription: (sub: Omit<Subscription, "id" | "createdAt">) => {
    const data = readDB();
    const newSub: Subscription = { ...sub, id: uuidv4(), createdAt: new Date().toISOString() };
    data.subscriptions.push(newSub);
    writeDB(data);
    return newSub;
  },
  getSubscriptionById: (id: string) => readDB().subscriptions.find(s => s.id === id),
  getUserSubscriptions: (userId: string) => (readDB().subscriptions || []).filter(s => s.userId === userId),

  getVendors: () => readDB().vendors,
  getVendorById: (id: string) => readDB().vendors.find((v) => v.id === id),
  createVendor: (vendor: Omit<Vendor, "id" | "createdAt" | "status">) => {
    const data = readDB();
    const newVendor: Vendor = {
      ...vendor,
      id: uuidv4(),
      status: "pending_review",
      createdAt: new Date().toISOString(),
    };
    data.vendors.push(newVendor);
    writeDB(data);
    return newVendor;
  },
  getProducts: () => readDB().products,
  createProduct: (product: Omit<Product, "id" | "createdAt">) => {
    const data = readDB();
    const newProduct: Product = {
      ...product,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    data.products.push(newProduct);
    writeDB(data);
    return newProduct;
  },
  // Finance methods
  getFinancialModelsByProjectId: (projectId: string) => (readDB().financialModels || []).filter(m => m.projectId === projectId),
  getFinancialModelById: (id: string) => (readDB().financialModels || []).find(m => m.id === id),
  createFinancialModel: (model: Omit<ProjectFinancialModel, "id" | "createdAt" | "updatedAt">) => {
    const data = readDB();
    if (!data.financialModels) data.financialModels = [];
    const newModel: ProjectFinancialModel = { ...model, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.financialModels.push(newModel);
    writeDB(data);
    return newModel;
  },
  updateFinancialModel: (id: string, updates: Partial<ProjectFinancialModel>) => {
    const data = readDB();
    if (!data.financialModels) data.financialModels = [];
    const index = data.financialModels.findIndex(m => m.id === id);
    if (index !== -1) {
      data.financialModels[index] = { ...data.financialModels[index], ...updates, updatedAt: new Date().toISOString() };
      writeDB(data);
      return data.financialModels[index];
    }
    return null;
  },
  
  getFinancialAssumptionSetById: (id: string) => (readDB().financialAssumptionSets || []).find(a => a.id === id),
  createFinancialAssumptionSet: (set: Omit<FinancialAssumptionSet, "id" | "createdAt" | "updatedAt">) => {
    const data = readDB();
    if (!data.financialAssumptionSets) data.financialAssumptionSets = [];
    const newSet: FinancialAssumptionSet = { ...set, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.financialAssumptionSets.push(newSet);
    writeDB(data);
    return newSet;
  },

  getFinancialScenariosByModelId: (modelId: string) => (readDB().financialScenarios || []).filter(s => s.financialModelId === modelId),
  createFinancialScenario: (scenario: Omit<FinancialScenario, "id" | "createdAt" | "updatedAt">) => {
    const data = readDB();
    if (!data.financialScenarios) data.financialScenarios = [];
    const newScenario: FinancialScenario = { ...scenario, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.financialScenarios.push(newScenario);
    writeDB(data);
    return newScenario;
  },
  
  getProjectProposalsByProjectId: (projectId: string) => (readDB().projectProposals || []).filter(p => p.projectId === projectId),
  createProjectProposal: (proposal: Omit<ProjectProposal, "id" | "createdAt">) => {
    const data = readDB();
    if (!data.projectProposals) data.projectProposals = [];
    const newProposal: ProjectProposal = { ...proposal, id: uuidv4(), createdAt: new Date().toISOString() };
    data.projectProposals.push(newProposal);
    writeDB(data);
    return newProposal;
  },
  // Investment Methods
  getInvestmentOpportunities: () => readDB().investmentOpportunities || [],
  getInvestmentOpportunityById: (id: string) => (readDB().investmentOpportunities || []).find(o => o.id === id),
  createInvestmentOpportunity: (opp: Omit<InvestmentOpportunity, "id" | "createdAt" | "updatedAt">) => {
    const data = readDB();
    if (!data.investmentOpportunities) data.investmentOpportunities = [];
    const newOpp: InvestmentOpportunity = { ...opp, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.investmentOpportunities.push(newOpp);
    writeDB(data);
    return newOpp;
  },
  updateInvestmentOpportunity: (id: string, updates: Partial<InvestmentOpportunity>) => {
    const data = readDB();
    if (!data.investmentOpportunities) data.investmentOpportunities = [];
    const index = data.investmentOpportunities.findIndex(o => o.id === id);
    if (index !== -1) {
      data.investmentOpportunities[index] = { ...data.investmentOpportunities[index], ...updates, updatedAt: new Date().toISOString() };
      writeDB(data);
      return data.investmentOpportunities[index];
    }
    return null;
  },
  getInvestmentOpportunityByProjectId: (projectId: string) => (readDB().investmentOpportunities || []).find((o: any) => o.projectId === projectId),

  getInvestorProfiles: () => readDB().investorProfiles || [],
  getInvestorProfileById: (id: string) => (readDB().investorProfiles || []).find(p => p.id === id),
  getInvestorProfileByUserId: (userId: string) => (readDB().investorProfiles || []).find(p => p.userId === userId),
  createInvestorProfile: (profile: Omit<InvestorProfile, "id" | "createdAt" | "updatedAt">) => {
    const data = readDB();
    if (!data.investorProfiles) data.investorProfiles = [];
    const newProfile: InvestorProfile = { ...profile, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.investorProfiles.push(newProfile);
    writeDB(data);
    return newProfile;
  },
  
  getProjectMatchesForInvestor: (investorProfileId: string) => (readDB().projectMatches || []).filter(m => m.investorProfileId === investorProfileId),
  getProjectMatchesForOpportunity: (opportunityId: string) => (readDB().projectMatches || []).filter(m => m.opportunityId === opportunityId),
  createProjectMatch: (match: Omit<ProjectMatch, "id" | "createdAt" | "updatedAt">) => {
    const data = readDB();
    if (!data.projectMatches) data.projectMatches = [];
    const newMatch: ProjectMatch = { ...match, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.projectMatches.push(newMatch);
    writeDB(data);
    return newMatch;
  },
  updateProjectMatch: (id: string, updates: Partial<ProjectMatch>) => {
    const data = readDB();
    if (!data.projectMatches) data.projectMatches = [];
    const index = data.projectMatches.findIndex(m => m.id === id);
    if (index !== -1) {
      data.projectMatches[index] = { ...data.projectMatches[index], ...updates, updatedAt: new Date().toISOString() };
      writeDB(data);
      return data.projectMatches[index];
    }
    return null;
  },
  // Procurement
  getBOQs: (projectId?: string) => {
    const list = readDB().boqs || [];
    return projectId ? list.filter((b: any) => b.projectId === projectId) : list;
  },
  getBOQById: (id: string) => readDB().boqs?.find((b: any) => b.id === id),
  createBOQ: (boq: any) => { 
    const d = readDB(); 
    if(!d.boqs) d.boqs = []; 
    const codeNum = String(d.boqs.length + 1).padStart(6, '0');
    const n = { ...boq, id: uuidv4(), boqCode: boq.boqCode || `BOQ-HSE-${codeNum}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; 
    d.boqs.push(n); 
    writeDB(d); 
    return n; 
  },
  updateBOQ: (id: string, updates: any) => { const d = readDB(); if(!d.boqs) d.boqs = []; const idx = d.boqs.findIndex((b: any) => b.id === id); if(idx > -1) { d.boqs[idx] = { ...d.boqs[idx], ...updates, updatedAt: new Date().toISOString() }; writeDB(d); return d.boqs[idx]; } return null; },
  getBOQItems: (boqId: string) => readDB().boqItems?.filter((i: any) => i.boqId === boqId) || [],
  getBOQItemsByProjectId: (projectId: string) => readDB().boqItems?.filter((i: any) => i.projectId === projectId) || [],
  createBOQItem: (item: any) => { const d = readDB(); if(!d.boqItems) d.boqItems = []; const n = { ...item, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; d.boqItems.push(n); writeDB(d); return n; },
  updateBOQItem: (id: string, updates: any) => { const d = readDB(); if(!d.boqItems) d.boqItems = []; const idx = d.boqItems.findIndex((i: any) => i.id === id); if(idx > -1) { d.boqItems[idx] = { ...d.boqItems[idx], ...updates, updatedAt: new Date().toISOString() }; writeDB(d); return d.boqItems[idx]; } return null; },
  deleteBOQItem: (id: string) => { const d = readDB(); if(!d.boqItems) return; d.boqItems = d.boqItems.filter((i: any) => i.id !== id); writeDB(d); },
  getProcurementRFQs: (projectId: string) => readDB().procurementRfqs?.filter((r: any) => r.projectId === projectId) || [],
  getProcurementRFQById: (id: string) => readDB().procurementRfqs?.find((r: any) => r.id === id),
  createProcurementRFQ: (rfq: any) => { 
    const d = readDB(); 
    if(!d.procurementRfqs) d.procurementRfqs = []; 
    const codeNum = String(d.procurementRfqs.length + 1).padStart(6, '0');
    const n = { ...rfq, id: uuidv4(), procurementRfqCode: rfq.procurementRfqCode || `PRFQ-HSE-${codeNum}`, createdAt: new Date().toISOString() }; 
    d.procurementRfqs.push(n); 
    writeDB(d); 
    return n; 
  },
  updateProcurementRFQ: (id: string, updates: any) => { const d = readDB(); if(!d.procurementRfqs) d.procurementRfqs = []; const idx = d.procurementRfqs.findIndex((r: any) => r.id === id); if(idx > -1) { d.procurementRfqs[idx] = { ...d.procurementRfqs[idx], ...updates }; writeDB(d); return d.procurementRfqs[idx]; } return null; },
  getSupplierInvitations: (rfqId: string) => readDB().supplierInvitations?.filter((i: any) => i.procurementRfqId === rfqId) || [],
  getSupplierInvitationByVendorId: (vendorId: string) => readDB().supplierInvitations?.filter((i: any) => i.vendorId === vendorId) || [],
  createSupplierInvitation: (inv: any) => { const d = readDB(); if(!d.supplierInvitations) d.supplierInvitations = []; const n = { ...inv, id: uuidv4(), invitedAt: new Date().toISOString() }; d.supplierInvitations.push(n); writeDB(d); return n; },
  updateSupplierInvitation: (id: string, updates: any) => { const d = readDB(); if(!d.supplierInvitations) d.supplierInvitations = []; const idx = d.supplierInvitations.findIndex((i: any) => i.id === id); if(idx > -1) { d.supplierInvitations[idx] = { ...d.supplierInvitations[idx], ...updates }; writeDB(d); return d.supplierInvitations[idx]; } return null; },
  getVendorQuotes: (rfqId: string) => readDB().vendorQuotes?.filter((q: any) => q.procurementRfqId === rfqId) || [],
  getVendorQuoteById: (id: string) => readDB().vendorQuotes?.find((q: any) => q.id === id),
  createVendorQuote: (quote: any) => { 
    const d = readDB(); 
    if(!d.vendorQuotes) d.vendorQuotes = []; 
    const codeNum = String(d.vendorQuotes.length + 1).padStart(6, '0');
    const n = { ...quote, id: uuidv4(), quoteCode: quote.quoteCode || `VQ-HSE-${codeNum}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; 
    d.vendorQuotes.push(n); 
    writeDB(d); 
    return n; 
  },
  updateVendorQuote: (id: string, updates: any) => { const d = readDB(); if(!d.vendorQuotes) d.vendorQuotes = []; const idx = d.vendorQuotes.findIndex((q: any) => q.id === id); if(idx > -1) { d.vendorQuotes[idx] = { ...d.vendorQuotes[idx], ...updates, updatedAt: new Date().toISOString() }; writeDB(d); return d.vendorQuotes[idx]; } return null; },
  getVendorQuoteItems: (quoteId: string) => readDB().vendorQuoteItems?.filter((i: any) => i.quoteId === quoteId) || [],
  createVendorQuoteItem: (item: any) => { const d = readDB(); if(!d.vendorQuoteItems) d.vendorQuoteItems = []; const n = { ...item, id: uuidv4() }; d.vendorQuoteItems.push(n); writeDB(d); return n; },
  updateVendorQuoteItem: (id: string, updates: any) => { const d = readDB(); if(!d.vendorQuoteItems) d.vendorQuoteItems = []; const idx = d.vendorQuoteItems.findIndex((i: any) => i.id === id); if(idx > -1) { d.vendorQuoteItems[idx] = { ...d.vendorQuoteItems[idx], ...updates }; writeDB(d); return d.vendorQuoteItems[idx]; } return null; },
  getSupplierAwards: (rfqId: string) => readDB().supplierAwards?.filter((a: any) => a.procurementRfqId === rfqId) || [],
  getSupplierAwardsByProjectId: (projectId: string) => readDB().supplierAwards?.filter((a: any) => a.projectId === projectId) || [],
  createSupplierAward: (award: any) => { const d = readDB(); if(!d.supplierAwards) d.supplierAwards = []; const n = { ...award, id: uuidv4(), createdAt: new Date().toISOString() }; d.supplierAwards.push(n); writeDB(d); return n; },
  updateSupplierAward: (id: string, updates: any) => { const d = readDB(); if(!d.supplierAwards) d.supplierAwards = []; const idx = d.supplierAwards.findIndex((a: any) => a.id === id); if(idx > -1) { d.supplierAwards[idx] = { ...d.supplierAwards[idx], ...updates }; writeDB(d); return d.supplierAwards[idx]; } return null; },
  getPurchaseOrders: (projectId?: string) => {
    const list = readDB().purchaseOrders || [];
    return projectId ? list.filter((p: any) => p.projectId === projectId) : list;
  },
  getPurchaseOrderById: (id: string) => readDB().purchaseOrders?.find((p: any) => p.id === id),
  createPurchaseOrder: (po: any) => { 
    const d = readDB(); 
    if(!d.purchaseOrders) d.purchaseOrders = []; 
    const codeNum = String(d.purchaseOrders.length + 1).padStart(6, '0');
    const n = { ...po, id: uuidv4(), poCode: po.poCode || `PO-HSE-${codeNum}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; 
    d.purchaseOrders.push(n); 
    writeDB(d); 
    return n; 
  },
  updatePurchaseOrder: (id: string, updates: any) => { const d = readDB(); if(!d.purchaseOrders) d.purchaseOrders = []; const idx = d.purchaseOrders.findIndex((p: any) => p.id === id); if(idx > -1) { d.purchaseOrders[idx] = { ...d.purchaseOrders[idx], ...updates, updatedAt: new Date().toISOString() }; writeDB(d); return d.purchaseOrders[idx]; } return null; },
  getPurchaseOrderItems: (poId: string) => readDB().purchaseOrderItems?.filter((i: any) => i.purchaseOrderId === poId) || [],
  createPurchaseOrderItem: (item: any) => { const d = readDB(); if(!d.purchaseOrderItems) d.purchaseOrderItems = []; const n = { ...item, id: uuidv4() }; d.purchaseOrderItems.push(n); writeDB(d); return n; },
  getDeliveryRecords: (poId: string) => readDB().deliveryRecords?.filter((d: any) => d.purchaseOrderId === poId) || [],
  getDeliveryRecordsByProjectId: (projectId?: string) => {
    const list = readDB().deliveryRecords || [];
    return projectId ? list.filter((d: any) => d.projectId === projectId) : list;
  },
  getDeliveryRecordById: (id: string) => readDB().deliveryRecords?.find((d: any) => d.id === id),
  createDeliveryRecord: (rec: any) => { 
    const d = readDB(); 
    if(!d.deliveryRecords) d.deliveryRecords = []; 
    const codeNum = String(d.deliveryRecords.length + 1).padStart(6, '0');
    const n = { ...rec, id: uuidv4(), deliveryNumber: rec.deliveryNumber || `DLV-HSE-${codeNum}`, createdAt: new Date().toISOString() }; 
    d.deliveryRecords.push(n); 
    writeDB(d); 
    return n; 
  },
  updateDeliveryRecord: (id: string, updates: any) => { const d = readDB(); if(!d.deliveryRecords) d.deliveryRecords = []; const idx = d.deliveryRecords.findIndex((dr: any) => dr.id === id); if(idx > -1) { d.deliveryRecords[idx] = { ...d.deliveryRecords[idx], ...updates }; writeDB(d); return d.deliveryRecords[idx]; } return null; },
  getDeliveryItems: (deliveryRecordId: string) => readDB().deliveryItems?.filter((i: any) => i.deliveryRecordId === deliveryRecordId) || [],
  createDeliveryItem: (item: any) => { const d = readDB(); if(!d.deliveryItems) d.deliveryItems = []; const n = { ...item, id: uuidv4() }; d.deliveryItems.push(n); writeDB(d); return n; },
  updateDeliveryItem: (id: string, updates: any) => { const d = readDB(); if(!d.deliveryItems) d.deliveryItems = []; const idx = d.deliveryItems.findIndex((i: any) => i.id === id); if(idx > -1) { d.deliveryItems[idx] = { ...d.deliveryItems[idx], ...updates }; writeDB(d); return d.deliveryItems[idx]; } return null; },
  getDeliveryInspections: (deliveryRecordId: string) => readDB().deliveryInspections?.filter((i: any) => i.deliveryRecordId === deliveryRecordId) || [],
  createDeliveryInspection: (inspection: any) => { const d = readDB(); if(!d.deliveryInspections) d.deliveryInspections = []; const n = { ...inspection, id: uuidv4(), createdAt: new Date().toISOString() }; d.deliveryInspections.push(n); writeDB(d); return n; },

  // Asset & Commissioning
  getAssets: () => readDB().energyAssets || [],
  getAssetById: (id: string) => readDB().energyAssets?.find((a: any) => a.id === id),
  getAssetsByProjectId: (projectId: string) => readDB().energyAssets?.filter((a: any) => a.projectId === projectId) || [],
  createAsset: (asset: any) => { 
    const d = readDB(); 
    if(!d.energyAssets) d.energyAssets = []; 
    const codeNum = String(d.energyAssets.length + 1).padStart(6, '0');
    const n = { ...asset, id: uuidv4(), assetCode: asset.assetCode || `HEA-IR-${codeNum}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; 
    d.energyAssets.push(n); 
    writeDB(d); 
    return n; 
  },
  updateAsset: (id: string, updates: any) => { const d = readDB(); if(!d.energyAssets) d.energyAssets = []; const idx = d.energyAssets.findIndex((a: any) => a.id === id); if(idx > -1) { d.energyAssets[idx] = { ...d.energyAssets[idx], ...updates, updatedAt: new Date().toISOString() }; writeDB(d); return d.energyAssets[idx]; } return null; },
  getAssetComponents: (assetId: string) => readDB().assetComponents?.filter((c: any) => c.assetId === assetId) || [],
  createAssetComponent: (comp: any) => { const d = readDB(); if(!d.assetComponents) d.assetComponents = []; const n = { ...comp, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; d.assetComponents.push(n); writeDB(d); return n; },
  updateAssetComponent: (id: string, updates: any) => { const d = readDB(); if(!d.assetComponents) d.assetComponents = []; const idx = d.assetComponents.findIndex((c: any) => c.id === id); if(idx > -1) { d.assetComponents[idx] = { ...d.assetComponents[idx], ...updates, updatedAt: new Date().toISOString() }; writeDB(d); return d.assetComponents[idx]; } return null; },
  getEquipmentWarranties: (assetId?: string) => assetId ? (readDB().equipmentWarranties?.filter((w: any) => w.assetId === assetId) || []) : (readDB().equipmentWarranties || []),
  getEquipmentWarrantiesByProjectId: (projectId: string) => readDB().equipmentWarranties?.filter((w: any) => w.projectId === projectId) || [],
  createEquipmentWarranty: (warranty: any) => { const d = readDB(); if(!d.equipmentWarranties) d.equipmentWarranties = []; const n = { ...warranty, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; d.equipmentWarranties.push(n); writeDB(d); return n; },
  updateEquipmentWarranty: (id: string, updates: any) => { const d = readDB(); if(!d.equipmentWarranties) d.equipmentWarranties = []; const idx = d.equipmentWarranties.findIndex((w: any) => w.id === id); if(idx > -1) { d.equipmentWarranties[idx] = { ...d.equipmentWarranties[idx], ...updates, updatedAt: new Date().toISOString() }; writeDB(d); return d.equipmentWarranties[idx]; } return null; },
  getCommissioningRecords: (projectId: string) => readDB().commissioningRecords?.filter((r: any) => r.projectId === projectId) || [],
  getCommissioningRecordById: (id: string) => readDB().commissioningRecords?.find((r: any) => r.id === id),
  createCommissioningRecord: (record: any) => { const d = readDB(); if(!d.commissioningRecords) d.commissioningRecords = []; const n = { ...record, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; d.commissioningRecords.push(n); writeDB(d); return n; },
  updateCommissioningRecord: (id: string, updates: any) => { const d = readDB(); if(!d.commissioningRecords) d.commissioningRecords = []; const idx = d.commissioningRecords.findIndex((r: any) => r.id === id); if(idx > -1) { d.commissioningRecords[idx] = { ...d.commissioningRecords[idx], ...updates, updatedAt: new Date().toISOString() }; writeDB(d); return d.commissioningRecords[idx]; } return null; },
  getCommissioningTests: (recordId?: string) => readDB().commissioningTests?.filter((t: any) => !recordId || t.commissioningRecordId === recordId || t.projectId === recordId) || [],
  getCommissioningTestById: (id: string) => readDB().commissioningTests?.find((t: any) => t.id === id),
  createCommissioningTest: (test: any) => { const d = readDB(); if(!d.commissioningTests) d.commissioningTests = []; const n = { ...test, id: uuidv4() }; d.commissioningTests.push(n); writeDB(d); return n; },
  updateCommissioningTest: (id: string, updates: any) => { const d = readDB(); if(!d.commissioningTests) d.commissioningTests = []; const idx = d.commissioningTests.findIndex((t: any) => t.id === id); if(idx > -1) { d.commissioningTests[idx] = { ...d.commissioningTests[idx], ...updates }; writeDB(d); return d.commissioningTests[idx]; } return null; },
  getProjectHandover: (projectId: string) => readDB().projectHandovers?.find((h: any) => h.projectId === projectId),
  getProjectHandoverById: (id: string) => readDB().projectHandovers?.find((h: any) => h.id === id),
  createProjectHandover: (handover: any) => { const d = readDB(); if(!d.projectHandovers) d.projectHandovers = []; const n = { ...handover, id: uuidv4() }; d.projectHandovers.push(n); writeDB(d); return n; },
  updateProjectHandover: (id: string, updates: any) => { const d = readDB(); if(!d.projectHandovers) d.projectHandovers = []; const idx = d.projectHandovers.findIndex((h: any) => h.id === id); if(idx > -1) { d.projectHandovers[idx] = { ...d.projectHandovers[idx], ...updates }; writeDB(d); return d.projectHandovers[idx]; } return null; },
  getPunchListItems: (projectId: string) => readDB().punchListItems?.filter((p: any) => p.projectId === projectId) || [],
  getPunchListItemById: (id: string) => readDB().punchListItems?.find((p: any) => p.id === id),
  createPunchListItem: (item: any) => { 
    const d = readDB(); 
    if(!d.punchListItems) d.punchListItems = []; 
    const codeNum = String(d.punchListItems.length + 1).padStart(4, '0');
    const n = { ...item, id: uuidv4(), itemNumber: item.itemNumber || `PL-${codeNum}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; 
    d.punchListItems.push(n); 
    writeDB(d); 
    return n; 
  },
  updatePunchListItem: (id: string, updates: any) => { const d = readDB(); if(!d.punchListItems) d.punchListItems = []; const idx = d.punchListItems.findIndex((p: any) => p.id === id); if(idx > -1) { d.punchListItems[idx] = { ...d.punchListItems[idx], ...updates, updatedAt: new Date().toISOString() }; writeDB(d); return d.punchListItems[idx]; } return null; },
  deletePunchListItem: (id: string) => { const d = readDB(); if(!d.punchListItems) return; d.punchListItems = d.punchListItems.filter((p: any) => p.id !== id); writeDB(d); },
  getAssetPassportSnapshots: (assetId: string) => readDB().assetPassportSnapshots?.filter((s: any) => s.assetId === assetId) || [],
  createAssetPassportSnapshot: (snapshot: any) => { const d = readDB(); if(!d.assetPassportSnapshots) d.assetPassportSnapshots = []; const n = { ...snapshot, id: uuidv4(), generatedAt: new Date().toISOString() }; d.assetPassportSnapshots.push(n); writeDB(d); return n; },
  getAssetPerformanceBaselines: (assetId: string) => readDB().assetPerformanceBaselines?.filter((b: any) => b.assetId === assetId) || [],
  createAssetPerformanceBaseline: (baseline: any) => { const d = readDB(); if(!d.assetPerformanceBaselines) d.assetPerformanceBaselines = []; const n = { ...baseline, id: uuidv4(), calculatedAt: new Date().toISOString() }; d.assetPerformanceBaselines.push(n); writeDB(d); return n; },
  getFinalProjectCostSummaries: (projectId: string) => readDB().finalProjectCostSummaries?.filter((c: any) => c.projectId === projectId) || [],
  createFinalProjectCostSummary: (summary: any) => { const d = readDB(); if(!d.finalProjectCostSummaries) d.finalProjectCostSummaries = []; const n = { ...summary, id: uuidv4(), calculatedAt: new Date().toISOString() }; d.finalProjectCostSummaries.push(n); writeDB(d); return n; },

  // --- Phase 7-A Telemetry & Operational Monitoring Methods ---
  getTelemetrySources: (projectId?: string, assetId?: string) => {
    let all = readDB().telemetrySources || [];
    if (projectId) all = all.filter((s: any) => s.projectId === projectId);
    if (assetId) all = all.filter((s: any) => s.assetId === assetId);
    return all;
  },
  getTelemetrySourceById: (id: string) => readDB().telemetrySources?.find((s: any) => s.id === id),
  createTelemetrySource: (source: any) => {
    const d = readDB();
    if (!d.telemetrySources) d.telemetrySources = [];
    const n = {
      ...source,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    d.telemetrySources.push(n);
    writeDB(d);
    return n;
  },
  updateTelemetrySource: (id: string, updates: any) => {
    const d = readDB();
    if (!d.telemetrySources) d.telemetrySources = [];
    const idx = d.telemetrySources.findIndex((s: any) => s.id === id);
    if (idx > -1) {
      d.telemetrySources[idx] = {
        ...d.telemetrySources[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      writeDB(d);
      return d.telemetrySources[idx];
    }
    return null;
  },
  deleteTelemetrySource: (id: string) => {
    const d = readDB();
    if (!d.telemetrySources) return false;
    const initialLen = d.telemetrySources.length;
    d.telemetrySources = d.telemetrySources.filter((s: any) => s.id !== id);
    if (d.telemetrySources.length !== initialLen) {
      writeDB(d);
      return true;
    }
    return false;
  },

  getTelemetryReadings: (assetId?: string, filters?: { from?: string; to?: string; metricType?: string; sourceId?: string; quality?: string }) => {
    let list = readDB().telemetryReadings || [];
    if (assetId) {
      list = list.filter((r: any) => r.assetId === assetId);
    }
    if (filters?.from) {
      const fromMs = new Date(filters.from).getTime();
      list = list.filter((r: any) => new Date(r.timestamp).getTime() >= fromMs);
    }
    if (filters?.to) {
      const toMs = new Date(filters.to).getTime();
      list = list.filter((r: any) => new Date(r.timestamp).getTime() <= toMs);
    }
    if (filters?.metricType) {
      list = list.filter((r: any) => r.metricType === filters.metricType);
    }
    if (filters?.sourceId) {
      list = list.filter((r: any) => r.sourceId === filters.sourceId);
    }
    if (filters?.quality) {
      list = list.filter((r: any) => r.quality === filters.quality);
    }
    return list.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },
  getTelemetryReadingById: (id: string) => readDB().telemetryReadings?.find((r: any) => r.id === id),
  createTelemetryReading: (reading: any) => {
    const d = readDB();
    if (!d.telemetryReadings) d.telemetryReadings = [];
    const n = {
      ...reading,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    d.telemetryReadings.push(n);
    writeDB(d);
    return n;
  },
  createTelemetryReadingsBatch: (readings: any[]) => {
    const d = readDB();
    if (!d.telemetryReadings) d.telemetryReadings = [];
    const now = new Date().toISOString();
    const created = readings.map((r: any) => ({
      ...r,
      id: r.id || uuidv4(),
      createdAt: r.createdAt || now
    }));
    d.telemetryReadings.push(...created);
    writeDB(d);
    return created;
  },

  getAssetPerformanceSnapshots: (assetId: string) => {
    return (readDB().assetPerformanceSnapshots || [])
      .filter((s: any) => s.assetId === assetId)
      .sort((a: any, b: any) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime());
  },
  getLatestAssetPerformanceSnapshot: (assetId: string) => {
    const all = (readDB().assetPerformanceSnapshots || [])
      .filter((s: any) => s.assetId === assetId)
      .sort((a: any, b: any) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime());
    return all[0] || null;
  },
  createAssetPerformanceSnapshot: (snapshot: any) => {
    const d = readDB();
    if (!d.assetPerformanceSnapshots) d.assetPerformanceSnapshots = [];
    const n = {
      ...snapshot,
      id: uuidv4(),
      calculatedAt: new Date().toISOString()
    };
    d.assetPerformanceSnapshots.push(n);
    writeDB(d);
    return n;
  },

  getAssetHealthAssessments: (assetId: string) => {
    return (readDB().assetHealthAssessments || [])
      .filter((h: any) => h.assetId === assetId)
      .sort((a: any, b: any) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime());
  },
  getLatestAssetHealthAssessment: (assetId: string) => {
    const all = (readDB().assetHealthAssessments || [])
      .filter((h: any) => h.assetId === assetId)
      .sort((a: any, b: any) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime());
    return all[0] || null;
  },
  createAssetHealthAssessment: (assessment: any) => {
    const d = readDB();
    if (!d.assetHealthAssessments) d.assetHealthAssessments = [];
    const n = {
      ...assessment,
      id: uuidv4(),
      calculatedAt: new Date().toISOString()
    };
    d.assetHealthAssessments.push(n);
    writeDB(d);
    return n;
  },
  // --- Phase 8 Financing Marketplace & Workflow Methods ---
  getFinancialPartnerProfiles: () => readDB().financialPartnerProfiles || [],
  getFinancialPartnerProfileById: (id: string) => readDB().financialPartnerProfiles?.find((p: any) => p.id === id),
  createFinancialPartnerProfile: (profile: any) => {
    const d = readDB();
    if (!d.financialPartnerProfiles) d.financialPartnerProfiles = [];
    const n = { ...profile, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    d.financialPartnerProfiles.push(n);
    writeDB(d);
    return n;
  },
  getFinancingProducts: () => readDB().financingProducts || [],
  getFinancingProductsByPartnerId: (partnerId: string) => readDB().financingProducts?.filter((p: any) => p.financialPartnerProfileId === partnerId) || [],
  createFinancingProduct: (prod: any) => {
    const d = readDB();
    if (!d.financingProducts) d.financingProducts = [];
    const n = { ...prod, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    d.financingProducts.push(n);
    writeDB(d);
    return n;
  },
  getFinancingRequests: (projectId?: string) => {
    const all = readDB().financingRequests || [];
    return projectId ? all.filter((r: any) => r.projectId === projectId) : all;
  },
  getFinancingRequestById: (id: string) => readDB().financingRequests?.find((r: any) => r.id === id),
  createFinancingRequest: (req: any) => {
    const d = readDB();
    if (!d.financingRequests) d.financingRequests = [];
    const codeNum = String(d.financingRequests.length + 1).padStart(6, '0');
    const n = {
      ...req,
      id: uuidv4(),
      requestCode: `FIN-HSE-${codeNum}`,
      currency: 'IRR',
      status: req.status || 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    d.financingRequests.push(n);
    writeDB(d);
    return n;
  },
  updateFinancingRequest: (id: string, updates: any) => {
    const d = readDB();
    if (!d.financingRequests) d.financingRequests = [];
    const idx = d.financingRequests.findIndex((r: any) => r.id === id);
    if (idx > -1) {
      d.financingRequests[idx] = { ...d.financingRequests[idx], ...updates, updatedAt: new Date().toISOString() };
      writeDB(d);
      return d.financingRequests[idx];
    }
    return null;
  },
  getFinanceReadinessSnapshots: (requestId: string) => readDB().financeReadinessSnapshots?.filter((s: any) => s.financingRequestId === requestId) || [],
  createFinanceReadinessSnapshot: (snapshot: any) => {
    const d = readDB();
    if (!d.financeReadinessSnapshots) d.financeReadinessSnapshots = [];
    const n = { ...snapshot, id: uuidv4(), evaluatedAt: new Date().toISOString() };
    d.financeReadinessSnapshots.push(n);
    writeDB(d);
    return n;
  },
  getFinancialPartnerMatches: (requestId: string) => readDB().financialPartnerMatches?.filter((m: any) => m.financingRequestId === requestId) || [],
  saveFinancialPartnerMatches: (requestId: string, matches: any[]) => {
    const d = readDB();
    if (!d.financialPartnerMatches) d.financialPartnerMatches = [];
    // Remove existing matches for this request
    d.financialPartnerMatches = d.financialPartnerMatches.filter((m: any) => m.financingRequestId !== requestId);
    d.financialPartnerMatches.push(...matches);
    writeDB(d);
    return matches;
  },
  getFinancingSubmissions: (requestId?: string) => {
    const all = readDB().financingSubmissions || [];
    return requestId ? all.filter((s: any) => s.financingRequestId === requestId) : all;
  },
  getFinancingSubmissionById: (id: string) => readDB().financingSubmissions?.find((s: any) => s.id === id),
  createFinancingSubmission: (sub: any) => {
    const d = readDB();
    if (!d.financingSubmissions) d.financingSubmissions = [];
    const n = { ...sub, id: uuidv4(), status: sub.status || 'SUBMITTED', submittedAt: new Date().toISOString() };
    d.financingSubmissions.push(n);
    writeDB(d);
    return n;
  },
  updateFinancingSubmission: (id: string, updates: any) => {
    const d = readDB();
    if (!d.financingSubmissions) d.financingSubmissions = [];
    const idx = d.financingSubmissions.findIndex((s: any) => s.id === id);
    if (idx > -1) {
      d.financingSubmissions[idx] = { ...d.financingSubmissions[idx], ...updates };
      writeDB(d);
      return d.financingSubmissions[idx];
    }
    return null;
  },
  getFinanceInformationRequests: (submissionId: string) => readDB().financeInformationRequests?.filter((r: any) => r.financingSubmissionId === submissionId) || [],
  createFinanceInformationRequest: (req: any) => {
    const d = readDB();
    if (!d.financeInformationRequests) d.financeInformationRequests = [];
    const n = { ...req, id: uuidv4(), status: 'OPEN', createdAt: new Date().toISOString() };
    d.financeInformationRequests.push(n);
    writeDB(d);
    return n;
  },
  updateFinanceInformationRequest: (id: string, updates: any) => {
    const d = readDB();
    if (!d.financeInformationRequests) d.financeInformationRequests = [];
    const idx = d.financeInformationRequests.findIndex((r: any) => r.id === id);
    if (idx > -1) {
      d.financeInformationRequests[idx] = { ...d.financeInformationRequests[idx], ...updates };
      writeDB(d);
      return d.financeInformationRequests[idx];
    }
    return null;
  },
  getFinancingOffers: (requestId?: string) => {
    const all = readDB().financingOffers || [];
    return requestId ? all.filter((o: any) => o.financingRequestId === requestId) : all;
  },
  getFinancingOfferById: (id: string) => readDB().financingOffers?.find((o: any) => o.id === id),
  createFinancingOffer: (offer: any) => {
    const d = readDB();
    if (!d.financingOffers) d.financingOffers = [];
    const codeNum = String(d.financingOffers.length + 1).padStart(6, '0');
    const n = {
      ...offer,
      id: uuidv4(),
      offerCode: `FO-HSE-${codeNum}`,
      currency: 'IRR',
      status: offer.status || 'SUBMITTED',
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toISOString()
    };
    d.financingOffers.push(n);
    writeDB(d);
    return n;
  },
  updateFinancingOffer: (id: string, updates: any) => {
    const d = readDB();
    if (!d.financingOffers) d.financingOffers = [];
    const idx = d.financingOffers.findIndex((o: any) => o.id === id);
    if (idx > -1) {
      d.financingOffers[idx] = { ...d.financingOffers[idx], ...updates };
      writeDB(d);
      return d.financingOffers[idx];
    }
    return null;
  },
  getProjectFinancingRecords: (projectId?: string) => {
    const all = readDB().projectFinancingRecords || [];
    return projectId ? all.filter((r: any) => r.projectId === projectId) : all;
  },
  createProjectFinancingRecord: (rec: any) => {
    const d = readDB();
    if (!d.projectFinancingRecords) d.projectFinancingRecords = [];
    const n = {
      ...rec,
      id: uuidv4(),
      status: rec.status || 'APPROVED',
      currency: 'IRR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    d.projectFinancingRecords.push(n);
    writeDB(d);
    return n;
  },
  updateProjectFinancingRecord: (id: string, updates: any) => {
    const d = readDB();
    if (!d.projectFinancingRecords) d.projectFinancingRecords = [];
    const idx = d.projectFinancingRecords.findIndex((r: any) => r.id === id);
    if (idx > -1) {
      d.projectFinancingRecords[idx] = { ...d.projectFinancingRecords[idx], ...updates, updatedAt: new Date().toISOString() };
      writeDB(d);
      return d.projectFinancingRecords[idx];
    }
    return null;
  },
  getFinanceReviewNotes: (submissionId: string) => readDB().financeReviewNotes?.filter((n: any) => n.financingSubmissionId === submissionId) || [],
  createFinanceReviewNote: (note: any) => {
    const d = readDB();
    if (!d.financeReviewNotes) d.financeReviewNotes = [];
    const n = { ...note, id: uuidv4(), createdAt: new Date().toISOString() };
    d.financeReviewNotes.push(n);
    writeDB(d);
    return n;
  },

  // --- Phase 8: Financing Needs, Applications, Partners, Agreements ---
  getFinancingNeeds: (projectId?: string): FinancingNeed[] => {
    const all = readDB().financingNeeds || [];
    return projectId ? all.filter((n: any) => n.projectId === projectId) : all;
  },
  getFinancingNeedById: (id: string): FinancingNeed | undefined => {
    return readDB().financingNeeds?.find((n: any) => n.id === id);
  },
  createFinancingNeed: (need: Partial<FinancingNeed>): FinancingNeed => {
    const d = readDB();
    if (!d.financingNeeds) d.financingNeeds = [];
    const n: FinancingNeed = {
      id: need.id || uuidv4(),
      projectId: need.projectId!,
      totalProjectCost: need.totalProjectCost!,
      ownerEquity: need.ownerEquity!,
      financingRequested: need.financingRequested!,
      currency: need.currency || 'IRR',
      preferredFinancingType: need.preferredFinancingType || 'PROJECT_LOAN',
      preferredTenorMonths: need.preferredTenorMonths || 48,
      purpose: need.purpose || 'تأمین مالی ساخت و احداث نیروگاه خورشیدی',
      notes: need.notes,
      source: need.source || 'USER_ENTERED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    d.financingNeeds.push(n);
    writeDB(d);
    return n;
  },
  updateFinancingNeed: (id: string, updates: Partial<FinancingNeed>): FinancingNeed | null => {
    const d = readDB();
    if (!d.financingNeeds) d.financingNeeds = [];
    const idx = d.financingNeeds.findIndex((n: any) => n.id === id);
    if (idx > -1) {
      d.financingNeeds[idx] = { ...d.financingNeeds[idx], ...updates, updatedAt: new Date().toISOString() };
      writeDB(d);
      return d.financingNeeds[idx];
    }
    return null;
  },

  getFinancingApplications: (projectId?: string): FinancingApplication[] => {
    const all = readDB().financingApplications || [];
    return projectId ? all.filter((a: any) => a.projectId === projectId) : all;
  },
  getFinancingApplicationById: (id: string): FinancingApplication | undefined => {
    return readDB().financingApplications?.find((a: any) => a.id === id);
  },
  createFinancingApplication: (app: Partial<FinancingApplication>): FinancingApplication => {
    const d = readDB();
    if (!d.financingApplications) d.financingApplications = [];
    const codeNum = String(d.financingApplications.length + 1).padStart(6, '0');
    const n: FinancingApplication = {
      id: app.id || uuidv4(),
      applicationCode: app.applicationCode || `APP-HSE-${codeNum}`,
      projectId: app.projectId!,
      financingNeedId: app.financingNeedId,
      applicantUserId: app.applicantUserId!,
      applicantOrganizationId: app.applicantOrganizationId,
      financialModelId: app.financialModelId,
      totalProjectCost: app.totalProjectCost!,
      ownerEquity: app.ownerEquity!,
      financingRequested: app.financingRequested!,
      currency: app.currency || 'IRR',
      financingType: app.financingType || 'PROJECT_LOAN',
      requestedTenorMonths: app.requestedTenorMonths || 48,
      preferredGracePeriodMonths: app.preferredGracePeriodMonths,
      status: app.status || 'DRAFT',
      repaymentPreference: app.repaymentPreference,
      collateralSummary: app.collateralSummary,
      projectRevenueModel: app.projectRevenueModel,
      purpose: app.purpose,
      notes: app.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    d.financingApplications.push(n);
    writeDB(d);
    return n;
  },
  updateFinancingApplication: (id: string, updates: Partial<FinancingApplication>): FinancingApplication | null => {
    const d = readDB();
    if (!d.financingApplications) d.financingApplications = [];
    const idx = d.financingApplications.findIndex((a: any) => a.id === id);
    if (idx > -1) {
      d.financingApplications[idx] = { ...d.financingApplications[idx], ...updates, updatedAt: new Date().toISOString() };
      writeDB(d);
      return d.financingApplications[idx];
    }
    return null;
  },

  getFinancingPartners: (): FinancingPartner[] => {
    const modern = readDB().financingPartners || [];
    if (modern.length > 0) return modern;
    // Map existing profiles if present
    const profiles = readDB().financialPartnerProfiles || [];
    return profiles.map((p: any) => ({
      id: p.id,
      name: p.displayName || p.name,
      organizationId: p.organizationId,
      category: (p.partnerType === 'LEASING_COMPANY' ? 'LEASING' : p.partnerType) as any,
      financingTypes: p.supportedFinancingProducts || ['PROJECT_LOAN'],
      minimumAmount: p.minimumFinancingAmount || 0,
      maximumAmount: p.maximumFinancingAmount || 0,
      supportedProjectStages: p.supportedProjectTypes || ['ALL'],
      supportedLocations: p.supportedProvinces || ['ALL'],
      minimumEquityPercent: p.minimumEquityContributionPercent || 20,
      minimumProjectCapacityKw: 0,
      maximumProjectCapacityKw: 100000,
      requiredDocuments: p.requiredDocuments || [],
      activeStatus: p.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString()
    }));
  },
  getFinancingPartnerById: (id: string): FinancingPartner | undefined => {
    const modern = readDB().financingPartners?.find((p: any) => p.id === id);
    if (modern) return modern;
    const profile = readDB().financialPartnerProfiles?.find((p: any) => p.id === id);
    if (!profile) return undefined;
    return {
      id: profile.id,
      name: profile.displayName,
      organizationId: profile.organizationId,
      category: (profile.partnerType === 'LEASING_COMPANY' ? 'LEASING' : profile.partnerType) as any,
      financingTypes: profile.supportedFinancingProducts || ['PROJECT_LOAN'],
      minimumAmount: profile.minimumFinancingAmount || 0,
      maximumAmount: profile.maximumFinancingAmount || 0,
      supportedProjectStages: profile.supportedProjectTypes || ['ALL'],
      supportedLocations: profile.supportedProvinces || ['ALL'],
      minimumEquityPercent: profile.minimumEquityContributionPercent || 20,
      requiredDocuments: profile.requiredDocuments || [],
      activeStatus: profile.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: profile.updatedAt || new Date().toISOString()
    };
  },
  createFinancingPartner: (partner: Partial<FinancingPartner>): FinancingPartner => {
    const d = readDB();
    if (!d.financingPartners) d.financingPartners = [];
    const n: FinancingPartner = {
      id: partner.id || uuidv4(),
      name: partner.name!,
      organizationId: partner.organizationId,
      category: partner.category || 'BANK',
      financingTypes: partner.financingTypes || ['PROJECT_LOAN'],
      minimumAmount: partner.minimumAmount || 0,
      maximumAmount: partner.maximumAmount || 0,
      supportedProjectStages: partner.supportedProjectStages || ['ALL'],
      supportedLocations: partner.supportedLocations || ['ALL'],
      minimumEquityPercent: partner.minimumEquityPercent !== undefined ? partner.minimumEquityPercent : 20,
      minimumProjectCapacityKw: partner.minimumProjectCapacityKw,
      maximumProjectCapacityKw: partner.maximumProjectCapacityKw,
      requiredDocuments: partner.requiredDocuments || [],
      activeStatus: partner.activeStatus || 'ACTIVE',
      contactWorkflow: partner.contactWorkflow,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    d.financingPartners.push(n);
    writeDB(d);
    return n;
  },
  updateFinancingPartner: (id: string, updates: Partial<FinancingPartner>): FinancingPartner | null => {
    const d = readDB();
    if (!d.financingPartners) d.financingPartners = [];
    const idx = d.financingPartners.findIndex((p: any) => p.id === id);
    if (idx > -1) {
      d.financingPartners[idx] = { ...d.financingPartners[idx], ...updates, updatedAt: new Date().toISOString() };
      writeDB(d);
      return d.financingPartners[idx];
    }
    return null;
  },

  getFinancingAgreements: (projectId?: string): FinancingAgreementRecord[] => {
    const all = readDB().financingAgreements || [];
    return projectId ? all.filter((a: any) => a.projectId === projectId) : all;
  },
  getFinancingAgreementById: (id: string): FinancingAgreementRecord | undefined => {
    return readDB().financingAgreements?.find((a: any) => a.id === id);
  },
  createFinancingAgreement: (agr: Partial<FinancingAgreementRecord>): FinancingAgreementRecord => {
    const d = readDB();
    if (!d.financingAgreements) d.financingAgreements = [];
    const codeNum = String(d.financingAgreements.length + 1).padStart(6, '0');
    const n: FinancingAgreementRecord = {
      id: agr.id || uuidv4(),
      agreementCode: agr.agreementCode || `AGR-HSE-${codeNum}`,
      selectedOfferId: agr.selectedOfferId!,
      partnerId: agr.partnerId!,
      projectId: agr.projectId!,
      applicationId: agr.applicationId,
      signedDocumentId: agr.signedDocumentId,
      agreementDate: agr.agreementDate || new Date().toISOString(),
      financedAmount: agr.financedAmount!,
      currency: agr.currency || 'IRR',
      status: agr.status || 'PENDING_SIGNATURE',
      notes: agr.notes,
      disbursementConfirmed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    d.financingAgreements.push(n);
    writeDB(d);
    return n;
  },
  updateFinancingAgreement: (id: string, updates: Partial<FinancingAgreementRecord>): FinancingAgreementRecord | null => {
    const d = readDB();
    if (!d.financingAgreements) d.financingAgreements = [];
    const idx = d.financingAgreements.findIndex((a: any) => a.id === id);
    if (idx > -1) {
      d.financingAgreements[idx] = { ...d.financingAgreements[idx], ...updates, updatedAt: new Date().toISOString() };
      writeDB(d);
      return d.financingAgreements[idx];
    }
    return null;
  },

  // --- Phase 7-B Alert Engine & Maintenance Methods ---
  getAssetAlerts: (projectId?: string, assetId?: string): AssetAlert[] => {
    let all = readDB().assetAlerts || [];
    if (projectId) all = all.filter((a: any) => a.projectId === projectId);
    if (assetId) all = all.filter((a: any) => a.assetId === assetId);
    return all;
  },
  getAssetAlertById: (id: string): AssetAlert | undefined => {
    return (readDB().assetAlerts || []).find((a: any) => a.id === id);
  },
  createAssetAlert: (alert: any): AssetAlert => {
    const d = readDB();
    if (!d.assetAlerts) d.assetAlerts = [];
    const count = d.assetAlerts.length + 1;
    const alertCode = alert.alertCode || `ALT-HSE-${String(count).padStart(6, '0')}`;
    const now = new Date().toISOString();
    const n: AssetAlert = {
      ...alert,
      id: uuidv4(),
      alertCode,
      status: alert.status || 'OPEN',
      detectedAt: alert.detectedAt || now,
      createdAt: alert.createdAt || now,
      updatedAt: alert.updatedAt || now
    };
    d.assetAlerts.push(n);
    writeDB(d);
    return n;
  },
  updateAssetAlert: (id: string, updates: Partial<AssetAlert>): AssetAlert | null => {
    const d = readDB();
    if (!d.assetAlerts) d.assetAlerts = [];
    const idx = d.assetAlerts.findIndex((a: any) => a.id === id);
    if (idx > -1) {
      d.assetAlerts[idx] = {
        ...d.assetAlerts[idx],
        ...updates
      };
      writeDB(d);
      return d.assetAlerts[idx];
    }
    return null;
  },
  deleteAssetAlert: (id: string): boolean => {
    const d = readDB();
    if (!d.assetAlerts) return false;
    const initialLen = d.assetAlerts.length;
    d.assetAlerts = d.assetAlerts.filter((a: any) => a.id !== id);
    if (d.assetAlerts.length !== initialLen) {
      writeDB(d);
      return true;
    }
    return false;
  },

  getAlertRules: (projectId?: string, assetId?: string): AlertRule[] => {
    let all = readDB().alertRules || [];
    if (projectId) all = all.filter((r: any) => r.projectId === projectId);
    if (assetId) all = all.filter((r: any) => !r.assetId || r.assetId === assetId);
    return all;
  },
  getAlertRuleById: (id: string): AlertRule | undefined => {
    return (readDB().alertRules || []).find((r: any) => r.id === id);
  },
  createAlertRule: (rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule => {
    const d = readDB();
    if (!d.alertRules) d.alertRules = [];
    const n: AlertRule = {
      ...rule,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    d.alertRules.push(n);
    writeDB(d);
    return n;
  },
  updateAlertRule: (id: string, updates: Partial<AlertRule>): AlertRule | null => {
    const d = readDB();
    if (!d.alertRules) d.alertRules = [];
    const idx = d.alertRules.findIndex((r: any) => r.id === id);
    if (idx > -1) {
      d.alertRules[idx] = {
        ...d.alertRules[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      writeDB(d);
      return d.alertRules[idx];
    }
    return null;
  },
  deleteAlertRule: (id: string): boolean => {
    const d = readDB();
    if (!d.alertRules) return false;
    const initialLen = d.alertRules.length;
    d.alertRules = d.alertRules.filter((r: any) => r.id !== id);
    if (d.alertRules.length !== initialLen) {
      writeDB(d);
      return true;
    }
    return false;
  },

  getMaintenanceCases: (projectId?: string, assetId?: string): MaintenanceCase[] => {
    let all = readDB().maintenanceCases || [];
    if (projectId) all = all.filter((c: any) => c.projectId === projectId);
    if (assetId) all = all.filter((c: any) => c.assetId === assetId);
    return all;
  },
  getMaintenanceCaseById: (id: string): MaintenanceCase | undefined => {
    return (readDB().maintenanceCases || []).find((c: any) => c.id === id);
  },
  createMaintenanceCase: (mCase: Omit<MaintenanceCase, 'id' | 'createdAt' | 'updatedAt' | 'caseNumber' | 'maintenanceCode' | 'reportedBy' | 'reportedAt'> & { caseNumber?: string; maintenanceCode?: string; reportedBy?: string; reportedAt?: string }): MaintenanceCase => {
    const d = readDB();
    if (!d.maintenanceCases) d.maintenanceCases = [];
    const count = d.maintenanceCases.length + 1;
    const year = new Date().getFullYear();
    const caseNumber = mCase.caseNumber || `MC-${year}-${String(count).padStart(4, '0')}`;
    const maintenanceCode = mCase.maintenanceCode || caseNumber;
    const n: MaintenanceCase = {
      ...mCase,
      id: uuidv4(),
      caseNumber,
      maintenanceCode,
      reportedBy: mCase.reportedBy || 'SYSTEM',
      reportedAt: mCase.reportedAt || new Date().toISOString(),
      actionsTaken: mCase.actionsTaken || [],
      sparePartsUsed: mCase.sparePartsUsed || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    d.maintenanceCases.push(n);
    writeDB(d);
    return n;
  },
  updateMaintenanceCase: (id: string, updates: Partial<MaintenanceCase>): MaintenanceCase | null => {
    const d = readDB();
    if (!d.maintenanceCases) d.maintenanceCases = [];
    const idx = d.maintenanceCases.findIndex((c: any) => c.id === id);
    if (idx > -1) {
      d.maintenanceCases[idx] = {
        ...d.maintenanceCases[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      writeDB(d);
      return d.maintenanceCases[idx];
    }
    return null;
  },
  deleteMaintenanceCase: (id: string): boolean => {
    const d = readDB();
    if (!d.maintenanceCases) return false;
    const initialLen = d.maintenanceCases.length;
    d.maintenanceCases = d.maintenanceCases.filter((c: any) => c.id !== id);
    if (d.maintenanceCases.length !== initialLen) {
      writeDB(d);
      return true;
    }
    return false;
  },

  getMaintenanceDiagnoses: (assetId?: string, alertId?: string): MaintenanceDiagnosis[] => {
    let all = readDB().maintenanceDiagnoses || [];
    if (assetId) all = all.filter((diag: any) => diag.assetId === assetId);
    if (alertId) all = all.filter((diag: any) => diag.alertId === alertId);
    return all;
  },
  getMaintenanceDiagnosisById: (id: string): MaintenanceDiagnosis | undefined => {
    return (readDB().maintenanceDiagnoses || []).find((diag: any) => diag.id === id);
  },
  createMaintenanceDiagnosis: (diag: Omit<MaintenanceDiagnosis, 'id' | 'createdAt'>): MaintenanceDiagnosis => {
    const d = readDB();
    if (!d.maintenanceDiagnoses) d.maintenanceDiagnoses = [];
    const n: MaintenanceDiagnosis = {
      ...diag,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    d.maintenanceDiagnoses.push(n);
    writeDB(d);
    return n;
  },
  updateMaintenanceDiagnosis: (id: string, updates: Partial<MaintenanceDiagnosis>): MaintenanceDiagnosis | null => {
    const d = readDB();
    if (!d.maintenanceDiagnoses) d.maintenanceDiagnoses = [];
    const idx = d.maintenanceDiagnoses.findIndex((diag: any) => diag.id === id);
    if (idx > -1) {
      d.maintenanceDiagnoses[idx] = {
        ...d.maintenanceDiagnoses[idx],
        ...updates
      };
      writeDB(d);
      return d.maintenanceDiagnoses[idx];
    }
    return null;
  },

  getMaintenanceActions: (caseId: string): MaintenanceAction[] => {
    const all = readDB().maintenanceActions || [];
    return all.filter((a: any) => a.maintenanceCaseId === caseId);
  },
  createMaintenanceAction: (action: Omit<MaintenanceAction, 'id' | 'createdAt'> & { createdAt?: string }): MaintenanceAction => {
    const d = readDB();
    if (!d.maintenanceActions) d.maintenanceActions = [];
    const n: MaintenanceAction = {
      ...action,
      id: uuidv4(),
      createdAt: action.createdAt || new Date().toISOString()
    };
    d.maintenanceActions.push(n);
    // Also append to case if case exists
    if (d.maintenanceCases) {
      const caseIdx = d.maintenanceCases.findIndex((c: any) => c.id === action.maintenanceCaseId);
      if (caseIdx > -1) {
        if (!d.maintenanceCases[caseIdx].actionsTaken) d.maintenanceCases[caseIdx].actionsTaken = [];
        d.maintenanceCases[caseIdx].actionsTaken.push(n);
        d.maintenanceCases[caseIdx].updatedAt = new Date().toISOString();
      }
    }
    writeDB(d);
    return n;
  },

  getMaintenanceAssignmentHistories: (caseId?: string): MaintenanceAssignmentHistory[] => {
    let all = readDB().maintenanceAssignmentHistories || [];
    if (caseId) all = all.filter((h: any) => h.maintenanceCaseId === caseId);
    return all;
  },
  createMaintenanceAssignmentHistory: (history: Omit<MaintenanceAssignmentHistory, 'id' | 'assignedAt'> & { assignedAt?: string }): MaintenanceAssignmentHistory => {
    const d = readDB();
    if (!d.maintenanceAssignmentHistories) d.maintenanceAssignmentHistories = [];
    const n: MaintenanceAssignmentHistory = {
      ...history,
      id: uuidv4(),
      assignedAt: history.assignedAt || new Date().toISOString()
    };
    d.maintenanceAssignmentHistories.push(n);
    writeDB(d);
    return n;
  },
  updateMaintenanceAssignmentHistory: (id: string, updates: Partial<MaintenanceAssignmentHistory>): MaintenanceAssignmentHistory | null => {
    const d = readDB();
    if (!d.maintenanceAssignmentHistories) d.maintenanceAssignmentHistories = [];
    const idx = d.maintenanceAssignmentHistories.findIndex((h: any) => h.id === id);
    if (idx > -1) {
      d.maintenanceAssignmentHistories[idx] = {
        ...d.maintenanceAssignmentHistories[idx],
        ...updates
      };
      writeDB(d);
      return d.maintenanceAssignmentHistories[idx];
    }
    return null;
  },

  setDBPath: (newPath: string) => {
    currentDbPath = newPath;
  },
  getDBPath: () => currentDbPath
};
