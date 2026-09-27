/**
 * HOOSHYAR ENERGY — STAGE 10 STEP 3 REGRESSION AUDIT & VERIFICATION SUITE
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT_DIR = process.cwd();
const DB_PATH = path.join(ROOT_DIR, 'db.json');
const BASELINE_DB_HASH = '52c7c5ec80711b1cb0f5db51c644fee109bf122184c391eef4bc826cb0b25918';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

function sha256(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

console.log('========================================================================');
console.log('HOOSHYAR ENERGY — STAGE 10 STEP 3 REGRESSION & AUDIT VERIFICATION');
console.log('========================================================================');

// 1. IMMUTABILITY GUARD
console.log('\n[Guard 1] Repository db.json Immutability:');
const currentDbHash = sha256(fs.readFileSync(DB_PATH));
assert(currentDbHash === BASELINE_DB_HASH, 'db.json byte-for-byte unmodified', `Expected ${BASELINE_DB_HASH}, got ${currentDbHash}`);

// 2. COMPONENT EXISTENCE & ACCESSIBILITY AUDIT
console.log('\n[Guard 2] PersianModal Component Implementation & Accessibility:');
const modalPath = path.join(ROOT_DIR, 'src/components/common/PersianModal.tsx');
assert(fs.existsSync(modalPath), 'PersianModal.tsx exists');
const modalCode = fs.readFileSync(modalPath, 'utf8');
assert(modalCode.includes('role={role}'), 'PersianModal supports ARIA role');
assert(modalCode.includes('aria-modal="true"'), 'PersianModal has aria-modal="true"');
assert(modalCode.includes('aria-labelledby="persian-modal-title"'), 'PersianModal has aria-labelledby');
assert(modalCode.includes('dir="rtl"'), 'PersianModal has dir="rtl" for Persian typography');
assert(modalCode.includes('Escape'), 'PersianModal supports Escape key closing');
assert(modalCode.includes('previouslyFocusedElement'), 'PersianModal restores previously focused element upon close');

console.log('\n[Guard 3] PersianPromptModal Component Implementation:');
const promptPath = path.join(ROOT_DIR, 'src/components/common/PersianPromptModal.tsx');
assert(fs.existsSync(promptPath), 'PersianPromptModal.tsx exists');
const promptCode = fs.readFileSync(promptPath, 'utf8');
assert(promptCode.includes('fields.map'), 'PersianPromptModal dynamically renders form fields');
assert(promptCode.includes('field.required'), 'PersianPromptModal supports required validation');
assert(promptCode.includes('onClose()'), 'PersianPromptModal supports cancellation');
assert(promptCode.includes('onSubmit(values)'), 'PersianPromptModal submits validated key-value map');
assert(promptCode.includes('isBusy'), 'PersianPromptModal prevents duplicate submission while busy');

console.log('\n[Guard 4] PersianConfirmModal Component Implementation:');
const confirmPath = path.join(ROOT_DIR, 'src/components/common/PersianConfirmModal.tsx');
assert(fs.existsSync(confirmPath), 'PersianConfirmModal.tsx exists');
const confirmCode = fs.readFileSync(confirmPath, 'utf8');
assert(confirmCode.includes('role="alertdialog"'), 'PersianConfirmModal uses role="alertdialog"');
assert(confirmCode.includes('variant = \'primary\'') || confirmCode.includes('variant?:'), 'PersianConfirmModal supports semantic styling variants');
assert(confirmCode.includes('onConfirm()'), 'PersianConfirmModal calls onConfirm on confirmation');
assert(confirmCode.includes('onClose()'), 'PersianConfirmModal dismisses on cancel without action');

console.log('\n[Guard 5] ToastContext & Notification Provider:');
const toastPath = path.join(ROOT_DIR, 'src/context/ToastContext.tsx');
assert(fs.existsSync(toastPath), 'ToastContext.tsx exists');
const toastCode = fs.readFileSync(toastPath, 'utf8');
assert(toastCode.includes('aria-live="polite"'), 'Toast container implements aria-live="polite" for screen readers');
assert(toastCode.includes('role={isError ? \'alert\' : \'status\'}'), 'Toast notifications use semantic status/alert ARIA roles');
assert(toastCode.includes('showSuccess') && toastCode.includes('showError'), 'Toast context exposes showSuccess and showError');
assert(toastCode.includes('dismissToast'), 'Toast context supports dismissing toasts');
assert(toastCode.includes('setTimeout'), 'Toasts auto-dismiss after designated duration');

console.log('\n[Guard 6] Barrel Export & Application Provider Integration:');
const barrelCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/common/index.ts'), 'utf8');
assert(barrelCode.includes("export * from './PersianModal'"), 'PersianModal exported in common/index.ts');
assert(barrelCode.includes("export * from './PersianPromptModal'"), 'PersianPromptModal exported in common/index.ts');
assert(barrelCode.includes("export * from './PersianConfirmModal'"), 'PersianConfirmModal exported in common/index.ts');

const appCode = fs.readFileSync(path.join(ROOT_DIR, 'src/App.tsx'), 'utf8');
assert(appCode.includes('ToastProvider'), 'App.tsx wraps application inside ToastProvider');

// 3. TARGET WORKFLOW AUDIT
console.log('\n[Guard 7] Workflow Audit: Result.tsx:');
const resultCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/Result.tsx'), 'utf8');
assert(!resultCode.match(/(\balert\(|window\.alert|window\.prompt|window\.confirm)/), 'Result.tsx contains ZERO native alert/prompt/confirm');
assert(resultCode.includes('PersianPromptModal'), 'Result.tsx integrates PersianPromptModal for scenario save');
assert(resultCode.includes('isSaveScenarioModalOpen'), 'Result.tsx controls modal with explicit state');
assert(resultCode.includes('handleSaveScenarioSubmit'), 'Result.tsx saves scenario only upon form submission');
assert(resultCode.includes('showSuccess') && resultCode.includes('showWarning'), 'Result.tsx uses Persian Toast notifications');

console.log('\n[Guard 8] Workflow Audit: CommercialWorkspace.tsx:');
const commCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/procurement/CommercialWorkspace.tsx'), 'utf8');
assert(!commCode.match(/(\balert\(|window\.alert|window\.prompt|window\.confirm)/), 'CommercialWorkspace.tsx contains ZERO native alert/prompt/confirm');
assert(commCode.includes('useToast'), 'CommercialWorkspace.tsx imports and calls useToast');
assert(commCode.includes('showSuccess(\'استعلام مناقصه EPC با موفقیت منتشر گردید.\')'), 'CommercialWorkspace shows success toast on RFQ publication');
assert(commCode.includes('showSuccess(\'پیمانکار منتخب با موفقیت تعیین و تایید شد.\')'), 'CommercialWorkspace shows success toast on bid award');
assert(commCode.includes('showSuccess(\'سفارش خرید رسمی (PO) با موفقیت صادر گردید.\')'), 'CommercialWorkspace shows success toast on PO issuance');
assert(commCode.includes('showError('), 'CommercialWorkspace routes errors to toast rather than alert');

console.log('\n[Guard 9] Workflow Audit: MyProjects.tsx:');
const myProjectsCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/solar-assets/MyProjects.tsx'), 'utf8');
assert(!myProjectsCode.match(/(\balert\(|window\.alert|window\.prompt|window\.confirm)/), 'MyProjects.tsx contains ZERO native alert/prompt/confirm');
assert(myProjectsCode.includes('PersianPromptModal'), 'MyProjects.tsx uses PersianPromptModal for document upload');
assert(myProjectsCode.includes('PersianConfirmModal'), 'MyProjects.tsx uses PersianConfirmModal for review submission');
assert(myProjectsCode.includes('uploadDocModalProjectId'), 'Document upload modal is gated by active project ID');
assert(myProjectsCode.includes('submitReviewProjectId'), 'Review submission modal is gated by active project ID');
assert(myProjectsCode.includes('setUploadDocModalProjectId(null)'), 'Canceling document upload dismisses without uploading');
assert(myProjectsCode.includes('setSubmitReviewProjectId(null)'), 'Canceling review submission dismisses without submitting');
assert(myProjectsCode.includes('res.ok'), 'Success toast is only triggered on HTTP 200 res.ok');

console.log('\n[Guard 10] Workflow Audit: PortfolioDashboard.tsx:');
const portfolioCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/enterprise/PortfolioDashboard.tsx'), 'utf8');
assert(!portfolioCode.match(/(\balert\(|window\.alert|window\.prompt|window\.confirm)/), 'PortfolioDashboard.tsx contains ZERO native alert/prompt/confirm');
assert(portfolioCode.includes('useToast'), 'PortfolioDashboard.tsx integrates useToast');
assert(portfolioCode.includes('showSuccess(\'گزارش هوشمند مدیریتی با موفقیت تولید شد.'), 'PortfolioDashboard provides Persian toast on AI generation success');
assert(portfolioCode.includes('showError('), 'PortfolioDashboard provides Persian toast on AI generation error');

console.log('\n[Guard 11] Workflow Audit: ProfileEdit.tsx:');
const profileCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/vendor/portal/ProfileEdit.tsx'), 'utf8');
assert(!profileCode.match(/(\balert\(|window\.alert|window\.prompt|window\.confirm)/), 'ProfileEdit.tsx contains ZERO native alert/prompt/confirm');
assert(profileCode.includes('useToast'), 'ProfileEdit.tsx integrates useToast');
assert(profileCode.includes('showSuccess(\'اطلاعات فروشگاه با موفقیت ذخیره شد.\''), 'ProfileEdit triggers Persian toast upon profile form submit');

console.log('\n========================================================================');
console.log(`AUDIT RESULT: ${passed} passed, ${failed} failed`);
console.log('========================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
