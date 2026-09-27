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
app.use(express.json({ limit: securityConfig.bodyLimit || "1mb" }));
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
app.get("/api/vendors", (req, res) => {
  const vendors = (db.getVendors() || [])
    .filter((v: any) => v.status === "approved" || v.isPublished === true)
    .map((v: any) => ({
      id: v.id,
      companyName: v.companyName,
      logoUrl: v.logoUrl || "",
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
    }));
  res.json(vendors);
});

app.get("/api/vendors/:id", (req, res) => {
  const v = db.getVendorById?.(req.params.id) || (db.getVendors() || []).find((x: any) => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: "فروشگاه یافت نشد." });
  res.json({
    vendor: {
      id: v.id,
      companyName: v.companyName,
      logoUrl: v.logoUrl || "",
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

app.post("/api/plan-powerplant", async (req, res) => {
  try {
    const { area, city, roofType, phase, usage, budget } = req.body;
    let capacityKw = 0;
    if (area > 0) {
       capacityKw = (area * 0.75) / 6.5; 
    }
    const totalBudgetMillion = budget || (capacityKw * 30);
    const analysisText = `### 🗺️ نقشه راه جامع و گام‌به‌گام احداث نیروگاه خورشیدی\nبرنامه عملیاتی شما...`;
    
    const financialData = [];
    res.json({ analysis: analysisText, financialData });
  } catch (error) {
    res.status(500).json({ error: "Analysis failed" });
  }
});

// Domain sub-routers
app.use("/api/auth", authRouter);
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
