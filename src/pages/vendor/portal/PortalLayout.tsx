import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Store, Package, CreditCard, LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface PortalLayoutProps {
  previewMode?: boolean;
  vendorName?: string;
}

export default function PortalLayout({ previewMode = false, vendorName = 'نیرو گستران پارس' }: PortalLayoutProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    if (previewMode) return;
    logout();
    navigate('/vendor-auth');
  };

  const navItems = [
    { to: '/vendor-portal/dashboard', label: 'داشبورد تأمین', icon: LayoutDashboard, end: true },
    { to: '/vendor-portal/dashboard/profile', label: 'پروفایل شرکت', icon: Store, end: false },
    { to: '/vendor-portal/dashboard/products', label: 'مدیریت محصولات', icon: Package, end: false },
    { to: '/vendor-portal/dashboard/subscription', label: 'اشتراک و مالی', icon: CreditCard, end: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col md:flex-row text-slate-800 dark:text-slate-100" dir="rtl">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#0284C7] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-xs">
            EP
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-white">{vendorName}</h2>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Store size={12} />
              <span>پروفایل کسب‌وکار</span>
            </div>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleLogout}
          className="p-2 text-red-400 hover:bg-slate-800 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          title="خروج از حساب"
          aria-label="خروج از حساب"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Mobile Navigation Sub-Tabs Bar (No Clipping at 320px/360px/375px/390px/430px) */}
      <nav aria-label="منوی موبایل پرتال تامین" className="md:hidden bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar sticky top-[57px] z-20 shadow-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] shrink-0 transition-colors ${
                isActive 
                  ? 'bg-[#0284C7] text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Desktop Sidebar (Hooshyar Energy V2 Deep Energy Blue & Slate Palette) */}
      <aside aria-label="منوی اصلی پرتال تامین" className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0 md:h-screen md:sticky md:top-0 shadow-xl z-20 hidden md:flex border-l border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0284C7] rounded-xl flex items-center justify-center text-white font-black text-lg shadow-xs">
              EP
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">پرتال تأمین‌کنندگان</h2>
              <p className="text-[11px] text-slate-400">{vendorName}</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink 
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-colors min-h-[44px] ${
                  isActive 
                    ? 'bg-[#0284C7] text-white shadow-xs' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <a 
            href="/vendor/vendor_001" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors min-h-[44px]"
          >
            <span>مشاهده فروشگاه عمومی</span>
            <ExternalLink size={16} className="opacity-60" />
          </a>
          <button 
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors min-h-[44px] cursor-pointer"
          >
            <LogOut size={18} />
            <span>خروج از حساب</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
