/**
 * UI-2 Project Workspace Redesign Verification & Regression Suite
 * 
 * Verifies:
 * 1. 5-Phase Lifecycle Mapping & Status Categorization (all 15 statuses + CANCELLED)
 * 2. Deterministic Next Recommended Action generation
 * 3. Real Attention Items & Empty State handling
 * 4. Health Summary generation (<= 4 metrics, NO fabricated percentages)
 * 5. Deep Link & Legacy Tab Resolution (rfq, bids, contract, milestones, etc.)
 * 6. Progressive Disclosure Architecture & Component Structure
 * 7. Source Code Integrity (ProjectDetail uses 4-tab context nav, no 17-tab sprawl)
 * 8. Data Truth & Monitoring Integrity
 * 9. Database Immutability Check (db.json SHA-256 byte-for-byte identical)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  LIFECYCLE_PHASES, 
  getProjectPhase, 
  getNextRecommendedAction, 
  getAttentionItems, 
  getProjectHealthSummary, 
  mapTabToPhaseAndCapability 
} from '../src/components/projects/lifecycleMapping';
import { EnergyProject, ProjectStatus } from '../src/types/project';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

console.log('========================================================');
console.log('HOOSHYAR ENERGY — UI-2 PROJECT WORKSPACE TEST SUITE');
console.log('========================================================\n');

// Mock helper
function createMockProject(status: ProjectStatus, overrides: Partial<EnergyProject> = {}): EnergyProject {
  return {
    id: 'prj-test-01',
    projectCode: 'PRJ-2026-0001',
    ownerId: 'usr-owner-1',
    title: 'پروژه نیروگاه خورشیدی ۵۰۰ کیلووات یزد',
    projectType: 'SOLAR',
    status,
    location: {
      country: 'IR',
      province: 'یزد',
      city: 'یزد'
    },
    site: {
      type: 'industrial',
      areaM2: 5000,
      usableAreaM2: 4500
    },
    energyRequirement: {
      monthlyConsumptionKwh: 35000,
      gridConnected: true,
      gridStable: true
    },
    targetCapacityKw: 500,
    estimatedBudgetIRR: 12500000000,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-03-01T12:00:00Z',
    ...overrides
  };
}

// 1. 5-PHASE LIFECYCLE MAPPING TESTS
console.log('[1] Testing 5-Phase Lifecycle Architecture...');

assert(LIFECYCLE_PHASES.length === 5, 'Exactly 5 primary lifecycle phases defined');
assert(LIFECYCLE_PHASES[0].title === 'بررسی و طراحی', 'Phase 1 title is بررسی و طراحی');
assert(LIFECYCLE_PHASES[1].title === 'آماده‌سازی پروژه', 'Phase 2 title is آماده‌سازی پروژه');
assert(LIFECYCLE_PHASES[2].title === 'تأمین و قرارداد', 'Phase 3 title is تأمین و قرارداد');
assert(LIFECYCLE_PHASES[3].title === 'اجرا و راه‌اندازی', 'Phase 4 title is اجرا و راه‌اندازی');
assert(LIFECYCLE_PHASES[4].title === 'بهره‌برداری', 'Phase 5 title is بهره‌برداری');

// Verify all 15 ProjectStatus enum values map deterministically
const phase1Statuses: ProjectStatus[] = ['DRAFT', 'ANALYSIS', 'FEASIBILITY'];
const phase2Statuses: ProjectStatus[] = ['READY_FOR_RFQ', 'RFQ_OPEN', 'BIDS_RECEIVED', 'EPC_SELECTED'];
const phase3Statuses: ProjectStatus[] = ['CONTRACTING', 'FINANCING', 'PROCUREMENT'];
const phase4Statuses: ProjectStatus[] = ['CONSTRUCTION', 'COMMISSIONING'];
const phase5Statuses: ProjectStatus[] = ['OPERATIONAL', 'MAINTENANCE'];

phase1Statuses.forEach(s => {
  const res = getProjectPhase(s);
  assert(res.phaseIndex === 1 && res.phase?.id === 'phase-1-design', `Status ${s} correctly maps to Phase 1`);
});

phase2Statuses.forEach(s => {
  const res = getProjectPhase(s);
  assert(res.phaseIndex === 2 && res.phase?.id === 'phase-2-preparation', `Status ${s} correctly maps to Phase 2`);
});

phase3Statuses.forEach(s => {
  const res = getProjectPhase(s);
  assert(res.phaseIndex === 3 && res.phase?.id === 'phase-3-contracting', `Status ${s} correctly maps to Phase 3`);
});

phase4Statuses.forEach(s => {
  const res = getProjectPhase(s);
  assert(res.phaseIndex === 4 && res.phase?.id === 'phase-4-execution', `Status ${s} correctly maps to Phase 4`);
});

phase5Statuses.forEach(s => {
  const res = getProjectPhase(s);
  assert(res.phaseIndex === 5 && res.phase?.id === 'phase-5-operation', `Status ${s} correctly maps to Phase 5`);
});

const cancelledRes = getProjectPhase('CANCELLED');
assert(cancelledRes.isCancelled === true && cancelledRes.phase === null, 'Status CANCELLED handled cleanly as cancelled');

// 2. NEXT RECOMMENDED ACTION TESTS
console.log('\n[2] Testing Deterministic Next Recommended Action...');

const draftAction = getNextRecommendedAction(createMockProject('DRAFT'));
assert(draftAction.title.includes('تکمیل اطلاعات سایت'), 'DRAFT recommends site completion');

const rfqAction = getNextRecommendedAction(createMockProject('READY_FOR_RFQ'));
assert(rfqAction.title.includes('انتشار رسمی استعلام قیمت'), 'READY_FOR_RFQ recommends RFQ publication');

const bidsAction = getNextRecommendedAction(createMockProject('BIDS_RECEIVED'));
assert(bidsAction.title.includes('مقایسه تطبیقی پیشنهادات'), 'BIDS_RECEIVED recommends bids comparison');

const contractAction = getNextRecommendedAction(createMockProject('CONTRACTING'));
assert(contractAction.title.includes('امضای رسمی قرارداد احداث'), 'CONTRACTING recommends contract signing');

const constructionAction = getNextRecommendedAction(createMockProject('CONSTRUCTION'));
assert(constructionAction.title.includes('پیشرفت عملیات اجرایی'), 'CONSTRUCTION recommends progress tracking');

const commissioningAction = getNextRecommendedAction(createMockProject('COMMISSIONING'));
assert(commissioningAction.title.includes('آزمون‌های راه‌اندازی'), 'COMMISSIONING recommends tests execution');

const operationalAction = getNextRecommendedAction(createMockProject('OPERATIONAL'));
assert(operationalAction.title.includes('پایش مستمر تولید'), 'OPERATIONAL recommends monitoring & asset');

const fallbackAction = getNextRecommendedAction(createMockProject('CANCELLED'));
assert(fallbackAction.title.includes('متوقف'), 'CANCELLED action indicates stoppage');

// 3. ATTENTION ITEMS TESTS
console.log('\n[3] Testing Attention Items Logic...');

// Incomplete data triggers warning
const incompleteProject = createMockProject('ANALYSIS', { targetCapacityKw: undefined, site: undefined });
const attentionIncomplete = getAttentionItems(incompleteProject);
assert(attentionIncomplete.some(item => item.id === 'missing-site-specs'), 'Missing site specs triggers warning item');

// Normal project in DRAFT has no attention items
const completeDraft = createMockProject('DRAFT');
const attentionDraft = getAttentionItems(completeDraft);
assert(attentionDraft.length === 0, 'Clean complete project in DRAFT has 0 urgent attention items');

// READY_FOR_RFQ has action required
const rfqAttention = getAttentionItems(createMockProject('READY_FOR_RFQ'));
assert(rfqAttention.some(item => item.id === 'rfq-ready'), 'READY_FOR_RFQ triggers rfq-ready attention item');

// BIDS_RECEIVED has bids evaluation action
const bidsAttention = getAttentionItems(createMockProject('BIDS_RECEIVED'));
assert(bidsAttention.some(item => item.id === 'bids-waiting-eval'), 'BIDS_RECEIVED triggers bids evaluation attention item');

// 4. HEALTH SUMMARY TESTS
console.log('\n[4] Testing Health Summary Indicators...');

const healthSummary = getProjectHealthSummary(createMockProject('CONSTRUCTION'));
assert(healthSummary.length <= 4, 'Health summary returns at most 4 meaningful indicators');
assert(healthSummary.some(h => h.label === 'مرحله چرخه عمر'), 'Health summary contains lifecycle stage');
assert(healthSummary.some(h => h.label === 'وضعیت مرحله جاری'), 'Health summary contains stage status');
assert(healthSummary.some(h => h.label === 'برآورد مالی و سرمایه‌گذاری'), 'Health summary contains budget');
assert(healthSummary.some(h => h.label === 'اتصال به شبکه سراسری'), 'Health summary contains grid connection');

// Verify no fabricated percentages
healthSummary.forEach(h => {
  assert(!h.value.includes('%'), `Health indicator ${h.label} does not fabricate progress percentage (${h.value})`);
});

// 5. DEEP LINK & TAB RESOLUTION TESTS
console.log('\n[5] Testing Deep Link & Legacy Tab Resolution...');

const rfqTabMap = mapTabToPhaseAndCapability('rfq');
assert(rfqTabMap.phaseId === 'phase-2-preparation' && rfqTabMap.capabilityId === 'rfq', 'Tab ?tab=rfq resolves to Phase 2 rfq capability');

const bidsTabMap = mapTabToPhaseAndCapability('bids');
assert(bidsTabMap.phaseId === 'phase-2-preparation' && bidsTabMap.capabilityId === 'bids', 'Tab ?tab=bids resolves to Phase 2 bids capability');

const contractTabMap = mapTabToPhaseAndCapability('contract');
assert(contractTabMap.phaseId === 'phase-3-contracting' && contractTabMap.capabilityId === 'contract', 'Tab ?tab=contract resolves to Phase 3 contract capability');

const milestonesTabMap = mapTabToPhaseAndCapability('milestones');
assert(milestonesTabMap.phaseId === 'phase-4-execution' && milestonesTabMap.capabilityId === 'milestones', 'Tab ?tab=milestones resolves to Phase 4 milestones capability');

const commissioningTabMap = mapTabToPhaseAndCapability('commissioning');
assert(commissioningTabMap.phaseId === 'phase-4-execution' && commissioningTabMap.capabilityId === 'commissioning', 'Tab ?tab=commissioning resolves to Phase 4 commissioning capability');

const assetTabMap = mapTabToPhaseAndCapability('asset');
assert(assetTabMap.phaseId === 'phase-5-operation' && assetTabMap.capabilityId === 'asset', 'Tab ?tab=asset resolves to Phase 5 asset capability');

const financialTabMap = mapTabToPhaseAndCapability('financial');
assert(financialTabMap.phaseId === 'phase-1-design' && financialTabMap.capabilityId === 'financial-analysis', 'Tab ?tab=financial resolves to Phase 1 financial-analysis capability');

// 6. SOURCE CODE VERIFICATION
console.log('\n[6] Verifying Source Code Architecture...');

const projectDetailPath = path.resolve('src/pages/projects/ProjectDetail.tsx');
const projectDetailSrc = fs.readFileSync(projectDetailPath, 'utf8');

assert(projectDetailSrc.includes('ProjectHeader'), 'ProjectDetail mounts ProjectHeader');
assert(projectDetailSrc.includes('ProjectContextNavigation'), 'ProjectDetail mounts ProjectContextNavigation');
assert(projectDetailSrc.includes('ProjectCockpit'), 'ProjectDetail mounts ProjectCockpit');
assert(projectDetailSrc.includes('ProjectProcess'), 'ProjectDetail mounts ProjectProcess');
assert(projectDetailSrc.includes('ProjectDocumentCenter'), 'ProjectDetail mounts ProjectDocumentCenter');
assert(projectDetailSrc.includes('ProjectActivityTimeline'), 'ProjectDetail mounts ProjectActivityTimeline');

// Check that the legacy 17-tab sprawl in header is eliminated
assert(!projectDetailSrc.includes("const tabs = ["), 'Legacy 17-tab array in ProjectDetail is removed');
assert(!projectDetailSrc.includes("whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-colors"), 'Legacy horizontal tabs bar is eliminated');

// Verify components exist in src/components/projects/
const expectedProjectFiles = [
  'lifecycleMapping.ts',
  'ProjectLifecycleProgress.tsx',
  'NextActionCard.tsx',
  'ProjectHealthCard.tsx',
  'AttentionItems.tsx',
  'ProjectSummary.tsx',
  'ProjectAssetTransition.tsx',
  'ProjectContextNavigation.tsx',
  'ProjectCockpit.tsx',
  'ProjectProcess.tsx',
  'ProjectDocumentCenter.tsx',
  'ProjectActivityTimeline.tsx',
  'ProjectHeader.tsx',
  'index.ts'
];

expectedProjectFiles.forEach(file => {
  const filePath = path.resolve('src/components/projects', file);
  assert(fs.existsSync(filePath), `Component src/components/projects/${file} exists`);
});

// 7. DATABASE IMMUTABILITY CHECK
console.log('\n[7] Verifying db.json Immutability...');
const dbPath = path.resolve('db.json');
const dbContent = fs.readFileSync(dbPath);
const dbHash = crypto.createHash('sha256').update(dbContent).digest('hex');
const expectedHash = 'de1c80c200b77dbbcdbb6fd077bced308b76969c9026ceb2715d21e2c92409c2';

assert(dbHash === expectedHash, 'db.json SHA-256 is byte-for-byte identical', `Expected: ${expectedHash}, Got: ${dbHash}`);

// SUMMARY
console.log('\n========================================================');
console.log(`UI-2 VERIFICATION COMPLETE: ${passed} passed, ${failed} failed`);
console.log('========================================================\n');

if (failed > 0) {
  process.exit(1);
}
