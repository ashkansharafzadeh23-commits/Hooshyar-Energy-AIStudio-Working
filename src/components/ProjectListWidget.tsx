import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { EnergyProject } from '../types/project';

export default function ProjectListWidget() {
  const [projects, setProjects] = useState<EnergyProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/projects', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) return <div className="p-4 text-center">در حال بارگذاری...</div>;

  if (projects.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
        <p className="text-gray-500 mb-4">شما هنوز هیچ پروژه‌ای ندارید.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map(p => (
        <div key={p.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h4 className="font-bold text-lg text-gray-800">{p.title}</h4>
              <ProjectStatusBadge status={p.status} />
            </div>
            <p className="text-sm text-gray-500 mb-2">
              کد پروژه: <span className="font-mono bg-gray-100 px-1 rounded">{p.projectCode}</span> • 
              مکان: {p.location.city} • 
              ظرفیت: {p.targetCapacityKw} kW
            </p>
            <p className="text-xs text-gray-400">آخرین بروزرسانی: {new Date(p.updatedAt).toLocaleDateString('fa-IR')}</p>
          </div>
          <Link to={`/projects/${p.id}`} className="w-full md:w-auto text-center bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 px-6 py-2.5 rounded-xl font-bold transition-colors">
            مشاهده پروژه
          </Link>
        </div>
      ))}
    </div>
  );
}
