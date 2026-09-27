/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import CustomerLogin from './pages/CustomerLogin';
import UserDashboard from './pages/UserDashboard';
import Home from './pages/Home';
import LocationTypePage from './pages/LocationType';
import AreaCityPage from './pages/AreaCity';
import ChecklistPage from './pages/Checklist';
import ConsumptionPage from './pages/Consumption';
import RecommendationPage from './pages/Recommendation';
import ResultPage from './pages/Result';
import ContractorsList from './pages/ContractorsList';
import ContractorAuth from './pages/ContractorAuth';
import ContractorDashboard from './pages/ContractorDashboard';
import VendorsList from './pages/VendorsList';
import SellersList from './pages/SellersList';
import AdsPortal from './pages/AdsPortal';
import SmartMaintenance from './pages/SmartMaintenance';
import TechnicianAuth from './pages/TechnicianAuth';
import TechnicianDashboard from './pages/technician/Dashboard';
import VendorAuth from './pages/VendorAuth';
import TechniciansList from './pages/TechniciansList';
import VendorPortal from './pages/vendor/VendorPortal';
import VendorStorefront from './pages/vendor/VendorStorefront';
import SolarPlanner from './pages/SolarPlanner';
import PowerPlantSetup from './pages/PowerPlantSetup';
import SolarAssetsList from './pages/solar-assets/AssetList';
import SolarAssetDetail from './pages/solar-assets/AssetDetail';
import MyProjects from './pages/solar-assets/MyProjects';
import AdminReview from './pages/solar-assets/AdminReview';
import SolarAnalysisExperience from './pages/SolarAnalysisExperience';
import MainLayout from './layouts/MainLayout';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import ProjectDetail from './pages/projects/ProjectDetail';
import ProjectProposal from './pages/projects/ProjectProposal';
import InvestmentHub from './pages/investment/InvestmentHub';
import OpportunitiesList from './pages/investment/OpportunitiesList';
import OpportunityDetail from './pages/investment/OpportunityDetail';
import InvestorProfileSetup from './pages/investment/InvestorProfileSetup';
import MyMatches from './pages/investment/MyMatches';
import PortfolioDashboard from './pages/enterprise/PortfolioDashboard';
import PartnersHub from './pages/PartnersHub';
import TechnicianPublicProfile from './pages/technician/PublicProfile';
import ContractorPublicProfile from './pages/ContractorPublicProfile';

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route element={<MainLayout />}>
              <Route path="/customer-login" element={<CustomerLogin />} />
              <Route path="/user-dashboard" element={<UserDashboard />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/projects" element={<UserDashboard />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/projects/:id/proposal" element={<ProjectProposal />} />
              <Route path="/investment-hub" element={<InvestmentHub />} />
              <Route path="/investment-hub/opportunities" element={<OpportunitiesList />} />
              <Route path="/investment-hub/opportunities/:id" element={<OpportunityDetail />} />
              <Route path="/investment-hub/investor-profile" element={<InvestorProfileSetup />} />
              <Route path="/investment-hub/matches" element={<MyMatches />} />
              <Route path="/enterprise/portfolio" element={<PortfolioDashboard />} />
              <Route path="/portfolio" element={<PortfolioDashboard />} />

              <Route path="/powerplant-setup" element={<PowerPlantSetup />} />
              <Route path="/solar-assets" element={<SolarAssetsList />} />
              <Route path="/assets" element={<SolarAssetsList />} />
              <Route path="/solar-assets/my-projects" element={<MyProjects />} />
              <Route path="/solar-assets/:id" element={<SolarAssetDetail />} />
              <Route path="/assets/:id" element={<SolarAssetDetail />} />
              <Route path="/admin/solar-assets" element={<AdminReview />} />
              <Route path="/solar-planner" element={<SolarPlanner />} />
              <Route path="/target-select" element={<SolarAnalysisExperience />} />
              <Route path="/solar-analysis" element={<SolarAnalysisExperience />} />
              <Route path="/legacy-target-select" element={<Home />} />
              <Route path="/location-type" element={<LocationTypePage />} />
              <Route path="/area-city" element={<AreaCityPage />} />
              <Route path="/checklist" element={<ChecklistPage />} />
              <Route path="/consumption" element={<ConsumptionPage />} />
              <Route path="/recommendation" element={<RecommendationPage />} />
              <Route path="/result" element={<ResultPage />} />
              <Route path="/sellers" element={<SellersList />} />
              <Route path="/vendors" element={<VendorsList />} />
              <Route path="/marketplace" element={<ContractorsList />} />
              <Route path="/contractors" element={<ContractorsList />} />
              <Route path="/epc/:id" element={<ContractorPublicProfile />} />
              <Route path="/partners" element={<PartnersHub />} />
              <Route path="/contractor-auth" element={<ContractorAuth />} />
              <Route path="/contractor-dashboard" element={<ContractorDashboard />} />
              <Route path="/ads-portal" element={<AdsPortal />} />
              <Route path="/smart-maintenance" element={<SmartMaintenance />} />
              <Route path="/maintenance" element={<SmartMaintenance />} />
              <Route path="/technicians" element={<TechniciansList />} />
              <Route path="/technician-auth" element={<TechnicianAuth />} />
              <Route path="/technician-dashboard" element={<TechnicianDashboard />} />
              <Route path="/professionals/:id" element={<TechnicianPublicProfile />} />
              <Route path="/vendor-auth" element={<VendorAuth />} />
              <Route path="/technicians-list" element={<TechniciansList />} />
            <Route path="/vendor/:id" element={<VendorStorefront />} />
            <Route path="/vendor-portal/*" element={<VendorPortal />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </AppProvider>
  );
}
