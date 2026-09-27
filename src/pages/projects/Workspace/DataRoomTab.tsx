import React from 'react';
import { Lock, FileText, UploadCloud, Folder, Search } from 'lucide-react';

export const DataRoomTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const folders = [
    { name: 'مدارک مهندسی', count: 4, type: 'engineering' },
    { name: 'اسناد قرارداد (EPC)', count: 2, type: 'contract' },
    { name: 'مستندات مالی', count: 1, type: 'financial' },
    { name: 'تأییدیه‌های شبکه‌ای', count: 3, type: 'permits' },
    { name: 'مدارک تحویل کالا (Delivery)', count: 0, type: 'procurement' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">اتاق داده (Data Room)</h2>
          <p className="text-sm text-gray-500">فضای امن و دسته‌بندی شده برای مستندات پروژه با کنترل دسترسی</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors">
          <UploadCloud size={18} />
          آپلود سند جدید
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 space-y-2">
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="جستجوی سند..." className="w-full pl-3 pr-10 py-2 bg-white border border-gray-200 rounded-xl text-sm" />
          </div>
          {folders.map(f => (
            <button key={f.type} className="w-full text-right flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 transition-colors text-gray-700">
              <span className="flex items-center gap-2 font-bold text-sm">
                <Folder size={18} className="text-amber-400" />
                {f.name}
              </span>
              <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{f.count}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Lock size={18} className="text-gray-400" />
            سطح دسترسی: محرمانه (PROJECT_MEMBERS)
          </h3>
          <div className="space-y-3">
            {[
              { title: 'نقشه‌های As-Built اولیه', date: '۱۴۰۲/۰۷/۱۲', by: 'شرکت مهندسی آلفا', status: 'APPROVED' },
              { title: 'گزارش امکان‌سنجی فاز ۱', date: '۱۴۰۲/۰۶/۲۵', by: 'هوشیار انرژی', status: 'SUPERSEDED' }
            ].map((doc, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">{doc.title}</h4>
                    <div className="text-xs text-gray-500 mt-1">بارگذاری شده توسط: {doc.by} • {doc.date}</div>
                  </div>
                </div>
                <div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                    doc.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
