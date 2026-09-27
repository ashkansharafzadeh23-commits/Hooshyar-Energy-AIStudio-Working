import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvestmentOpportunity, ProjectReadinessScore } from '../../types/investment';
import { Loader2 } from 'lucide-react';
import { InvestmentOpportunityDetail } from '../../components/investment/InvestmentOpportunityDetail';

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [opp, setOpp] = useState<InvestmentOpportunity | null>(null);
  const [readiness, setReadiness] = useState<ProjectReadinessScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInterested, setIsInterested] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [oppRes, readRes] = await Promise.all([
        fetch(`/api/investment/opportunities/${id}`),
        fetch(`/api/investment/opportunities/${id}/readiness`)
      ]);
      if (oppRes.ok) setOpp(await oppRes.json());
      if (readRes.ok) setReadiness(await readRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclareInterest = async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/investment/opportunities/${id}/interest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      setIsInterested(true);
    } catch (e) {
      console.error(e);
      setIsInterested(true);
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center font-Vazirmatn">
        <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
        <p className="text-xs text-slate-500">در حال دریافت مشخصات فرصت سرمایه‌گذاری...</p>
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="p-12 text-center font-Vazirmatn">
        <h3 className="text-base font-bold text-slate-800">فرصت سرمایه‌گذاری یافت نشد.</h3>
        <button
          onClick={() => navigate('/investment-hub')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          بازگشت به مرکز فرصت‌ها
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-Vazirmatn">
      <InvestmentOpportunityDetail
        opportunity={opp}
        readiness={readiness}
        onBack={() => navigate('/investment-hub')}
        onDeclareInterest={handleDeclareInterest}
        isInterested={isInterested}
      />
    </div>
  );
}
