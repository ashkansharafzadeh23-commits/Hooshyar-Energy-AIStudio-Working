import React from 'react';
import { EnergyProject } from '../../../types/project';
import { FinancingWorkspace } from '../../../components/financing/FinancingWorkspace';

interface FinancingTabProps {
  projectId: string;
  project: EnergyProject;
  onProjectUpdate?: () => void;
}

export const FinancingTab: React.FC<FinancingTabProps> = ({ projectId, project, onProjectUpdate }) => {
  return (
    <div className="py-2">
      <FinancingWorkspace
        projectId={projectId}
        project={project}
        onProjectUpdate={onProjectUpdate}
      />
    </div>
  );
};

export default FinancingTab;
