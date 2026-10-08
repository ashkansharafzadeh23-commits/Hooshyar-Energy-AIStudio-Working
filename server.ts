import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.js";
import cookieParser from "cookie-parser";
import { getSecurityConfig } from "./src/security/config.js";
import { rateLimiters } from "./src/security/rateLimiter.js";
import { requestIdMiddleware } from "./src/middleware/requestId.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import authRouter, { verifyAuthToken } from "./src/api/auth.js";
import professionalsRouter from "./src/api/professionals.js";
import contractorsRouter from "./src/api/contractors.js";
import adsRouter from "./src/api/ads.js";
import userRouter from "./src/api/user.js";
import subscriptionRouter from "./src/api/subscription.js";
import assetsRouter from "./src/api/assets.js";
import projectsRouter from "./src/api/projects.js";
import investmentRouter from "./src/api/investment.js";
import executionRouter from "./src/api/execution.js";
import financeRouter from "./src/api/finance.js";
import procurementRouter from "./src/api/procurement.js";
import assetRouter from "./src/api/asset.js";
import financingRouter from "./src/api/financing.js";
import monitoringRouter from "./src/api/monitoring.js";
import { maintenanceRouter } from "./src/api/maintenance.js";
import rfqRouter from "./src/api/rfq.js";
import enterpriseRouter from "./src/api/enterprise.js";
import healthRouter from "./src/api/health.js";
import { energyCenterRouter } from "./src/api/energyCenter.js";
import partnersRouter, { signMediaItem, signMediaArray } from "./src/api/partners.js";
import { validateEnvironment, assertProductionReadiness } from "./src/config/environment.js";
import { closePostgresDB } from "./src/database/postgres/connection.js";

// Vercel handlers
import analyzeHandler from "./api/analyze.js";
import followupHandler from "./api/followup.js";
import vendorRegisterHandler from "./api/vendor/register.js";
import vendorProductsHandler from "./api/vendor/products.js";
import vendorIdHandler from "./api/vendors/[id].js";
import recommendHandler from "./api/energy/recommend.js";
import analyzeImagesHandler from "./api/energy/analyze-images.js";
import optimizeLayoutHandler from "./api/energy/optimize-layout.js";

const app = express();
const PORT = 3000;
const securityConfig = getSecurityConfig();

// 1. Security Headers via Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  frameguard: false // Required for AI Studio preview iframe
}));

// 2. Request Correlation ID
app.use(requestIdMiddleware);

// 3. Hardened CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!securityConfig.isProduction) return callback(null, true);
    if (securityConfig.cors.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true
}));

// 4. Request size limit & cookie parsing
app.use(express.json({ limit: securityConfig.bodyLimit || "10mb" }));
app.use(cookieParser());

// 5. Global API Rate Limiter
app.use("/api", rateLimiters.generalApi.middleware());

// Health endpoints (public)
app.use("/health", healthRouter);
app.use("/api/health", healthRouter);

// Bridge for Vercel Serverless Functions
const runVercelHandler = (handler: any) => async (req: any, res: any) => {
  try {
    req.query = { ...req.query, ...req.params };
    await handler(req, res);
  } catch (error) {
    console.error("Vercel Handler Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

// Public and Customer Solar Analysis Endpoints
app.post("/api/analyze/followup", verifyAuthToken, async (req, res) => {
  const user = req.user;
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (user && res.statusCode === 200 && body.updatedResult) {
      db.addHistory({
        userId: user.id,
        input: body.updatedInput,
        resultSummary: "پیگیری: " + body.reply,
        fullResult: body.updatedResult,
      });
    }
    return originalJson(body);
  };
  await runVercelHandler(followupHandler)(req, res);
});

app.post("/api/analyze", verifyAuthToken, async (req, res) => {
  const user = req.user;
  if (user) {
    const isSubscribed = user.activeSubscriptionId && db.getSubscriptionById(user.activeSubscriptionId)?.endDate > new Date().toISOString();
    if (!isSubscribed) {
      const history = db.getHistoryByUserId(user.id);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyAnalyses = history.filter(h => {
        const d = new Date(h.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      if (monthlyAnalyses.length >= 3) {
        return res.status(402).json({ error: "شما از سقف تحلیل رایگان این ماه (۳ بار) عبور کرده‌اید. برای تحلیل بیشتر، اشتراک تهیه کنید." });
      }
    }
  }

  // Intercept res.json to save history
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (res.statusCode === 200 && body && typeof body === 'object') {
      if (user) {
        const hist = db.addHistory({
          userId: user.id,
          input: req.body,
          resultSummary: body.summary || "تحلیل خورشیدی هوشیار",
          fullResult: body,
        });
        body.analysisId = hist.id;
      } else if (!body.analysisId) {
        body.analysisId = 'anl_guest_' + Date.now();
      }
    }
    return originalJson(body);
  };

  await runVercelHandler(analyzeHandler)(req, res);
});

// Marketplace & Public Products / Vendors
app.get("/api/vendors", async (req, res) => {
  const vendors = (db.getVendors() || [])
    .filter((v: any) => v.status === "approved" || v.isPublished === true);

  const publicVendors = await Promise.all(
    vendors.map(async (v: any) => ({
      id: v.id,
      companyName: v.companyName,
      logoUrl: v.logoKey ? await signMediaItem(v.logoKey) : (v.logoUrl || ""),
      aboutUs: v.aboutUs || "",
      categories: v.categories || [],
      address: v.address || "",
      city: v.city || "",
      workingHours: v.workingHours || "",
      website: v.website || "",
      status: v.status,
      verified: v.status === "approved",
      phones: v.phones || [],
      createdAt: v.createdAt || null
    }))
  );
  res.json(publicVendors);
});

// Stage 13.11-D.4: Authoritative Generator Supplier Discovery Endpoint with Strict Query Validation
// Placed strictly BEFORE /api/vendors/:id to prevent wildcard route collision
app.get("/api/vendors/generator-discovery", async (req, res) => {
  try {
    const {
      kw,
      kva,
      phase,
      fuelType,
      city,
      province
    } = req.query;

    const validationErrors: { field: string; message: string }[] = [];

    // Helper: strict positive finite number parser
    const parseStrictPositiveNumber = (val: any, fieldName: string): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      if (typeof val !== 'string' && typeof val !== 'number') {
        validationErrors.push({ field: fieldName, message: `${fieldName} must be a valid numeric string or number` });
        return undefined;
      }
      const strVal = String(val).trim();
      // Strict regex for positive integer or decimal
      if (!/^\d+(\.\d+)?$/.test(strVal)) {
        validationErrors.push({ field: fieldName, message: `${fieldName} must be a valid positive number` });
        return undefined;
      }
      const num = Number(strVal);
      if (!Number.isFinite(num) || num <= 0) {
        validationErrors.push({ field: fieldName, message: `${fieldName} must be a finite positive number greater than 0` });
        return undefined;
      }
      return num;
    };

    const targetKw = parseStrictPositiveNumber(kw, 'kw');
    const targetKva = parseStrictPositiveNumber(kva, 'kva');

    // Phase validation: SINGLE_PHASE, THREE_PHASE, UNKNOWN, 1, 3
    let normalizedPhase: string | undefined = undefined;
    if (phase !== undefined && phase !== null && phase !== '') {
      const pStr = String(phase).trim().toUpperCase();
      if (['SINGLE_PHASE', '1', 'تک فاز', 'تک‌فاز'].includes(pStr)) {
        normalizedPhase = 'SINGLE_PHASE';
      } else if (['THREE_PHASE', '3', 'سه فاز', 'سه‌فاز'].includes(pStr)) {
        normalizedPhase = 'THREE_PHASE';
      } else if (pStr === 'UNKNOWN') {
        normalizedPhase = 'UNKNOWN';
      } else {
        validationErrors.push({
          field: 'phase',
          message: `فاز نامعتبر است. مقادیر مجاز: SINGLE_PHASE, THREE_PHASE, UNKNOWN`
        });
      }
    }

    // FuelType validation: GASOLINE, NATURAL_GAS, DIESEL, DUAL_FUEL
    let normalizedFuel: string | undefined = undefined;
    if (fuelType !== undefined && fuelType !== null && fuelType !== '') {
      const fStr = String(fuelType).trim().toUpperCase();
      const validFuels = ['GASOLINE', 'NATURAL_GAS', 'DIESEL', 'DUAL_FUEL'];
      if (validFuels.includes(fStr)) {
        normalizedFuel = fStr;
      } else {
        validationErrors.push({
          field: 'fuelType',
          message: `نوع سوخت نامعتبر است. مقادیر مجاز: ${validFuels.join(', ')}`
        });
      }
    }

    // String length limits for city and province
    let validCity: string | undefined = undefined;
    if (city !== undefined && city !== null && city !== '') {
      const cStr = String(city).trim();
      if (cStr.length > 60) {
        validationErrors.push({ field: 'city', message: 'طول نام شهر نباید بیش از ۶۰ کاراکتر باشد' });
      } else {
        validCity = cStr;
      }
    }

    let validProvince: string | undefined = undefined;
    if (province !== undefined && province !== null && province !== '') {
      const pStr = String(province).trim();
      if (pStr.length > 60) {
        validationErrors.push({ field: 'province', message: 'طول نام استان نباید بیش از ۶۰ کاراکتر باشد' });
      } else {
        validProvince = pStr;
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "پارامترهای جستجوی تأمین‌کننده نامعتبر است",
        validationErrors
      });
    }

    const allVendors = db.getVendors() || [];
    const allProducts = db.getProducts?.() || [];

    // Generator-related category tokens for specialization check
    const GENERATOR_CATEGORY_TOKENS = [
      'generator',
      'diesel_generator',
      'gas_generator',
      'gasoline_generator',
      'portable_generator',
      'genset',
      'موتور برق',
      'دیزل ژنراتور',
      'ژنراتور گازسوز',
      'موتوربرق',
      'ژنراتور دیزلی',
      'ژنراتور اضطراری',
      'تجهیزات برق اضطراری و دیزل ژنراتور'
    ];

    const isGeneratorCategory = (cat: string) => {
      if (!cat || typeof cat !== 'string') return false;
      const lower = cat.toLowerCase().trim();
      return GENERATOR_CATEGORY_TOKENS.some(token => lower.includes(token));
    };

    // Stage 13.11-D.3 Security Enforcement: Strictly approved vendors only
    // Never allow isPublished === true to bypass status !== 'approved'
    // Exclude pending_review, rejected, suspended, missing-status, and unknown-status vendors
    const approvedVendors = allVendors.filter((v: any) => v && typeof v.id === 'string' && v.status === 'approved');

    const matchedSuppliers = [];

    for (const v of approvedVendors) {
      // Optional Location Filtering
      if (validProvince) {
        const pNorm = (v.province || '').toLowerCase();
        const cNorm = (v.city || '').toLowerCase();
        const qNorm = validProvince.toLowerCase();
        if (!pNorm.includes(qNorm) && !cNorm.includes(qNorm)) {
          continue;
        }
      }

      if (validCity) {
        const cNorm = (v.city || '').toLowerCase();
        const qNorm = validCity.toLowerCase();
        if (!cNorm.includes(qNorm)) {
          continue;
        }
      }

      // Stage 13.11-D.3 Product Ownership Verification:
      // Only associate products that explicitly belong to this vendor via vendorId or ownerId.
      // Orphan products with no owner/vendor are strictly excluded.
      const vendorProducts = allProducts.filter((p: any) => {
        if (!p || !p.id || !v.id) return false;
        const isOwned = (p.vendorId && p.vendorId === v.id) ||
                        (p.ownerId && p.ownerId === v.id && (p.ownerType === 'VENDOR' || !p.ownerType));
        return Boolean(isOwned);
      });

      // Check if vendor profile has registered generator categories
      const vendorCategories: string[] = Array.isArray(v.categories) ? v.categories : [];
      const hasGeneratorCategory = vendorCategories.some(cat => isGeneratorCategory(cat));

      // Filter vendor-owned products that are generators
      const generatorProducts = vendorProducts.filter((p: any) => {
        const cat = typeof p.category === 'string' ? p.category : '';
        const name = typeof p.name === 'string' ? p.name : '';
        return isGeneratorCategory(cat) || isGeneratorCategory(name);
      });

      // Specialization Gate: Vendor qualifies ONLY if:
      // 1. Explicit generator category in vendor profile, OR
      // 2. Verified vendor-owned generator products in catalog
      // Generic solar EPC contractors without generators are rejected!
      if (!hasGeneratorCategory && generatorProducts.length === 0) {
        continue;
      }

      // Filter by fuelType or phase if requested and vendor has products
      let filteredProducts = generatorProducts;
      if (normalizedFuel) {
        const fuelQuery = normalizedFuel.toLowerCase();
        const fuelMatches = generatorProducts.filter((p: any) => {
          const pFuel = String(p.specs?.fuelType || p.fuelType || '').toLowerCase();
          const pName = String(p.name || '').toLowerCase();
          return pFuel.includes(fuelQuery) || pName.includes(fuelQuery);
        });
        if (fuelMatches.length > 0) {
          filteredProducts = fuelMatches;
        }
      }

      if (normalizedPhase) {
        const phaseMatches = generatorProducts.filter((p: any) => {
          const rawPhase = String(p.specs?.phase || p.phase || '').toUpperCase();
          if (normalizedPhase === 'THREE_PHASE') {
            return rawPhase === 'THREE_PHASE' || rawPhase === '3';
          }
          if (normalizedPhase === 'SINGLE_PHASE') {
            return rawPhase === 'SINGLE_PHASE' || rawPhase === '1';
          }
          return rawPhase.includes(normalizedPhase);
        });
        if (phaseMatches.length > 0) {
          filteredProducts = phaseMatches;
        }
      }

      let hasPreliminaryRatingNearTarget = false;
      const matchedProducts = [];

      for (const p of filteredProducts) {
        const specs = p.specs || {};
        const pKw = specs.powerKw || specs.capacityKw || p.powerKw || (p.power && p.powerUnit === 'KW' ? p.power : undefined);
        const pKva = specs.powerKva || specs.capacityKva || p.powerKva || (p.power && p.powerUnit === 'KVA' ? p.power : undefined);

        let ratingNearTarget = false;
        if (targetKw && pKw) {
          ratingNearTarget = Math.abs(pKw - targetKw) <= Math.max(targetKw * 0.25, 2.0);
        } else if (targetKva && pKva) {
          ratingNearTarget = Math.abs(pKva - targetKva) <= Math.max(targetKva * 0.25, 2.5);
        }

        if (ratingNearTarget) {
          hasPreliminaryRatingNearTarget = true;
        }

        matchedProducts.push({
          id: p.id,
          name: p.name,
          brand: p.brand,
          model: p.model,
          category: p.category,
          price: p.price,
          capacityKw: pKw,
          capacityKva: pKva,
          phase: specs.phase || p.phase,
          fuelType: specs.fuelType || p.fuelType,
          inStock: p.inStock !== false,
          availability: p.availability || (p.inStock === false ? 'UNAVAILABLE' : 'AVAILABLE'),
          images: await signMediaArray(p.images),
          // Clear engineering distinction: preliminary steady-state only, motor starting unverified
          steadyStateComparisonNote: "مقایسه صرفاً بر مبنای بار نامی حالت پایدار (Steady-State) است. توان راه‌اندازی الکتروموتورها و الزامات فنی نصب در محل باید حتماً توسط کارشناس و بر اساس کاتالوگ سازنده تأیید شود.",
          startingCapabilityVerified: false
        });
      }

      const signedLogo = v.logoKey ? await signMediaItem(v.logoKey) : (v.logoUrl || "");

      matchedSuppliers.push({
        id: v.id,
        companyName: v.companyName,
        logoUrl: signedLogo,
        aboutUs: v.aboutUs || "",
        categories: v.categories || [],
        city: v.city || "",
        province: v.province || "",
        address: v.address || "",
        workingHours: v.workingHours || "",
        website: v.website || "",
        verified: v.status === "approved",
        phones: v.phones || [],
        matchedProductsCount: generatorProducts.length,
        hasCapacityMatch: hasPreliminaryRatingNearTarget,
        hasPreliminaryRatingNearTarget,
        matchedProducts
      });
    }

    res.json({
      query: {
        kw: targetKw,
        kva: targetKva,
        phase: (normalizedPhase as any) || undefined,
        fuelType: (normalizedFuel as any) || undefined,
        city: validCity,
        province: validProvince
      },
      totalSuppliersCount: approvedVendors.length,
      matchedSuppliersCount: matchedSuppliers.length,
      hasMatches: matchedSuppliers.length > 0,
      suppliers: matchedSuppliers,
      searchCriteriaSummary: {
        targetCapacityKw: targetKw || null,
        phase: (normalizedPhase as any) || 'UNKNOWN',
        fuelTypes: normalizedFuel ? [normalizedFuel as any] : [],
        location: validCity ? `${validCity}${validProvince ? ` - ${validProvince}` : ''}` : (validProvince || undefined)
      },
      engineeringDisclaimer: "مقایسه صرفاً بر مبنای بار نامی حالت پایدار (Steady-State) است. توان راه‌اندازی الکتروموتورها و الزامات فنی نصب در محل باید حتماً توسط کارشناس و بر اساس کاتالوگ سازنده تأیید شود."
    });
  } catch (err: any) {
    console.error("Generator discovery error:", err);
    res.status(500).json({ error: "خطا در جستجوی تأمین‌کنندگان موتور برق و ژنراتور" });
  }
});


app.get("/api/vendors/:id", async (req, res) => {
  const v = db.getVendorById?.(req.params.id) || (db.getVendors() || []).find((x: any) => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: "فروشگاه یافت نشد." });

  const signedLogo = v.logoKey ? await signMediaItem(v.logoKey) : (v.logoUrl || "");
  const allProducts = db.getProducts?.() || [];
  const vendorProducts = allProducts.filter((p: any) => p.vendorId === v.id || p.ownerId === v.id);
  const products = await Promise.all(
    vendorProducts.map(async (p: any) => ({
      ...p,
      availability: p.availability || (p.inStock === false ? 'UNAVAILABLE' : 'AVAILABLE'),
      images: await signMediaArray(p.images)
    }))
  );

  res.json({
    vendor: {
      id: v.id,
      companyName: v.companyName,
      logoUrl: signedLogo,
      aboutUs: v.aboutUs || "",
      categories: v.categories || [],
      address: v.address || "",
      city: v.city || "",
      workingHours: v.workingHours || "",
      website: v.website || "",
      status: v.status,
      verified: v.status === "approved",
      phones: v.phones || [],
      products,
      createdAt: v.createdAt || null
    }
  });
});

app.get("/api/products", (req, res) => {
  res.json(db.getProducts());
});

app.post("/api/vendor/register", runVercelHandler(vendorRegisterHandler));
app.post("/api/vendor/products", runVercelHandler(vendorProductsHandler));
app.get("/api/vendor/products", runVercelHandler(vendorProductsHandler));
app.post("/api/energy/recommend", runVercelHandler(recommendHandler));
app.post("/api/energy/analyze-images", runVercelHandler(analyzeImagesHandler));
app.post("/api/energy/optimize-layout", runVercelHandler(optimizeLayoutHandler));

// Power Plant Planning Handler (Preliminary / Illustrative Feasibility Engine)
const handlePowerPlantPlanning = async (req: express.Request, res: express.Response) => {
  try {
    const { area, city, roofType, phase, usage, budget, budgetUnit } = req.body || {};

    const missingFields: string[] = [];
    const numericArea = Number(area);

    if (area === undefined || area === null || area === '' || isNaN(numericArea) || numericArea <= 0) {
      missingFields.push('area');
    }
    if (!city || typeof city !== 'string' || !city.trim()) {
      missingFields.push('city');
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        code: 'INSUFFICIENT_INPUT_DATA',
        error: 'اطلاعات ورودی برای ارزیابی اولیه نیروگاه خورشیدی کافی نیست. لطفاً مساحت و شهر را مشخص کنید.',
        missingFields
      });
    }

    // Preliminary engineering assumptions (clearly disclosed as illustrative)
    // 75% surface factor, 6.5 sqm/kWp specific footprint
    const usableAreaRatio = 0.75;
    const areaPerKwpM2 = 6.5;
    const estimatedCapacityKw = Math.round(((numericArea * usableAreaRatio) / areaPerKwpM2) * 10) / 10;

    // Unit budget conversion (Toman in millions)
    let totalBudgetMillion = 0;
    if (budget && Number(budget) > 0) {
      const bNum = Number(budget);
      totalBudgetMillion = budgetUnit === 'billion' ? bNum * 1000 : bNum;
    } else {
      // Benchmark: ~30 Million Tomans per kWp
      totalBudgetMillion = Math.round(estimatedCapacityKw * 30);
    }

    // Annual generation: ~1600 kWh/kWp/year for standard irradiation in Iran
    const annualGenerationKwh = Math.round(estimatedCapacityKw * 1600);
    const benchmarkRateTomanPerKwh = 3500; // Reference SATBA / green board benchmark
    const baseAnnualRevenueMillion = Math.round((annualGenerationKwh * benchmarkRateTomanPerKwh) / 1000000);
    const baseAnnualOpexMillion = Math.max(1, Math.round(totalBudgetMillion * 0.015));

    // 10-Year cash flow simulation with 0.7% annual degradation & 10% O&M inflation
    const financialData = [];
    let cumulativeProfit = -totalBudgetMillion;

    for (let year = 1; year <= 10; year++) {
      const degradationFactor = Math.pow(1 - 0.007, year - 1);
      const yearRevenue = Math.round(baseAnnualRevenueMillion * degradationFactor);
      const yearOpex = Math.round(baseAnnualOpexMillion * Math.pow(1.10, year - 1));
      const netProfit = yearRevenue - yearOpex;
      cumulativeProfit += netProfit;

      financialData.push({
        year: `سال ${year}`,
        revenue: yearRevenue,
        maintenance: yearOpex,
        netProfit,
        cumulativeProfit
      });
    }

    const analysisText = `### 🗺️ نقشه راه و مدل‌سازی امکان‌سنجی اولیه احداث نیروگاه خورشیدی

> **سلب مسئولیت مهندسی و مالی:** ارقام و نمودارهای ارائه‌شده صرفاً بر مبنای **شبیه‌سازی مقدماتی و شاخص‌های آماری مرجع بازار** محاسبه شده‌اند و فاقد تأییدیه میدانی، نظام مهندسی یا قرارداد رسمی EPC می‌باشند. برآورد قطعی مستلزم نقشه‌برداری سازه و اخذ مجوز اتصال به شبکه است.

#### ۱. مشخصات برآوردی سامانه:
- **مساحت کل در دسترس:** ${numericArea.toLocaleString('fa-IR')} متر مربع
- **مساحت مفید برآوردی (ضریب ۷۵٪):** ${Math.round(numericArea * usableAreaRatio).toLocaleString('fa-IR')} متر مربع
- **ظرفیت نامی تقریبی نیروگاه:** **${estimatedCapacityKw.toLocaleString('fa-IR')} کیلووات (kWp)**
- **تولید سالانه تخمینی:** حدود **${annualGenerationKwh.toLocaleString('fa-IR')} کیلووات‌ساعت** در سال
- **موقعیت ساختگاه:** ${city} (منطقه با پتانسیل تابشی استاندارد)
- **محل و نوع استقرار:** ${roofType === 'sloped' ? 'سقف شیب‌دار' : roofType === 'ground' ? 'پایه‌کوبی روی زمین' : 'سقف مسطح'}
- **نوع فاز شبکه:** ${phase === '1-phase' ? 'تک‌فاز' : 'سه‌فاز'}

#### ۲. الزامات فنی و فرآیند احداث قطعی:
1. **استعلام فنی و بازدید میدانی:** ارزیابی زاویه شیب، استحکام بارگذاری سازه و مقاومت کابل‌کشی.
2. **مجوز اتصال به شبکه (PPA):** ثبت نام در درگاه سامانه مهرسان یا دفتر خدمات انرژی‌های تجدیدپذیر شرکت توزیع/برق منطقه‌ای.
3. **مناقصه و انتخاب مجری مجاز (EPC):** دریافت پیشنهادات فنی-مالی رسمی از طریق سامانه مناقصات هوشیار انرژی.
4. **تأمین تجهیزات دارای گواهی معتبر:** پنل‌های دارای استاندارد IEC 61215 و اینورترهای مجاز توانیر.`;

    const sizingMetadata = {
      capacityKw: estimatedCapacityKw,
      totalBudgetMillion,
      annualGenerationKwh,
      isIllustrative: true,
      isVerifiedEngineering: false,
      disclaimer: 'محاسبات فوق بر مبنای شاخص‌های مرجع بازار و شبیه‌سازی مساحتی استخراج شده و به منزله پیشنهاد قیمت قطعی یا تضمین بازدهی مالی نمی‌باشد.',
      assumptions: {
        usableAreaRatio,
        areaPerKwpM2,
        annualEquivalentHours: 1600,
        benchmarkCostPerKwpMillion: 30
      }
    };

    return res.json({
      analysis: analysisText,
      financialData,
      sizingMetadata
    });
  } catch (error) {
    return res.status(500).json({ error: 'خطا در ارزیابی نیروگاه خورشیدی' });
  }
};

app.post('/api/plan-powerplant', handlePowerPlantPlanning);
app.post('/api/analyze-powerplant', handlePowerPlantPlanning);

// Domain sub-routers
app.use("/api/auth", authRouter);
app.use("/api/partners", partnersRouter);
app.use("/api/professionals", professionalsRouter);
app.use("/api/contractors", contractorsRouter);
app.use("/api/ads", adsRouter);
app.use("/api/user", userRouter);
app.use("/api/subscription", subscriptionRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/investment", investmentRouter);
app.use("/api/execution", executionRouter);
app.use("/api", financeRouter);
app.use("/api", procurementRouter);
app.use("/api", assetRouter);
app.use("/api", financingRouter);
app.use("/api", monitoringRouter);
app.use("/api", maintenanceRouter);
app.use("/api/rfq", rfqRouter);
app.use("/api/enterprise", enterpriseRouter);
app.use("/api/energy-center", energyCenterRouter);

// Fallback for unmatched API routes: return JSON 404, never index.html
app.all("/api/*", (req, res) => {
  res.status(404).json({
    code: "NOT_FOUND",
    message: `API endpoint not found: ${req.method} ${req.path}`,
    requestId: (req as any).id
  });
});

// Centralized error handling
app.use(errorHandler);

async function startServer() {
  // Production Readiness Environment Check
  const envReport = validateEnvironment();
  if (!envReport.isValid && envReport.config.isProduction) {
    console.error("FATAL: Environment validation failed in production:");
    envReport.errors.forEach(err => console.error(` - ${err}`));
    process.exit(1);
  } else if (envReport.warnings.length > 0) {
    envReport.warnings.forEach(warn => console.warn(`[CONFIG-WARN] ${warn}`));
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful shutdown handling
  const handleShutdown = (signal: string) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log("HTTP server stopped accepting connections.");
      try {
        await closePostgresDB();
        console.log("PostgreSQL connection pool drained successfully.");
      } catch (err) {
        console.error("Error closing PostgreSQL connection:", err);
      }
      process.exit(0);
    });

    setTimeout(() => {
      console.error("Forceful shutdown after timeout.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}
startServer();
