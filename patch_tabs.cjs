const fs = require('fs');
let code = fs.readFileSync('src/pages/projects/ProjectDetail.tsx', 'utf-8');
const replaceCode = `{activeTab === 'contract' && <ContractTab projectId={project.id} />}
        {activeTab === 'milestones' && <MilestonesTab projectId={project.id} />}
        {activeTab === 'documents' && <DataRoomTab projectId={project.id} />}
        {activeTab === 'procurement' && <ProcurementTab projectId={project.id} />}
        {activeTab !== 'overview' && activeTab !== 'financial' && activeTab !== 'contract' && activeTab !== 'milestones' && activeTab !== 'documents' && activeTab !== 'procurement' && !tabs.find(t => t.id === activeTab)?.disabled && (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center">
            <p className="text-gray-500">محتوای این بخش هنوز تکمیل نشده است.</p>
          </div>
        )}`;
code = code.replace(/\{activeTab !== 'overview'[\s\S]*?\)\}/, replaceCode);
fs.writeFileSync('src/pages/projects/ProjectDetail.tsx', code);
