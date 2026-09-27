import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { EnergyProject } from '../../types/project';
import { 
  ProjectHeader, 
  ProjectContextNavigation, 
  ProjectContextTab, 
  ProjectCockpit, 
  ProjectProcess, 
  ProjectDocumentCenter, 
  ProjectActivityTimeline 
} from '../../components/projects';
import { CommercialWorkspace } from '../../components/procurement';
import { Loader2 } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [project, setProject] = useState<EnergyProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [documentCount, setDocumentCount] = useState<number | undefined>(undefined);
  const [activityCount, setActivityCount] = useState<number | undefined>(undefined);

  // Determine initial navigation tab and target capability from URL query params
  const rawTab = searchParams.get('tab') || 'overview';
  const rawCapability = searchParams.get('cap') || undefined;

  const resolveInitialState = (paramTab: string): {
    navTab: ProjectContextTab;
    processTab?: string;
  } => {
    if (paramTab === 'commercial') return { navTab: 'commercial' };
    if (paramTab === 'documents') return { navTab: 'documents' };
    if (paramTab === 'activity') return { navTab: 'activity' };
    if (paramTab === 'process') return { navTab: 'process' };
    if (paramTab === 'overview') return { navTab: 'overview' };

    // Capability deep link (e.g. ?tab=rfq, ?tab=bids, ?tab=contract, etc.)
    return { navTab: 'process', processTab: paramTab };
  };

  const initial = resolveInitialState(rawTab);
  const [activeTab, setActiveTab] = useState<ProjectContextTab>(initial.navTab);
  const [processTargetTab, setProcessTargetTab] = useState<string | undefined>(initial.processTab);
  const [processTargetCap, setProcessTargetCap] = useState<string | undefined>(rawCapability);

  const fetchProject = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [projRes, docRes, actRes] = await Promise.all([
        fetch(`/api/projects/${id}`, { headers }),
        fetch(`/api/projects/${id}/documents`, { headers }).catch(() => null),
        fetch(`/api/projects/${id}/activity`, { headers }).catch(() => null)
      ]);

      if (projRes.ok) {
        const data = await projRes.json();
        setProject(data);
      }

      if (docRes && docRes.ok) {
        const docs = await docRes.json();
        if (Array.isArray(docs)) setDocumentCount(docs.length);
      }

      if (actRes && actRes.ok) {
        const acts = await actRes.json();
        if (Array.isArray(acts)) setActivityCount(acts.length);
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Sync URL params when user changes tabs or capability
  const handleTabChange = (tab: ProjectContextTab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    newParams.delete('cap');
    setSearchParams(newParams, { replace: true });
  };

  const handleNavigateFromChild = (targetTab: string, targetCap?: string) => {
    if (targetTab === 'overview' || targetTab === 'commercial' || targetTab === 'documents' || targetTab === 'activity') {
      handleTabChange(targetTab as ProjectContextTab);
      return;
    }

    // Navigating to a lifecycle process capability
    setActiveTab('process');
    setProcessTargetTab(targetTab);
    setProcessTargetCap(targetCap);

    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', targetTab);
    if (targetCap) {
      newParams.set('cap', targetCap);
    } else {
      newParams.delete('cap');
    }
    setSearchParams(newParams, { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-600">در حال بارگذاری پرونده پروژه...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center space-y-3">
        <div className="text-lg font-bold text-slate-800">پرونده پروژه یافت نشد</div>
        <p className="text-sm text-slate-500 max-w-md">
          پروژه مورد نظر ممکن است حذف شده باشد یا شما سطح دسترسی لازم برای مشاهده آن را نداشته باشید.
        </p>
      </div>
    );
  }

  const tabLabels: Record<string, string> = {
    overview: 'نمای کلی و کاک‌پیت',
    process: 'فرایند و چرخه عمر',
    commercial: 'تأمین و قراردادها',
    documents: 'اسناد پروژه',
    activity: 'فعالیت‌ها و رویدادها',
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-Vazirmatn pb-24">
      {/* 1. Project Header (Breadcrumb, Title, Code, Metadata, Status, Refresh) */}
      <ProjectHeader
        project={project}
        onRefresh={() => fetchProject(true)}
        refreshing={refreshing}
        activeTabLabel={activeTab !== 'overview' ? tabLabels[activeTab] : undefined}
      />

      {/* 2. Unified Project Context Navigation */}
      <ProjectContextNavigation
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        documentCount={documentCount}
        activityCount={activityCount}
      />

      {/* 3. Main Workspace Stage */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <ProjectCockpit
            project={project}
            onNavigateTab={handleNavigateFromChild}
          />
        )}

        {activeTab === 'process' && (
          <ProjectProcess
            project={project}
            initialTab={processTargetTab}
            initialCapability={processTargetCap}
            onProjectUpdate={() => fetchProject(true)}
            onSelectTab={handleNavigateFromChild}
          />
        )}

        {activeTab === 'commercial' && (
          <CommercialWorkspace
            project={project}
            onProjectUpdate={() => fetchProject(true)}
            onNavigateTab={handleNavigateFromChild}
          />
        )}

        {activeTab === 'documents' && (
          <ProjectDocumentCenter projectId={project.id} />
        )}

        {activeTab === 'activity' && (
          <ProjectActivityTimeline projectId={project.id} />
        )}
      </main>
    </div>
  );
}
