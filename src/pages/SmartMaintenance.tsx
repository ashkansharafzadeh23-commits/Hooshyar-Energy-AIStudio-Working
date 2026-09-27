import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  AlertTriangle, 
  Stethoscope, 
  FileText, 
  UserPlus, 
  History, 
  Calculator, 
  RefreshCw, 
  Plus, 
  Zap, 
  Building,
  CheckCircle,
  ShieldCheck,
  Loader2,
  Wrench,
  Search,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { AdBanner } from '../components/AdBanner';
import { AlertDashboard } from '../components/maintenance/AlertDashboard';
import { DiagnosisView } from '../components/maintenance/DiagnosisView';
import { CaseList } from '../components/maintenance/CaseList';
import { CaseDetailModal } from '../components/maintenance/CaseDetailModal';
import { TechnicianMatcher } from '../components/maintenance/TechnicianMatcher';
import { MaintenanceHistory } from '../components/maintenance/MaintenanceHistory';
import { CustomerMaintenanceRequest } from '../components/maintenance/CustomerMaintenanceRequest';
import { CustomerCaseTracking } from '../components/maintenance/CustomerCaseTracking';
import { ApprovedProfessionalsDirectory } from '../components/maintenance/ApprovedProfessionalsDirectory';
import { 
  AssetAlert, 
  MaintenanceCase, 
  MaintenanceDiagnosis, 
  MaintenanceAction, 
  TechnicianMatch,
  MaintenanceAssignmentHistory 
} from '../types/maintenance';

export default function SmartMaintenance() {
  const [activeTab, setActiveTab] = useState<'NEW_REQUEST' | 'CASES' | 'TRACKING' | 'TECHNICIANS' | 'ALERTS' | 'DIAGNOSIS' | 'MATCHING' | 'HISTORY' | 'CALCULATOR'>('NEW_REQUEST');
  
  // Projects and selection
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Maintenance entities
  const [alerts, setAlerts] = useState<AssetAlert[]>([]);
  const [cases, setCases] = useState<MaintenanceCase[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AssetAlert | null>(null);
  const [currentDiagnosis, setCurrentDiagnosis] = useState<MaintenanceDiagnosis | null>(null);
  
  // Detail Modal & Action states
  const [selectedCase, setSelectedCase] = useState<MaintenanceCase | null>(null);
  const [caseActions, setCaseActions] = useState<MaintenanceAction[]>([]);
  const [matchingCase, setMatchingCase] = useState<MaintenanceCase | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianMatch[]>([]);
  const [assignmentHistories, setAssignmentHistories] = useState<MaintenanceAssignmentHistory[]>([]);

  // Customer tracking specific state
  const [trackingCaseId, setTrackingCaseId] = useState<string | null>(null);
  const [trackingInputCode, setTrackingInputCode] = useState<string>('');
  const [trackingLookupError, setTrackingLookupError] = useState<string | null>(null);
  const [preselectedTechForRequest, setPreselectedTechForRequest] = useState<TechnicianMatch | null>(null);

  // Loaders
  const [loading, setLoading] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // New Case Quick Modal
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseDesc, setNewCaseDesc] = useState('');
  const [newCasePriority, setNewCasePriority] = useState<string>('MEDIUM');

  // Energy balance state (preserving previous calculator)
  const [generation, setGeneration] = useState(5000);
  const [consumption, setConsumption] = useState(4500);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  // Fetch initial project list and maintenance data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch projects
      const projRes = await fetch('/api/projects', { headers: getAuthHeaders() });
      if (projRes.ok) {
        const pData = await projRes.json();
        const list = Array.isArray(pData) ? pData : pData.projects || [];
        setProjects(list);
        if (list.length > 0 && !selectedProjectId) {
          setSelectedProjectId(list[0].id);
        }
      }

      // 2. Fetch alerts
      await fetchAlerts();
      // 3. Fetch cases
      await fetchCases();
    } catch (err) {
      console.error('Error fetching maintenance initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async (projectId?: string) => {
    try {
      const pid = projectId || selectedProjectId;
      const url = pid ? `/api/projects/${pid}/alerts` : '/api/alerts';
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAlerts(Array.isArray(data) ? data : data.alerts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCases = async (projectId?: string) => {
    try {
      const pid = projectId || selectedProjectId;
      const url = pid ? `/api/maintenance/cases?projectId=${pid}` : '/api/maintenance/cases';
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCases(Array.isArray(data) ? data : data.cases || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Switch active project
  const handleProjectChange = (pid: string) => {
    setSelectedProjectId(pid);
    fetchAlerts(pid);
    fetchCases(pid);
  };

  // Fast tracking code lookup
  const handleLookupTrackingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingInputCode.trim()) return;
    setTrackingLookupError(null);
    const code = trackingInputCode.trim();

    // Check existing loaded cases
    const localMatch = cases.find(
      c => c.caseNumber?.toLowerCase() === code.toLowerCase() ||
           c.maintenanceCode?.toLowerCase() === code.toLowerCase() ||
           c.id === code
    );
    if (localMatch) {
      setTrackingCaseId(localMatch.id);
      setActiveTab('TRACKING');
      setTrackingInputCode('');
      return;
    }

    // Call API by caseId or code
    try {
      const res = await fetch(`/api/maintenance/${encodeURIComponent(code)}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const found = await res.json();
        setTrackingCaseId(found.id);
        setActiveTab('TRACKING');
        setTrackingInputCode('');
      } else {
        setTrackingLookupError('پرونده‌ای با این کد رهگیری یافت نشد.');
      }
    } catch {
      setTrackingLookupError('خطا در جستجوی کد رهگیری.');
    }
  };

  // Acknowledge Alert
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ note: 'بررسی اولیه توسط مسئول پایش انجام شد.' })
      });
      if (res.ok) {
        await fetchAlerts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Dismiss Alert
  const handleDismissAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/dismiss`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: 'هشدار گذرا یا کاذب ارزیابی شد.' })
      });
      if (res.ok) {
        await fetchAlerts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Run Diagnosis
  const handleDiagnoseAlert = async (alert: AssetAlert) => {
    setSelectedAlert(alert);
    setActiveTab('DIAGNOSIS');
    setDiagLoading(true);
    try {
      const res = await fetch(`/api/alerts/${alert.id}/diagnose`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ triggerAiAssisted: true })
      });
      if (res.ok) {
        const diagData = await res.json();
        setCurrentDiagnosis(diagData.diagnosis || diagData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDiagLoading(false);
    }
  };

  // Create Case from Alert
  const handleCreateCaseFromAlert = async (alert: AssetAlert) => {
    try {
      const res = await fetch('/api/maintenance/cases', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          projectId: alert.projectId,
          assetId: alert.assetId,
          alertIds: [alert.id],
          title: `رسیدگی به: ${alert.title}`,
          description: alert.description || `ارجاع خرابی از هشدار شماره ${alert.alertCode}`,
          priority: alert.severity === 'CRITICAL' ? 'URGENT' : alert.severity === 'HIGH' ? 'HIGH' : 'MEDIUM'
        })
      });
      if (res.ok) {
        await fetchAlerts();
        await fetchCases();
        setActiveTab('CASES');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Case from Diagnosis
  const handleCreateCaseFromDiagnosis = async (alert: AssetAlert, diagnosis: MaintenanceDiagnosis) => {
    try {
      const res = await fetch('/api/maintenance/cases', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          projectId: alert.projectId,
          assetId: alert.assetId,
          alertIds: [alert.id],
          title: `اقدام اصلاحی: ${alert.title}`,
          description: diagnosis.confidenceScore !== undefined && diagnosis.confidenceScore !== null
            ? `تشخیص ثبت‌شده با سطح اطمینان ${Math.round(diagnosis.confidenceScore * 100)}%`
            : 'تشخیص ثبت‌شده بر اساس شواهد پایش فنی',
          priority: alert.severity === 'CRITICAL' ? 'URGENT' : 'HIGH',
          rootCause: diagnosis.possibleCauses?.[0] || 'تحلیل قواعد تشخیص'
        })
      });
      if (res.ok) {
        await fetchCases();
        setActiveTab('CASES');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Select Case for Detail Modal
  const handleSelectCase = async (mCase: MaintenanceCase) => {
    setSelectedCase(mCase);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/maintenance/${mCase.id}/actions`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setCaseActions(Array.isArray(data) ? data : data.actions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setModalLoading(false);
    }
  };

  // Add Action to Case
  const handleAddAction = async (caseId: string, actionData: any) => {
    try {
      const res = await fetch(`/api/maintenance/${caseId}/actions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(actionData)
      });
      if (res.ok) {
        const actRes = await fetch(`/api/maintenance/${caseId}/actions`, { headers: getAuthHeaders() });
        if (actRes.ok) {
          const acts = await actRes.json();
          setCaseActions(Array.isArray(acts) ? acts : acts.actions || []);
        }
        await fetchCases();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Verify Case
  const handleVerifyCase = async (caseId: string) => {
    try {
      const res = await fetch(`/api/maintenance/${caseId}/verify`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const result = await res.json();
        if (selectedCase) {
          setSelectedCase({
            ...selectedCase,
            postMaintenanceCheck: result.postMaintenanceCheck || result
          });
        }
        await fetchCases();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Close Case
  const handleCloseCase = async (caseId: string, closeData: any) => {
    try {
      const res = await fetch(`/api/maintenance/${caseId}/close`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(closeData)
      });
      if (res.ok) {
        await fetchCases();
        setSelectedCase(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Technician Matcher
  const handleOpenTechnicianMatching = async (mCase: MaintenanceCase) => {
    setMatchingCase(mCase);
    setActiveTab('MATCHING');
    setMatchLoading(true);
    try {
      const res = await fetch(`/api/technicians/matching`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          projectId: mCase.projectId,
          assetId: mCase.assetId,
          symptoms: [mCase.title, mCase.description]
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTechnicians(Array.isArray(data) ? data : data.matches || data.technicians || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMatchLoading(false);
    }
  };

  // Assign Technician
  const handleAssignTechnician = async (caseId: string, technicianId: string, notes?: string) => {
    try {
      const res = await fetch(`/api/maintenance/${caseId}/select-technician`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          technicianId,
          notes
        })
      });
      if (res.ok) {
        await fetchCases();
        setActiveTab('CASES');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Manual Case
  const handleCreateManualCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseTitle.trim()) return;
    try {
      const res = await fetch('/api/maintenance/cases', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          projectId: selectedProjectId || 'CUSTOMER_DIRECT',
          assetId: 'UNREGISTERED',
          title: newCaseTitle,
          description: newCaseDesc,
          priority: newCasePriority
        })
      });
      if (res.ok) {
        setNewCaseTitle('');
        setNewCaseDesc('');
        setShowNewCaseModal(false);
        await fetchCases();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-Vazirmatn p-4 md:p-8 pb-28">
      <div className="max-w-7xl mx-auto space-y-6">
        <AdBanner />

        {/* Page Top Header */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit mb-2">
                <Wrench size={14} />
                خدمات تخصصی بهره‌برداری، تعمیرات و نگهداری هوشمند (O&M)
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-2">
                تعمیرات و نگهداری هوشمند
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                سامانه یکپارچه تشخیص عیب، درخواست سرویس، اعزام کارشناسان مجاز و ثبت سوابق در شناسنامه فنی نیروگاه
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPreselectedTechForRequest(null);
                  setActiveTab('NEW_REQUEST');
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Plus size={16} />
                <span>ثبت درخواست تعمیرات جدید</span>
              </button>

              {/* Project Switcher if available */}
              {projects.length > 0 && (
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 text-xs">
                  <Building size={14} className="text-slate-400 mr-1" />
                  <span className="font-bold text-slate-600">پروژه:</span>
                  <select
                    value={selectedProjectId}
                    onChange={e => handleProjectChange(e.target.value)}
                    className="font-bold bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-slate-800 outline-none"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title || p.projectCode || p.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Quick Tracking Search Bar */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <form onSubmit={handleLookupTrackingCode} className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={trackingInputCode}
                  onChange={e => setTrackingInputCode(e.target.value)}
                  placeholder="پیگیری سریع با کد پرونده (مثال: MC-2026-0001)..."
                  className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors"
              >
                رهگیری
              </button>
            </form>

            {trackingLookupError && (
              <span className="text-[11px] text-rose-600 font-bold">{trackingLookupError}</span>
            )}

            <div className="text-[11px] text-slate-400">
              تعداد پرونده‌های شما: <strong className="text-slate-700">{cases.length}</strong>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-slate-200 bg-white px-4 rounded-2xl shadow-sm gap-2 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('NEW_REQUEST')}
            className={`py-3.5 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'NEW_REQUEST'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Plus size={16} />
            ثبت درخواست و عیب‌یابی هوشمند
          </button>

          <button
            onClick={() => setActiveTab('CASES')}
            className={`py-3.5 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'CASES'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <FileText size={16} />
            پیگیری و پرونده‌های من ({cases.length})
          </button>

          {activeTab === 'TRACKING' && (
            <button
              onClick={() => setActiveTab('TRACKING')}
              className="py-3.5 px-4 border-b-2 border-indigo-600 text-indigo-600 transition-all flex items-center gap-2"
            >
              <Search size={16} />
              رهگیری پرونده انتخابی
            </button>
          )}

          <button
            onClick={() => setActiveTab('TECHNICIANS')}
            className={`py-3.5 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'TECHNICIANS'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={16} />
            شبکه متخصصان مجاز O&M
          </button>

          <button
            onClick={() => setActiveTab('ALERTS')}
            className={`py-3.5 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'ALERTS'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <AlertTriangle size={16} />
            مرکز پایش و هشدارها ({alerts.filter(a => a.status === 'TRIGGERED' || a.status === 'ACKNOWLEDGED').length})
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`py-3.5 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'HISTORY'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <History size={16} />
            تاریخچه و شاخص‌های O&M
          </button>

          <button
            onClick={() => setActiveTab('CALCULATOR')}
            className={`py-3.5 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'CALCULATOR'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Calculator size={16} />
            محاسبه‌گر توازن انرژی
          </button>
        </div>

        {/* Tab 1: Customer Maintenance Request Flow */}
        {activeTab === 'NEW_REQUEST' && (
          <CustomerMaintenanceRequest
            preselectedTechnician={preselectedTechForRequest}
            onCaseCreated={newCase => {
              setCases(prev => [newCase, ...prev]);
              setTrackingCaseId(newCase.id);
            }}
            onGoToCases={() => setActiveTab('CASES')}
            onTrackCase={id => {
              setTrackingCaseId(id);
              setActiveTab('TRACKING');
            }}
          />
        )}

        {/* Tab 2: Case Tracking Specific View */}
        {activeTab === 'TRACKING' && trackingCaseId && (
          <CustomerCaseTracking
            caseId={trackingCaseId}
            onBack={() => setActiveTab('CASES')}
            onCaseUpdated={updated => {
              setCases(prev => prev.map(c => c.id === updated.id ? updated : c));
            }}
          />
        )}

        {/* Tab 3: Case List */}
        {activeTab === 'CASES' && (
          <CaseList
            cases={cases}
            loading={loading}
            onSelectCase={c => {
              setTrackingCaseId(c.id);
              setActiveTab('TRACKING');
            }}
            onAssignTechnician={handleOpenTechnicianMatching}
            onNewCase={() => setActiveTab('NEW_REQUEST')}
          />
        )}

        {/* Tab 4: Approved Professionals Directory */}
        {activeTab === 'TECHNICIANS' && (
          <ApprovedProfessionalsDirectory
            onRequestWithTech={tech => {
              setPreselectedTechForRequest(tech);
              setActiveTab('NEW_REQUEST');
            }}
          />
        )}

        {/* Tab 5: Alert Dashboard */}
        {activeTab === 'ALERTS' && (
          <AlertDashboard
            alerts={alerts}
            loading={loading}
            selectedAlert={selectedAlert}
            onSelectAlert={alert => setSelectedAlert(alert)}
            onAcknowledge={handleAcknowledgeAlert}
            onDismiss={handleDismissAlert}
            onDiagnose={handleDiagnoseAlert}
            onCreateCase={handleCreateCaseFromAlert}
            onRefresh={() => fetchAlerts()}
          />
        )}

        {/* Tab 6: Diagnosis & Warranty View */}
        {activeTab === 'DIAGNOSIS' && (
          <DiagnosisView
            selectedAlert={selectedAlert}
            diagnosis={currentDiagnosis}
            loading={diagLoading}
            onRunDiagnosis={alertId => {
              if (selectedAlert) handleDiagnoseAlert(selectedAlert);
            }}
            onCreateCaseFromDiagnosis={handleCreateCaseFromDiagnosis}
            onBackToAlerts={() => setActiveTab('ALERTS')}
          />
        )}

        {/* Tab 7: Technician Matching */}
        {activeTab === 'MATCHING' && (
          <TechnicianMatcher
            mCase={matchingCase}
            technicians={technicians}
            loading={matchLoading}
            onAssign={handleAssignTechnician}
            onClose={() => setActiveTab('CASES')}
          />
        )}

        {/* Tab 8: Maintenance History & KPIs */}
        {activeTab === 'HISTORY' && (
          <MaintenanceHistory
            cases={cases}
            historyLogs={assignmentHistories}
            loading={loading}
          />
        )}

        {/* Tab 9: Power Balance Calculator */}
        {activeTab === 'CALCULATOR' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-lg font-bold text-slate-900">ماشین‌حساب توازن انرژی مصرف و تولید</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">توان تولیدی (وات)</label>
                <input
                  type="number"
                  value={generation}
                  onChange={e => setGeneration(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">توان مصرفی (وات)</label>
                <input
                  type="number"
                  value={consumption}
                  onChange={e => setConsumption(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                />
              </div>
            </div>

            <div
              className={`p-4 rounded-xl flex items-center justify-between ${
                generation - consumption > 0
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <span className="font-bold text-xs">وضعیت توازن توان لحظه‌ای:</span>
              <span className="font-black text-sm">
                {generation - consumption > 0 ? 'مازاد تولید (تزریق به باتری یا شبکه)' : 'کسری تولید (نیاز به مصرف از شبکه)'}
              </span>
            </div>
          </div>
        )}

        {/* Modal: Case Details & Actions */}
        {selectedCase && (
          <CaseDetailModal
            mCase={selectedCase}
            actions={caseActions}
            loading={modalLoading}
            onClose={() => setSelectedCase(null)}
            onAddAction={handleAddAction}
            onVerifyCase={handleVerifyCase}
            onCloseCase={handleCloseCase}
            onRefresh={() => fetchCases()}
          />
        )}

        {/* Modal: Create Manual Maintenance Case */}
        {showNewCaseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">ثبت پرونده تعمیراتی دستی جدید</h3>
              <form onSubmit={handleCreateManualCase} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">عنوان پرونده خرابی یا سرویس:</label>
                  <input
                    required
                    type="text"
                    placeholder="مثال: بازرسی دوره‌ای تابلو اینورتر یا افت ولتاژ استرینگ ۲"
                    value={newCaseTitle}
                    onChange={e => setNewCaseTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">اولویت رسیدگی:</label>
                  <select
                    value={newCasePriority}
                    onChange={e => setNewCasePriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="LOW">عادی (Low)</option>
                    <option value="MEDIUM">متوسط (Medium)</option>
                    <option value="HIGH">بالا (High)</option>
                    <option value="URGENT">فوری و بحرانی (Urgent)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">شرح جزئیات ایراد:</label>
                  <textarea
                    value={newCaseDesc}
                    onChange={e => setNewCaseDesc(e.target.value)}
                    placeholder="توضیحات تکمیلی پیرامون محل وقوع، تجهیز، نشانه..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white h-20 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCaseModal(false)}
                    className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm"
                  >
                    ثبت پرونده
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
