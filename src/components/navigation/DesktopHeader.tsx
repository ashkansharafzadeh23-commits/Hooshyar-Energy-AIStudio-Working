import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Layers, 
  Zap, 
  Store, 
  Briefcase, 
  User, 
  LogOut, 
  ChevronDown, 
  Building2, 
  Check, 
  ShieldCheck,
  Plus
} from 'lucide-react';
import { NotificationCenter } from '../NotificationCenter';
import { ThemeToggle } from '../ThemeToggle';
import { useAuth } from '../../context/AuthContext';

export const DesktopHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    user, 
    activeRole, 
    availableRoles, 
    switchRole, 
    organizations, 
    activeOrganization, 
    switchOrganization, 
    canAccessPortfolio, 
    logout,
    getRolePersianLabel,
    isAuthenticated
  } = useAuth();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  // Determine active section
  const isNavActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/user-dashboard';
    }
    if (path === '/projects') {
      return location.pathname === '/projects' || 
             location.pathname.startsWith('/projects/') || 
             location.pathname === '/powerplant-setup';
    }
    if (path === '/solar-assets') {
      return location.pathname === '/solar-assets' || 
             location.pathname.startsWith('/solar-assets/') || 
             location.pathname.startsWith('/admin/solar-assets');
    }
    if (path === '/contractors') {
      return location.pathname === '/contractors' || 
             location.pathname === '/vendors' || 
             location.pathname === '/marketplace' || 
             location.pathname.startsWith('/vendor/') ||
             location.pathname.startsWith('/investment-hub') ||
             location.pathname === '/contractor-dashboard' ||
             location.pathname === '/technicians-list';
    }
    if (path === '/portfolio') {
      return location.pathname === '/portfolio' || location.pathname === '/enterprise/portfolio';
    }
    return false;
  };

  const navItems = [
    { label: 'پیشخوان', path: '/dashboard', icon: LayoutDashboard },
    { label: 'پروژه‌ها', path: '/projects', icon: Layers },
    { label: 'دارایی‌ها', path: '/solar-assets', icon: Zap },
    { label: 'بازارگاه', path: '/contractors', icon: Store },
    ...(canAccessPortfolio ? [{ label: 'پورتفو', path: '/portfolio', icon: Briefcase }] : [])
  ];

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* RIGHT SIDE in RTL: Brand Logo + Primary Navigation */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link 
            to="/" 
            className="flex items-center gap-3 group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800 group-hover:scale-105 transition-transform bg-amber-500/10 flex items-center justify-center">
              <img 
                src="/src/assets/images/solar_app_logo_1786611269806.jpg" 
                alt="هوشیار انرژی" 
                className="w-full h-full object-cover scale-125"
                onError={(e) => {
                  // Fallback icon if image fails to load
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                هوشیار انرژی
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline-block">
                زیرساخت دیجیتال پروژه‌های خورشیدی
              </span>
            </div>
          </Link>

          {/* Primary Navigation for Desktop (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const active = isNavActive(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-800/80 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-amber-600 dark:text-amber-400' : 'opacity-70'} />
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute -bottom-[13px] inset-x-3 h-0.5 bg-amber-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* LEFT SIDE in RTL: Actions, Notifications, Role, and User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Quick Create CTA (Desktop) */}
          <Link
            to="/powerplant-setup"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 transition-colors shadow-xs"
          >
            <Plus size={14} />
            <span>پروژه جدید</span>
          </Link>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notification Center */}
          <NotificationCenter />

          {/* User Profile & Role Switcher */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all focus:outline-none"
              aria-expanded={isProfileOpen}
              aria-label="منوی کاربری و تغییر نقش"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0">
                {user?.name ? user.name.slice(0, 1) : <User size={16} />}
              </div>

              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {user?.name || (user?.phone ? user.phone : 'کاربر گرامی')}
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  {getRolePersianLabel(activeRole)}
                </span>
              </div>

              <ChevronDown size={14} className="text-slate-400 transition-transform duration-200 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">حساب کاربری</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {user?.name || 'کاربر هوشیار انرژی'}
                  </p>
                  {user?.phone && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {user.phone}
                    </p>
                  )}
                  {activeOrganization && (
                    <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                      <Building2 size={12} className="text-amber-500 shrink-0" />
                      <span className="truncate">{activeOrganization.name}</span>
                    </div>
                  )}
                </div>

                {/* Role Switcher Section */}
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-2 mb-1.5">
                    کانتکست کاری فعال:
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {availableRoles.map((role) => {
                      const isCurrent = activeRole.toUpperCase() === role.toUpperCase();
                      return (
                        <button
                          key={role}
                          onClick={() => {
                            switchRole(role);
                            setIsProfileOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isCurrent
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck size={13} className={isCurrent ? 'text-amber-600' : 'opacity-40'} />
                            {getRolePersianLabel(role)}
                          </span>
                          {isCurrent && <Check size={14} className="text-amber-600 dark:text-amber-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Organization Switcher (if user has multiple) */}
                {organizations.length > 1 && (
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-2 mb-1.5">
                      تغییر سازمان:
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {organizations.map((org) => {
                        const isCurrentOrg = activeOrganization?.id === org.id;
                        return (
                          <button
                            key={org.id}
                            onClick={() => {
                              switchOrganization(org.id);
                              setIsProfileOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isCurrentOrg
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="truncate">{org.name}</span>
                            {isCurrentOrg && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Navigation Links */}
                <div className="px-2 py-1.5 space-y-0.5 border-b border-slate-100 dark:border-slate-800">
                  <Link
                    to="/dashboard"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <LayoutDashboard size={14} />
                    <span>پیشخوان کاربری من</span>
                  </Link>
                  <Link
                    to="/target-select"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Zap size={14} />
                    <span>شروع محاسبه و تحلیل خورشیدی</span>
                  </Link>
                </div>

                {/* Logout Button */}
                <div className="p-1.5">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>{isAuthenticated ? 'خروج از حساب کاربری' : 'ورود به سامانه'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
