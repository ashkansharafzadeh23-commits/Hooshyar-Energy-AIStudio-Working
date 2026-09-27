import React, { useState, useEffect, useMemo } from 'react';
import { InvestmentOpportunity } from '../../types/investment';
import { InvestmentOpportunityCard } from '../../components/investment/InvestmentOpportunityCard';
import { InvestmentFilters, InvestmentFilterState } from '../../components/investment/InvestmentFilters';
import { InvestmentEmptyState } from '../../components/investment/InvestmentEmptyState';
import { Loader2 } from 'lucide-react';

export default function OpportunitiesList() {
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<InvestmentFilterState>({
    searchQuery: '',
    province: '',
    stage: '',
    minCapacityKw: undefined
  });

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      const res = await fetch('/api/investment/opportunities');
      if (res.ok) {
        setOpportunities(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return opportunities.filter((opp) => {
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (!opp.title.toLowerCase().includes(q) && !opp.opportunityCode.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filters.province && opp.location.province !== filters.province) {
        return false;
      }
      if (filters.stage && opp.projectStage !== filters.stage) {
        return false;
      }
      if (filters.minCapacityKw && (opp.targetCapacityKw || 0) < filters.minCapacityKw) {
        return false;
      }
      return true;
    });
  }, [opportunities, filters]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-Vazirmatn">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 mb-2">
          فرصت‌های سرمایه‌گذاری و مشارکت خورشیدی
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
          مرور، غربالگری و بررسی مستندات طرح‌های نیازمند شریک سرمایه‌گذار
        </p>
      </div>

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

      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="animate-spin text-blue-600" size={36} />
        </div>
      ) : filtered.length === 0 ? (
        <InvestmentEmptyState
          type="NO_OPPORTUNITIES"
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
          {filtered.map((opp) => (
            <InvestmentOpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      )}
    </div>
  );
}
