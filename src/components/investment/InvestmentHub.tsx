import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Coins, 
  Zap, 
  Search, 
  Filter, 
  Sparkles, 
  Plus, 
  Briefcase, 
  FolderCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  MapPin,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { InvestmentOpportunity, InvestorProfile, ProjectMatch, ProjectReadinessScore } from '../../types/investment';
import { InvestmentOpportunityCard } from './InvestmentOpportunityCard';
import { InvestmentFilters, InvestmentFilterState } from './InvestmentFilters';
import { InvestmentOpportunityDetail } from './InvestmentOpportunityDetail';
import { InvestmentEmptyState } from './InvestmentEmptyState';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface InvestmentHubProps {
  userRole?: string;
  userId?: string;
  onNavigateFinancing?: () => void;
  onOpenCreateProject?: () => void;
}

export const InvestmentHub: React.FC<InvestmentHubProps> = ({
  userRole = 'OWNER',
  userId,
  onNavigateFinancing,
  onOpenCreateProject
}) => {
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [matches, setMatches] = useState<ProjectMatch[]>([]);
  const [investorProfile, setInvestorProfile] = useState<InvestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view: list or detail
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [selectedReadiness, setSelectedReadiness] = useState<ProjectReadinessScore | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'all' | 'matches' | 'mine'>('all');

  // Filters
  const [filters, setFilters] = useState<InvestmentFilterState>({
    searchQuery: '',
    province: '',
    stage: '',
    minCapacityKw: undefined
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Fetch public opportunities
      const oppRes = await fetch('/api/investment/opportunities');
      if (oppRes.ok) {
        const oppData = await oppRes.json();
        setOpportunities(Array.isArray(oppData) ? oppData : []);
      }

      // 2. If investor profile or logged in, fetch investor profile & matches
      if (token) {
        try {
          const profileRes = await fetch('/api/investment/investor-profile/me', { headers });
          if (profileRes.ok) {
            const prof = await profileRes.json();
            setInvestorProfile(prof);
          }

          const matchRes = await fetch('/api/investment/matches/me', { headers });
          if (matchRes.ok) {
            const matchData = await matchRes.json();
            setMatches(Array.isArray(matchData) ? matchData : []);
          }
        } catch {
          // Non-blocking
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('خطا در بارگذاری فهرست فرصت‌های سرمایه‌گذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch opportunity detail & readiness when selected
  const handleSelectOpportunity = async (id: string) => {
    setSelectedOpportunityId(id);
    setSelectedReadiness(null);
    try {
      const readyRes = await fetch(`/api/investment/opportunities/${id}/readiness`);
      if (readyRes.ok) {
        setSelectedReadiness(await readyRes.json());
      }
    } catch {
      // Non-blocking
    }
  };

  // Filtered opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      // Search
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const titleMatch = opp.title.toLowerCase().includes(q);
        const codeMatch = opp.opportunityCode.toLowerCase().includes(q);
        const provMatch = opp.location.province?.toLowerCase().includes(q);
        if (!titleMatch && !codeMatch && !provMatch) return false;
      }
      // Province
      if (filters.province && opp.location.province !== filters.province) {
        return false;
      }
      // Stage
      if (filters.stage && opp.projectStage !== filters.stage) {
        return false;
      }
      // Min Capacity
      if (filters.minCapacityKw && (opp.targetCapacityKw || 0) < filters.minCapacityKw) {
        return false;
      }
      return true;
    });
  }, [opportunities, filters]);

  // Selected opportunity object
  const selectedOpportunity = opportunities.find((o) => o.id === selectedOpportunityId);
  const selectedMatch = matches.find((m) => m.opportunityId === selectedOpportunityId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-Vazirmatn space-y-6">
      {/* 1. Standard Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                مرکز تعاملات مالی و توسعه تجاری
              </span>
              <DataTruthBadge provenance="VERIFIED_SOURCE" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              سرمایه‌گذاری و تأمین مالی
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              فرصت‌های سرمایه‌گذاری خورشیدی را بررسی کنید یا برای پروژه خود مسیر تأمین مالی را مدیریت کنید.
            </p>
          </div>

          {/* Role Adaptive Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onNavigateFinancing && (
              <button
                type="button"
                onClick={onNavigateFinancing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer min-h-[44px]"
              >
                <Coins className="w-4 h-4" />
                <span>فضای کار تأمین مالی پروژه‌ها</span>
              </button>
            )}

            {userRole === 'OWNER' && onOpenCreateProject && (
              <button
                type="button"
                onClick={onOpenCreateProject}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 transition-colors cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>معرفی فرصت جدید</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* If viewing single opportunity detail */}
      {selectedOpportunity ? (
        <InvestmentOpportunityDetail
          opportunity={selectedOpportunity}
          readiness={selectedReadiness}
          matchScore={selectedMatch?.score}
          matchReasons={selectedMatch?.scoreBreakdown ? Object.keys(selectedMatch.scoreBreakdown) : undefined}
          onBack={() => setSelectedOpportunityId(null)}
          onDeclareInterest={() => {}}
        />
      ) : (
        <>
          {/* Tabs for Navigation */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2">
            <div className="flex space-x-2 space-x-reverse overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
              >
                همه فرصت‌ها ({opportunities.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('matches')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
                  activeTab === 'matches'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>فرصت‌های منطبق با پروفایل ({matches.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 cursor-pointer min-h-[44px]"
              title="به‌روزرسانی"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filters Bar */}
          <InvestmentFilters
            filters={filters}
            onChange={setFilters}
            onReset={() =>
              setFilters({
                searchQuery: '',
                province: '',
                stage: '',
                minCapacityKw: undefined
              })
            }
          />

          {/* Content States */}
          {loading ? (
            <div className="p-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-xs text-slate-500">در حال دریافت فرصت‌های سرمایه‌گذاری...</p>
            </div>
          ) : error ? (
            <InvestmentEmptyState
              type="ERROR"
              description={error}
              actionText="تلاش مجدد"
              onAction={fetchData}
            />
          ) : activeTab === 'matches' && matches.length === 0 ? (
            <InvestmentEmptyState
              type="NO_MATCHES"
              actionText="مشاهده تمام فرصت‌ها"
              onAction={() => setActiveTab('all')}
            />
          ) : filteredOpportunities.length === 0 ? (
            <InvestmentEmptyState
              type="NO_OPPORTUNITIES"
              actionText="بازنشانی فیلترها"
              onAction={() =>
                setFilters({
                  searchQuery: '',
                  province: '',
                  stage: '',
                  minCapacityKw: undefined
                })
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredOpportunities.map((opp) => {
                const match = matches.find((m) => m.opportunityId === opp.id);
                return (
                  <InvestmentOpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    matchScore={match?.score}
                    onClickDetail={() => handleSelectOpportunity(opp.id)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
