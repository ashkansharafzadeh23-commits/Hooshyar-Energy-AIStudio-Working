const fs = require('fs');
let code = fs.readFileSync('src/pages/projects/ProjectDetail.tsx', 'utf-8');

// Add imports if they don't exist
if (!code.includes('CommissioningTab')) {
  code = code.replace(/import \{ ProcurementTab \} from '\.\/Workspace\/ProcurementTab';/, 
    `import { ProcurementTab } from './Workspace/ProcurementTab';
import { CommissioningTab } from './Workspace/CommissioningTab';
import { HandoverTab } from './Workspace/HandoverTab';
import { AssetTab } from './Workspace/AssetTab';`);
}

// Add tabs to UI config if they don't exist
if (!code.includes("{ id: 'commissioning'")) {
  code = code.replace(/\{ id: 'procurement', label: 'تأمین', disabled: false \},/,
    `{ id: 'procurement', label: 'تأمین', disabled: false },
    { id: 'commissioning', label: 'راه‌اندازی', disabled: false },
    { id: 'handover', label: 'تحویل', disabled: false },
    { id: 'asset', label: 'دارایی انرژی', disabled: false },`);
}

// Ensure the new tabs render their components
const replaceCode = `{activeTab === 'contract' && <ContractTab projectId={project.id} />}
        {activeTab === 'milestones' && <MilestonesTab projectId={project.id} />}
        {activeTab === 'documents' && <DataRoomTab projectId={project.id} />}
        {activeTab === 'procurement' && <ProcurementTab projectId={project.id} />}
        {activeTab === 'commissioning' && <CommissioningTab projectId={project.id} />}
        {activeTab === 'handover' && <HandoverTab projectId={project.id} />}
        {activeTab === 'asset' && <AssetTab projectId={project.id} />}
        {activeTab !== 'overview' && activeTab !== 'financial' && activeTab !== 'contract' && activeTab !== 'milestones' && activeTab !== 'documents' && activeTab !== 'procurement' && activeTab !== 'commissioning' && activeTab !== 'handover' && activeTab !== 'asset' && !tabs.find(t => t.id === activeTab)?.disabled && (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center">
            <p className="text-gray-500">محتوای این بخش هنوز تکمیل نشده است.</p>
          </div>
        )}`;
code = code.replace(/\{activeTab === 'contract'[\s\S]*?\)\}/, replaceCode);

fs.writeFileSync('src/pages/projects/ProjectDetail.tsx', code);
