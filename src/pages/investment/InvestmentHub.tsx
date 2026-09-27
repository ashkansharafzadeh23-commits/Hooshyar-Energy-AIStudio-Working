import React from 'react';
import { useNavigate } from 'react-router-dom';
import { InvestmentHub as InvestmentHubComponent } from '../../components/investment/InvestmentHub';

export default function InvestmentHubPage() {
  const navigate = useNavigate();

  return (
    <div className="py-4">
      <InvestmentHubComponent
        onNavigateFinancing={() => navigate('/projects')}
        onOpenCreateProject={() => navigate('/projects/create')}
      />
    </div>
  );
}
