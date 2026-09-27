# HOOSHYAR ENERGY — UI-10 ROUTE AUDIT & UX ARCHITECTURE INVENTORY

**نسخه:** UI-10 Final Product Consistency & Production Experience Gate  
**تاریخ ارزیابی:** سپتامبر ۲۰۲۶  
**سامانه:** هوشیار انرژی — زیرساخت دیجیتال چرخه عمر جامع پروژه‌ها و دارایی‌های انرژی خورشیدی  

---

## ۱. دسته‌بندی و فهرست جامع مسیرها (Complete Route Inventory)

تمامی مسیرهای ثبت‌شده در مسیریاب اصلی سامانه (`src/App.tsx`) بر اساس راهبرد طبقه‌بندی UI-10 تفکیک و اعتبارسنجی شدند:

### راهنمای طبقه‌بندی:
- **A. Production Primary:** مسیرهای اصلی محصول در چرخه عمر خورشیدی (تحلیل، پروژه، قرارداد، مناقصه، تأمین مالی، دارایی، پایش).
- **B. Production Secondary:** صفحات تکمیلی، ثبت‌نام و فرم‌های جانبی نقش‌های تخصصی.
- **C. Legacy Compatibility:** مسیرهای قدیمی جهت حفظ سازگاری پیوندهای خارجی بدون تداخل با فرآیند اصلی.
- **D. Redirect / Alias:** مسیرهای مترادف یا میان‌بر استاندارد جهت دسترسی آسان‌تر.
- **E. Internal / Admin:** پنل‌های نظارت، مدیریت و بازبینی نقش‌های ارشد سامانه.
- **F. Dead / Unused Candidate:** مسیرهای بلااستفاده (در حال حاضر ۰ مورد).

---

## ۲. جدول ممیزی مسیرها (Route Audit Matrix)

| مسیر (Path) | مؤلفه اجرایی (Component) | دسته‌بندی | پوسته و زمینه کاری (Shell & Context) | نقش‌های مجاز | وضعیت‌های Loading/Empty/Error |
|---|---|:---:|---|---|:---:|
| `/` | `Landing.tsx` | A | مستقل (Standalone Landing) | عمومی | بله |
| `/customer-login` | `CustomerLogin.tsx` | A | `MainLayout` | کارفرما / سرمایه‌گذار | بله |
| `/dashboard` | `UserDashboard.tsx` | A | `MainLayout` + Header + Breadcrumb | کارفرما / سرمایه‌گذار / مهندس | کامل |
| `/user-dashboard` | `UserDashboard.tsx` | D | `MainLayout` (هدایت به داشبورد) | کارفرما / سرمایه‌گذار / مهندس | کامل |
| `/projects` | `UserDashboard.tsx` (تب پروژه‌ها) | A | `MainLayout` + فیلتر وضعیت | کلیه نقش‌ها | کامل |
| `/projects/:id` | `ProjectDetail.tsx` | A | `MainLayout` + `ProjectHeader` + `ProjectAssetBridge` | مالک، مدیر، سرمایه‌گذار، پیمانکار | کامل با مدیریت عدم دسترسی |
| `/projects/:id/proposal` | `ProjectProposal.tsx` | B | `MainLayout` + برگه پیشنهاد پروژه | مالک، سرمایه‌گذار | کامل |
| `/solar-analysis` | `SolarAnalysisExperience.tsx` | A | `MainLayout` + موتور تحلیلی و داده‌های ناسا | عمومی / کارفرما | کامل با تفکیک داده زنده و مرجع |
| `/target-select` | `SolarAnalysisExperience.tsx` | D | `MainLayout` (نام مستعار تحلیل تابش) | عمومی / کارفرما | کامل |
| `/investment-hub` | `InvestmentHub.tsx` | A | `MainLayout` + هاب سرمایه‌گذاری | سرمایه‌گذار، مالک پروژه | کامل |
| `/investment-hub/opportunities` | `OpportunitiesList.tsx` | A | `MainLayout` + کارت‌های فیلترپذیر | سرمایه‌گذار، مؤسسات مالی | کامل |
| `/investment-hub/opportunities/:id` | `OpportunityDetail.tsx` | A | `MainLayout` + ارزیابی موشکافانه | سرمایه‌گذار، مؤسسات مالی | کامل |
| `/investment-hub/investor-profile` | `InvestorProfileSetup.tsx` | B | `MainLayout` + فرم تنظیم ترجیحات | سرمایه‌گذار | کامل |
| `/investment-hub/matches` | `MyMatches.tsx` | B | `MainLayout` + تطبیق هوشمند فرصت‌ها | سرمایه‌گذار | کامل |
| `/portfolio` | `PortfolioDashboard.tsx` | A | `MainLayout` + کارت‌های فشرده موبایل | نقش‌های سازمانی / پایش کلان | کامل |
| `/enterprise/portfolio` | `PortfolioDashboard.tsx` | D | `MainLayout` (نام مستعار پرتفوی) | نقش‌های سازمانی | کامل |
| `/solar-assets` | `AssetList.tsx` | A | `MainLayout` + هدر دارایی‌های عملیاتی | کلیه نقش‌ها | کامل با وضعیت خالی مستند |
| `/assets` | `AssetList.tsx` | D | `MainLayout` (نام مستعار دارایی‌ها) | کلیه نقش‌ها | کامل |
| `/solar-assets/:id` | `AssetDetail.tsx` | A | `MainLayout` + `AssetOperationsWorkspace` + `AssetPassport` | مالک، ناظر، تکنسین، مدیر | کامل با پل بازگشت به پروژه مادر |
| `/assets/:id` | `SolarAssetDetail.tsx` | D | `MainLayout` (نام مستعار جزئیات دارایی) | مالک، ناظر، تکنسین، مدیر | کامل |
| `/solar-assets/my-projects` | `MyProjects.tsx` | B | `MainLayout` + فهرست پروژه‌های من | مالک، توسعه‌دهنده | کامل |
| `/powerplant-setup` | `PowerPlantSetup.tsx` | B | `MainLayout` + ویزارد راه‌اندازی نیروگاه | پیمانکار، مجری | کامل |
| `/solar-planner` | `SolarPlanner.tsx` | B | `MainLayout` + چیدمان سه‌بعدی پنل سقف | مهندس، طراح | کامل |
| `/contractors` | `ContractorsList.tsx` | A | `MainLayout` + رتبه‌بندی پیمانکاران EPC | عمومی / کارفرما | کامل |
| `/marketplace` | `ContractorsList.tsx` | D | `MainLayout` (نام مستعار بازارگاه) | عمومی / کارفرما | کامل |
| `/contractor-auth` | `ContractorAuth.tsx` | B | `MainLayout` + احراز هویت شرکت EPC | پیمانکار احداث | کامل |
| `/contractor-dashboard` | `ContractorDashboard.tsx` | A | `MainLayout` + کارتابل مناقصات و قراردادها | پیمانکار احداث (EPC) | کامل با محدودسازی IDOR |
| `/vendors` | `VendorsList.tsx` | A | `MainLayout` + تدارکات و تأمین‌کنندگان | کارفرما، پیمانکار، ناظر | کامل |
| `/sellers` | `SellersList.tsx` | C | `MainLayout` (سازگاری با نسخه قدیم) | عمومی | کامل |
| `/vendor/:id` | `VendorStorefront.tsx` | A | `MainLayout` + ویترین تجهیزات تأمین‌کننده | خریدار، کارفرما | کامل |
| `/vendor-portal/*` | `VendorPortal.tsx` | A | `MainLayout` + پورتال فروشنده و سفارشات | تأمین‌کننده تجهیزات | کامل |
| `/vendor-auth` | `VendorAuth.tsx` | B | `MainLayout` + ورود تأمین‌کننده | فروشندگان | کامل |
| `/smart-maintenance` | `SmartMaintenance.tsx` | A | `MainLayout` + مرکز عارضه‌یابی و پرونده‌ها | تکنسین، ناظر، مالک | کامل |
| `/technicians-list` | `TechniciansList.tsx` | B | `MainLayout` + فهرست کارشناسان فنی | کارفرما، مدیر فنی | کامل |
| `/technician-auth` | `TechnicianAuth.tsx` | B | `MainLayout` + احراز تکنسین | تکنسین و کارشناس فنی | کامل |
| `/technician-dashboard` | `TechnicianDashboard.tsx` | A | `MainLayout` + کارتابل پرونده‌های تخصیصی | تکنسین (محدود به پرونده‌های خود) | کامل با تفکیک امنیتی ۴۰۳ |
| `/ads-portal` | `AdsPortal.tsx` | B | `MainLayout` + جایگاه‌های صنعتی | تجاری | کامل |
| `/admin/solar-assets` | `AdminReview.tsx` | E | `MainLayout` + بازبینی ناظر سامانه | مدیر کل سامانه (Admin) | کامل با کنترل دسترسی |
| `/legacy-target-select` | `Home.tsx` | C | `MainLayout` (سازگاری فرم قدیمی) | عمومی | کامل |
| `/location-type` | `LocationTypePage.tsx` | C | `MainLayout` (سازگاری گام ۱ قدیم) | عمومی | کامل |
| `/area-city` | `AreaCityPage.tsx` | C | `MainLayout` (سازگاری گام ۲ قدیم) | عمومی | کامل |
| `/checklist` | `ChecklistPage.tsx` | C | `MainLayout` (سازگاری گام ۳ قدیم) | عمومی | کامل |
| `/consumption` | `ConsumptionPage.tsx` | C | `MainLayout` (سازگاری گام ۴ قدیم) | عمومی | کامل |
| `/recommendation` | `RecommendationPage.tsx` | C | `MainLayout` (سازگاری گام ۵ قدیم) | عمومی | کامل |
| `/result` | `ResultPage.tsx` | C | `MainLayout` (سازگاری نتایج قدیم) | عمومی | کامل با اصلاح فرمول تولید |

---

## ۳. ارزیابی هماهنگی پوسته، ناوبری و واکنش‌گرایی (UX Consistency Audit)

1. **نوار ناوبری دسکتاپ (`DesktopHeader.tsx`):**
   - ناوبری اصلی متمرکز بر ۵ بخش بنیادین: پیشخوان، پروژه‌ها، بازارگاه، دارایی‌ها، پایش و نگهداری.
   - وضعیت فعال هر بخش بر اساس مسیر جاری به صورت برجسته تفکیک می‌شود.
   - نشانگر نقش فعال با هماهنگی کامل سیستم احراز هویت.
2. **ناوبری پایین صفحه موبایل (`MobileBottomNav.tsx`):**
   - اهداف لمسی با حداقل اندازه ۴۴×۴۴ پیکسل.
   - دکمه اقدام سریع (+) در مرکز برای آغاز تحلیل جدید یا ثبت پروژه بدون مسدودسازی محتوا.
   - اعمال `pb-24` در صفحات تفصیلی پروژه‌ها و دارایی‌ها جهت جلوگیری از تداخل نوار ناوبری.
3. **پل ارتباطی پروژه و دارایی (`ProjectAssetBridge.tsx`):**
   - تفکیک قطعی ماهیت حقوقی/فنی پروژه (`EnergyProject`) از دارایی عملیاتی (`EnergyAsset`).
   - پروژه‌های پیش از راه‌اندازی هرگز دارای پایش جعلی یا سنسورهای فرضی نیستند.
4. **مسیرنمای فارسی (`AppContextBreadcrumb.tsx`):**
   - جهت فلش‌های تفکیک‌کننده مطابق استانداردهای راست‌به‌چپ (RTL).
   - برچسب‌های احتیاطی صادقانه نظیر «پروژه بدون عنوان» یا «دارایی بدون عنوان».
