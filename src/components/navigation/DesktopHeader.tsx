import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Plus,
  Wrench,
  Box,
  Megaphone,
  Calculator,
  Compass,
  ArrowLeft,
  Menu,
  X,
  Newspaper
} from 'lucide-react';
import { NotificationCenter } from '../NotificationCenter';
import { ThemeToggle } from '../ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import logoImage from '../../assets/images/solar_app_logo_1786611269806.jpg';

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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMoreNavOpen, setIsMoreNavOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMobileNavOpen(false);
    setIsMoreNavOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  const role = (activeRole || user?.role || 'PROJECT_OWNER').toUpperCase();
  const isContractor = ['EPC', 'EPC_CONTRACTOR', 'CONTRACTOR'].includes(role);
  const isVendor = ['VENDOR', 'SUPPLIER'].includes(role);
  const isTechnician = ['TECHNICIAN'].includes(role);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);

  const canCreateAds = ['VENDOR', 'CONTRACTOR', 'EPC', 'TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'].includes(role);

  // Close profile dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileOpen]);

  // Close 'More sections' dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setIsMoreNavOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMoreNavOpen(false);
      }
    };
    if (isMoreNavOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoreNavOpen]);

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
             location.pathname === '/marketplace' ||
             location.pathname.startsWith('/vendor/') ||
             location.pathname.startsWith('/investment-hub');
    }
    if (path === '/contractor-dashboard') {
      return location.pathname === '/contractor-dashboard';
    }
    if (path === '/vendor-portal') {
      return location.pathname.startsWith('/vendor-portal');
    }
    if (path === '/technician-dashboard') {
      return location.pathname === '/technician-dashboard';
    }
    if (path === '/portfolio') {
      return location.pathname === '/portfolio' || location.pathname === '/enterprise/portfolio';
    }
    if (path === '/smart-maintenance') {
      return location.pathname === '/smart-maintenance' || location.pathname === '/maintenance';
    }
    if (path === '/target-select') {
      return location.pathname === '/target-select' || location.pathname === '/solar-analysis';
    }
    if (path === '/partners') {
      return location.pathname === '/partners';
    }
    if (path === '/energy-center') {
      return location.pathname === '/energy-center' || location.pathname.startsWith('/energy-center/');
    }
    if (path === '/ads/portal') {
      return location.pathname === '/ads/portal' || location.pathname === '/ads-portal';
    }
    if (path === '/solar-planner') {
      return location.pathname === '/solar-planner';
    }
    return false;
  };

  // Role-Scoped Nav Items
  const navItems = useMemo(() => {
    if (!isAuthenticated) {
      // Clean Public Information Architecture
      return [
        { label: 'امکان‌سنجی و طراحی', path: '/target-select', icon: Calculator },
        { label: 'شبکه متخصصان و تأمین', path: '/contractors', icon: Store },
        { label: 'تبلیغات و معرفی برند', path: '/ads/portal', icon: Megaphone },
        { label: 'تعمیرات هوشمند', path: '/smart-maintenance', icon: Wrench },
        { label: 'راهکارها و همکاران', path: '/partners', icon: Compass }
      ];
    }

    if (isContractor) {
      return [
        { label: 'پیشخوان پیمانکار', path: '/contractor-dashboard', icon: LayoutDashboard },
        { label: 'استعلام‌های قیمت (RFQ)', path: '/contractors', icon: Store },
        { label: 'پیشنهادات من', path: '/contractor-dashboard', icon: Layers },
        { label: 'تعمیرات و نگهداری', path: '/smart-maintenance', icon: Wrench }
      ];
    }

    if (isVendor) {
      return [
        { label: 'پرتال تأمین‌کنندگان', path: '/vendor-portal', icon: LayoutDashboard },
        { label: 'استعلام‌های تجاری', path: '/contractors', icon: Store },
        { label: 'پرتال تبلیغات', path: '/ads/portal', icon: Megaphone }
      ];
    }

    if (isTechnician) {
      return [
        { label: 'کارتابل کارشناسی', path: '/technician-dashboard', icon: LayoutDashboard },
        { label: 'تعمیرات هوشمند', path: '/smart-maintenance', icon: Wrench },
        { label: 'شبکه متخصصان', path: '/technicians', icon: ShieldCheck }
      ];
    }

    if (isAdmin) {
      return [
        { label: 'پیشخوان کلان', path: '/dashboard', icon: LayoutDashboard },
        { label: 'بررسی پرونده‌ها', path: '/admin/solar-assets', icon: ShieldCheck },
        { label: 'تأیید آگهی‌ها', path: '/admin/ads', icon: Megaphone },
        { label: 'پورتفوی سازمانی', path: '/enterprise/portfolio', icon: Briefcase }
      ];
    }

    // Default: Authenticated Customer / Project Owner
    return [
      { label: 'پیشخوان', path: '/dashboard', icon: LayoutDashboard },
      { label: 'پروژه‌ها', path: '/projects', icon: Layers },
      { label: 'دارایی‌ها', path: '/solar-assets', icon: Zap },
      { label: 'تعمیرات هوشمند', path: '/smart-maintenance', icon: Wrench },
      { label: 'بازارگاه', path: '/contractors', icon: Store },
      ...(canAccessPortfolio ? [{ label: 'پورتفو', path: '/portfolio', icon: Briefcase }] : [])
    ];
  }, [isAuthenticated, isContractor, isVendor, isTechnician, isAdmin, canAccessPortfolio]);

  // Persian descriptions for dropdown items
  const itemDescriptions: Record<string, string> = {
    '/dashboard': 'پیشخوان مدیریت و وضعیت کلان پروژه‌ها',
    '/projects': 'پرونده‌های مهندسی و اسناد فنی',
    '/solar-assets': 'پایش و مدیریت تجهیزات خورشیدی فعال',
    '/smart-maintenance': 'ثبت خرابی و اعزام تکنسین O&M',
    '/contractors': 'شبکه پیمانکاران EPC و استعلام قیمت رقابتی',
    '/portfolio': 'مدیریت چندپروژه‌ای و سبد دارایی‌ها',
    '/ads/portal': 'معرفی خدمات و جایگاه‌های تبلیغاتی تخصصی',
    '/partners': 'همکاران تجاری و راهکارهای سازمانی',
    '/solar-planner': 'مدل‌سازی و چیدمان سه‌بعدی نیروگاه',
    '/target-select': 'تحلیل مقدماتی فنی و اقتصادی نیروگاه',
    '/admin/solar-assets': 'بررسی و تأیید پرونده‌های نیروگاهی',
    '/admin/ads': 'مدیریت و تأیید جایگاه‌های آگهی',
    '/enterprise/portfolio': 'داشبورد جامع پرتفوی سازمانی',
    '/vendor-portal': 'مدیریت تجهیزات، انبار و استعلام‌ها',
    '/contractor-dashboard': 'کارتابل مناقصات و قراردادهای اجرایی',
    '/technician-dashboard': 'کارتابل درخواست‌های تعمیر و بازدید فنی',
    '/technicians': 'بانک متخصصان مجاز نصب و عیب‌یابی',
    '/energy-center': 'مرکز اطلاعات، مصوبات و بازار برق'
  };

  // Modern simplified horizontal architecture:
  // Primary visible links (first 2-3 links depending on role)
  // Secondary items cleanly grouped in accessible 'سایر بخش‌ها' dropdown
  const primaryVisibleCount = isAuthenticated ? 2 : 2;
  const primaryNavItems = useMemo(() => navItems.slice(0, primaryVisibleCount), [navItems, primaryVisibleCount]);
  const dropdownNavItems = useMemo(() => {
    const rawDropdown = navItems.slice(primaryVisibleCount);
    // Add Solar Planner to dropdown if not in primary and not on /solar-planner
    const hasPlanner = navItems.some(i => i.path === '/solar-planner');
    if (!hasPlanner) {
      return [
        ...rawDropdown,
        { label: 'طراحی سه‌بعدی نیروگاه', path: '/solar-planner', icon: Box }
      ];
    }
    return rawDropdown;
  }, [navItems, primaryVisibleCount]);

  const isMoreNavActive = useMemo(() => {
    return dropdownNavItems.some(item => isNavActive(item.path));
  }, [dropdownNavItems, location.pathname]);

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/92 dark:bg-slate-950/92 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/80 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* RIGHT SIDE in RTL: Brand Logo + Primary Navigation */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link
            to="/"
            className="flex items-center gap-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] rounded-xl group min-h-[44px] shrink-0"
            aria-label="صفحه اصلی هوشیار انرژی"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-slate-200/90 dark:border-slate-800 bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-[#0284C7]/50 transition-all">
              <img
                src={logoImage}
                alt="لوگوی هوشیار انرژی"
                className="w-full h-full object-cover scale-125"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                هوشیار انرژی
                <span className="w-2 h-2 rounded-full bg-[#0284C7] inline-block ring-4 ring-[#0284C7]/15" />
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wide hidden sm:inline-block">
                پلتفرم مهندسی و مدل‌سازی نیروگاه‌های خورشیدی
              </span>
            </div>
          </Link>

          {/* Primary Clean Navigation System for Desktop (matching Landing.tsx) */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {primaryNavItems.map((item) => {
              const active = isNavActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-3.5 py-2 min-h-[40px] inline-flex items-center rounded-xl transition-all ${
                    active
                      ? 'text-slate-950 dark:text-white bg-slate-100/90 dark:bg-slate-800/90 shadow-2xs font-bold'
                      : 'hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute -bottom-1 inset-x-3 h-0.5 bg-[#0284C7] rounded-full" />
                  )}
                </Link>
              );
            })}

            {/* Contextual 3D Planner Workspace Tag when currently viewing CAD workspace */}
            {location.pathname === '/solar-planner' && (
              <span className="px-3 py-1.5 min-h-[36px] inline-flex items-center gap-1.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-[#0284C7] dark:text-sky-300 border border-sky-200/60 dark:border-sky-900/60 shadow-2xs">
                <Box size={14} className="text-[#0284C7]" />
                <span>طراحی سه‌بعدی</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              </span>
            )}

            {/* Accessible "سایر بخش‌ها" Dropdown matching Landing.tsx design */}
            {dropdownNavItems.length > 0 && (
              <div className="relative" ref={moreDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreNavOpen(!isMoreNavOpen)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsMoreNavOpen(true);
                    }
                  }}
                  className={`px-3.5 py-2 min-h-[40px] inline-flex items-center gap-1.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                    isMoreNavOpen || isMoreNavActive
                      ? 'text-[#0284C7] bg-slate-100 dark:bg-slate-800 font-bold'
                      : 'hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                  }`}
                  aria-expanded={isMoreNavOpen}
                  aria-haspopup="true"
                  aria-label="سایر بخش‌های سامانه"
                >
                  <span>سایر بخش‌ها</span>
                  <ChevronDown size={15} className={`transition-transform duration-200 ${isMoreNavOpen ? 'rotate-180 text-[#0284C7]' : 'text-slate-400'}`} />
                  {isMoreNavActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] inline-block" />
                  )}
                </button>

                {isMoreNavOpen && (
                  <div
                    role="menu"
                    aria-orientation="vertical"
                    className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl p-2.5 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    {dropdownNavItems.map((item) => {
                      const active = isNavActive(item.path);
                      const Icon = item.icon;
                      const description = itemDescriptions[item.path];
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          role="menuitem"
                          onClick={() => setIsMoreNavOpen(false)}
                          className={`flex items-center gap-3 p-2.5 min-h-[44px] rounded-xl text-xs font-semibold transition-colors group ${
                            active
                              ? 'bg-sky-50 dark:bg-sky-950/50 text-[#0284C7] dark:text-sky-300'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                            active
                              ? 'bg-[#0284C7] text-white'
                              : 'bg-sky-50 dark:bg-sky-950/60 text-[#0284C7] dark:text-sky-400'
                          }`}>
                            <Icon size={16} />
                          </div>
                          <div className="flex flex-col flex-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                              {item.label}
                              {active && <Check size={14} className="text-[#0284C7] dark:text-sky-400" />}
                            </span>
                            {description && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{description}</span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* LEFT SIDE in RTL: Actions, Theme, and Profile */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* UNCONNECTED / PUBLIC VISITORS */}
          {!isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <Link
                to="/customer-login"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <User size={15} />
                <span>ورود به سامانه</span>
              </Link>
              <Link
                to="/target-select"
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-colors shadow-xs"
              >
                <Calculator size={15} />
                <span>شروع تحلیل</span>
              </Link>
              {/* Mobile Menu Button for Unauthenticated Public */}
              <button
                onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden focus:outline-none cursor-pointer"
                aria-label="منوی ناوبری"
              >
                {isMobileNavOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          ) : (
            /* AUTHENTICATED USERS */
            <>
              {/* Quick Create CTA (Desktop - Customer / Admin) */}
              {!isContractor && !isVendor && !isTechnician && (
                <Link
                  to="/powerplant-setup"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-colors shadow-xs"
                >
                  <Plus size={14} />
                  <span>پروژه جدید</span>
                </Link>
              )}

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

              {/* Notification Center */}
              <NotificationCenter />

              {/* User Profile & Role Switcher */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all focus:outline-none cursor-pointer"
                  aria-expanded={isProfileOpen}
                  aria-label="منوی کاربری و تغییر نقش"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-[#0284C7] dark:text-blue-400 font-bold text-xs shrink-0">
                    {user?.name ? user.name.slice(0, 1) : <User size={16} />}
                  </div>

                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {user?.name || (user?.phone ? user.phone : 'کاربر گرامی')}
                    </span>
                    <span className="text-[10px] text-[#0284C7] dark:text-blue-400 font-medium">
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
                          <Building2 size={12} className="text-[#0284C7] shrink-0" />
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
                        {availableRoles.map((r) => {
                          const isCurrent = activeRole.toUpperCase() === r.toUpperCase();
                          return (
                            <button
                              key={r}
                              onClick={() => {
                                switchRole(r);
                                setIsProfileOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                isCurrent
                                  ? 'bg-blue-50 dark:bg-blue-950/40 text-[#0284C7] dark:text-blue-300 font-bold'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck size={13} className={isCurrent ? 'text-[#0284C7]' : 'opacity-40'} />
                                {getRolePersianLabel(r)}
                              </span>
                              {isCurrent && <Check size={14} className="text-[#0284C7] dark:text-blue-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Organization Switcher */}
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
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
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
                      <Link
                        to="/smart-maintenance"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                      >
                        <Wrench size={14} />
                        <span>تعمیرات و نگهداری هوشمند</span>
                      </Link>
                      <Link
                        to="/solar-planner"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                      >
                        <Box size={14} />
                        <span>طراحی سه‌بعدی پنل خورشیدی</span>
                      </Link>
                      {canAccessPortfolio && (
                        <Link
                          to="/portfolio"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Briefcase size={14} />
                          <span>داشبورد پرتفوی سازمانی</span>
                        </Link>
                      )}
                      {canCreateAds && (
                        <Link
                          to="/ads/portal"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50/70 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                        >
                          <Megaphone size={14} className="text-purple-600 dark:text-purple-400" />
                          <span>پرتال تبلیغات تجاری و سفارش پلن</span>
                        </Link>
                      )}
                      {isAdmin && (
                        <>
                          <Link
                            to="/admin/solar-assets"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          >
                            <ShieldCheck size={14} className="text-[#0284C7] dark:text-blue-400" />
                            <span>تأیید و بررسی پرونده‌ها (مدیریت)</span>
                          </Link>
                          <Link
                            to="/admin/ads"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          >
                            <Megaphone size={14} className="text-[#0284C7] dark:text-blue-400" />
                            <span>مدیریت و تأیید آگهی‌ها</span>
                          </Link>
                        </>
                      )}
                    </div>

                    {/* Logout Button */}
                    <div className="p-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      >
                        <LogOut size={14} />
                        <span>خروج از حساب کاربری</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        </div>

      </div>

      {/* Mobile Navigation Drawer for Unauthenticated Visitors */}
      {isMobileNavOpen && !isAuthenticated && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileNavOpen(false)}
                className="flex items-center justify-between p-3 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm font-semibold transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className="text-slate-500 dark:text-slate-400" />
                  <span>{item.label}</span>
                </div>
                <ArrowLeft size={16} className="text-slate-400" />
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
