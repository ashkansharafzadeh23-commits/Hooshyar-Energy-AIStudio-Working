import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Store, Package, CreditCard, LogOut, ExternalLink } from 'lucide-react';

export default function PortalLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/vendor-portal/login');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#12151B] text-white flex flex-col shrink-0 md:h-screen md:sticky md:top-0 shadow-2xl z-20">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF9E2C] rounded-lg flex items-center justify-center text-white font-black text-xl">
              EP
            </div>
            <div>
              <h2 className="font-bold text-sm">پرتال همکاران</h2>
              <p className="text-[10px] text-gray-400">نیرو گستران پارس</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavLink 
            to="/vendor-portal/dashboard"
            end
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-[#FF9E2C]' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutDashboard size={18} />
            داشبورد
          </NavLink>
          <NavLink 
            to="/vendor-portal/dashboard/profile"
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-[#FF9E2C]' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
          >
            <Store size={18} />
            پروفایل شرکت
          </NavLink>
          <NavLink 
            to="/vendor-portal/dashboard/products"
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-[#FF9E2C]' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
          >
            <Package size={18} />
            مدیریت محصولات
          </NavLink>
          <NavLink 
            to="/vendor-portal/dashboard/subscription"
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-[#FF9E2C]' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
          >
            <CreditCard size={18} />
            اشتراک و مالی
          </NavLink>
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <a 
            href="/vendor/vendor_001" 
            target="_blank"
            className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            مشاهده فروشگاه
            <ExternalLink size={16} className="opacity-50" />
          </a>
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#D64545] hover:bg-[#D64545]/10 transition-colors"
          >
            <LogOut size={18} />
            خروج از حساب
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-8 h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
