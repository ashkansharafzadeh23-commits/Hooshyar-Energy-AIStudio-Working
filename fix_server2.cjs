const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// I will extract everything up to `app.post("/api/analyze"`
let index = code.indexOf('app.post("/api/analyze",');
let topPart = code.substring(0, index);

let newServer = topPart + `app.post("/api/analyze", async (req, res) => {
  try {
    const { targets, locationType, appliances, actualMonthlyKwh, area, sunHours = 5.5, supportHours = 2, essentialAppliances = [] } = req.body;
    
    let engineResults = {};
    const dailyKwh = calculateDailyConsumption(appliances, locationType, actualMonthlyKwh);
    engineResults.dailyConsumptionEstimate = {
      dailyKwh,
      monthlyKwh: dailyKwh * 30
    };

    if (targets.includes("solar")) {
      engineResults.solar = calculateSolarSizing(dailyKwh, area * 0.7, sunHours);
    }
    if (targets.includes("generator")) {
      engineResults.generator = calculateGeneratorSizing(appliances, locationType === "factory" || locationType === "industrial_warehouse");
    }
    if (targets.includes("powerbank")) {
      engineResults.powerbank = calculatePowerbankSizing(essentialAppliances.length > 0 ? essentialAppliances : appliances, supportHours);
    }

    const allProducts = db.getProducts();
    const vendors = db.getVendors();
    const enrichedCatalog = allProducts.map(p => {
      const vendor = vendors.find(v => v.id === p.vendorId);
      return { ...p, vendorName: vendor?.companyName, vendorCity: vendor?.city };
    });

    if (targets.includes("solar") && engineResults.solar) {
       const solarPanels = enrichedCatalog.filter(p => p.category === 'solar_panel');
       engineResults.solar.panelOptions = selectPanelOptions({
           targetSystemKwp: engineResults.solar.requiredKwp,
           usableAreaM2: area * 0.7,
           catalogPanels: solarPanels
       });
    }

    const aiPrompt = \`You are the AI Layer for the Smart Energy Advisor. The deterministic Rule Engine has already calculated the technical requirements:
\${JSON.stringify(engineResults, null, 2)}
Here is the catalog of available products:
\${JSON.stringify(enrichedCatalog, null, 2)}
Your task is to match the Rule Engine requirements to the closest products in the catalog.
Respond STRICTLY with a JSON object in this format:
{
  "summary": "Detailed explanation of the analysis, explicitly including the recommendations for fuel types, panel counts, etc. (in Persian).",
  "technicalSpecs": [{ "label": "string", "value": "string", "description": "string" }],
  "dailyConsumptionEstimate": { "dailyKwh": number, "monthlyKwh": number },
  "recommendedProducts": [
    {
      "id": "product_id from catalog",
      "category": "string",
      "brand": "string",
      "model": "string",
      "specs": {},
      "price": number,
      "currency": "IRR",
      "vendorName": "exact vendorName from catalog",
      "vendorCity": "exact vendorCity from catalog",
      "reason": "Why this product was chosen"
    }
  ],
  "requiredAccessories": [{ "name": "string (in Persian)", "availableInCatalog": boolean }],
  "estimatedTotalCost": number,
  "warnings": [{ "severity": "error"|"warning"|"info", "message": "string (in Persian)" }],
  "energySavingTips": [{ "title": "string (in Persian)", "description": "string (in Persian)" }]
}\`;

    let aiResult;
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: aiPrompt,
          config: {
             responseMimeType: "application/json"
          }
        });
        aiResult = JSON.parse(response.text || "{}");
      } catch (err) {
        console.error("AI error:", err);
      }
    }
    
    if (!aiResult || !aiResult.recommendedProducts) {
      aiResult = {
        summary: "تحلیل پایه بر اساس موتور قوانین انجام شد. برای دریافت پیشنهادات هوشمندتر کلید API جمینای را تنظیم کنید.",
        technicalSpecs: [
          ...(engineResults.solar ? [
            { label: "ظرفیت پنل خورشیدی", value: \`\${engineResults.solar.requiredKwp} kWp\` },
            { label: "فضای مورد نیاز", value: \`\${engineResults.solar.estimatedAreaNeededM2} متر مربع\` }
          ] : []),
          ...(engineResults.generator ? [
            { label: "ظرفیت موتور برق", value: \`\${engineResults.generator.requiredKva} kVA\` }
          ] : [])
        ],
        dailyConsumptionEstimate: engineResults.dailyConsumptionEstimate,
        recommendedProducts: engineResults.solar?.panelOptions?.options?.map((opt) => ({
          id: opt.productId,
          category: "solar_panel",
          brand: opt.brand,
          model: opt.model,
          price: opt.totalCost,
          vendorName: "انرژی نوین",
          vendorCity: "تهران",
          reason: opt.label + \` (\${opt.panelCount} عدد)\`
        })) || enrichedCatalog.slice(0, 2).map((p) => ({
          id: p.id,
          category: p.category,
          brand: p.brand,
          model: p.model,
          price: p.price,
          vendorName: p.vendorName || "فروشنده نمونه",
          vendorCity: p.vendorCity || "تهران",
          reason: "تطابق با نیازمندی‌های اولیه شما (نسخه دمو)"
        })),
        requiredAccessories: [
          ...(engineResults.solar ? [
            { name: "کابل سولار MC4", availableInCatalog: true },
            { name: "سازه‌های آلومینیومی نصب", availableInCatalog: true },
            { name: "اینورتر و شارژ کنترلر", availableInCatalog: false },
            { name: "باتری خورشیدی", availableInCatalog: true }
          ] : []),
          ...(engineResults.generator ? [
            { name: "کابل برق استاندارد", availableInCatalog: true },
            { name: "تابلو برق چنج‌اور (ATS)", availableInCatalog: false }
          ] : []),
          ...(engineResults.powerbank ? [
             { name: "پنل تاشو جهت شارژ مجدد (اختیاری)", availableInCatalog: true }
          ] : [])
        ],
        estimatedTotalCost: enrichedCatalog.slice(0, 2).reduce((sum, p) => sum + p.price, 0),
        warnings: [
          { severity: "warning", message: "این یک خروجی شبیه‌سازی شده است (به دلیل عدم دسترسی به کلید API هوش مصنوعی)." }
        ]
      };
    }
    res.json(aiResult);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

app.post("/api/analyze-powerplant", async (req, res) => {
  try {
    const { area, city, budget, budgetUnit, connectionType, roofType, phase } = req.body;
    
    if (!area || !city || !budget) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const budgetMultiplier = budgetUnit === 'billion' ? 1000 : 1;
    const totalBudgetMillion = parseFloat(budget) * budgetMultiplier;

    const aiPrompt = \`You are an expert Solar Power Plant Consultant in Iran. 
A user wants to establish a solar power plant.
Here are their inputs:
- Land/Roof Area: \${area} square meters
- Location: \${city}
- Budget: \${totalBudgetMillion} million Tomans
- Connection Type: \${connectionType}
- Installation Type (Roof/Ground): \${roofType}
- Electricity Phase: \${phase}

Please provide a highly detailed, professional, and practical roadmap in Persian (Markdown format) that covers:
1. **Estimated Capacity**: How many kW/MW can they install with this land area and budget?
2. **Number of Panels**: Approximate number of solar panels and inverters needed.
3. **Required Equipment**: What specific equipment is needed?
4. **Legal & Licensing Steps**: Step-by-step guide to get permits from SATBA and the electricity distribution company.
5. **Standard Requirements**: Location setup, safety standards, grid connection requirements.
6. **Workforce**: What specialized teams/personnel are needed for installation and maintenance.
7. **Financial Analysis (Estimate)**: Return on investment (ROI), expected monthly income.

Make the response structured with Markdown headers, bullet points, and bold text for readability. Give realistic estimates for Iran.\`;

    let analysisText = \`### تحلیل احداث نیروگاه خورشیدی (نسخه نمایشی)

با توجه به مساحت **\${area} متر مربع** و بودجه **\${totalBudgetMillion} میلیون تومان** در شهر **\${city}**، برآورد اولیه به شرح زیر است:

#### 1. ظرفیت تخمینی و تجهیزات
* **ظرفیت قابل احداث:** با این بودجه، حدوداً قادر به احداث نیروگاه خواهید بود.
* **تجهیزات اصلی:** پنل‌های خورشیدی مونوکریستال، اینورترها، استراکچر، کابل‌های DC و AC، تابلو برق.

#### 2. مراحل قانونی و اخذ مجوز
1. ثبت نام در سامانه مهرسان (ساتبا).
2. ارائه مدارک مالکیت زمین و هویتی.
3. عقد قرارداد.

#### 3. الزامات استاندارد و احداث
* زمین بدون سایه‌اندازی.
* ایمن‌سازی محوطه.

#### 4. تحلیل مالی (تخمینی)
* **بازگشت سرمایه (ROI):** معمولاً بین 3 تا 4 سال.

> **توجه:** سیستم نتوانست تحلیل دقیق هوش مصنوعی را تولید کند (خطای API یا عدم تنظیم کلید). اطلاعات فوق به صورت پیش‌فرض نمایش داده شده‌اند.
\`;

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: aiPrompt,
        });
        analysisText = response.text;
      } catch (aiError) {
        console.error("AI Generation failed:", aiError);
      }
    }

    const numArea = parseFloat(area) || 0;
    const numBudget = totalBudgetMillion || 0;
    
    const possibleCapacityByBudget = numBudget / 30;
    const possibleCapacityByArea = numArea / 10;
    const capacityKw = Math.max(0, Math.min(possibleCapacityByBudget, possibleCapacityByArea));
    const actualInvestment = capacityKw * 30;
    
    const financialData = [];
    let cumulativeProfit = -actualInvestment;
    
    for (let year = 1; year <= 10; year++) {
      const annualGenerationKwh = capacityKw * 1800 * Math.pow(0.99, year - 1);
      const revenue = (annualGenerationKwh * 3000) / 1000000;
      const maintenanceCost = actualInvestment * 0.02 * Math.pow(1.15, year - 1);
      
      const netProfit = revenue - maintenanceCost;
      cumulativeProfit += netProfit;
      
      financialData.push({
        year: \`سال \${year}\`,
        revenue: Math.round(revenue),
        maintenance: Math.round(maintenanceCost),
        netProfit: Math.round(netProfit),
        cumulativeProfit: Math.round(cumulativeProfit)
      });
    }

    res.json({ analysis: analysisText, financialData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

async function startServer() {
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
  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on port \${PORT}\`);
  });
}

startServer();
`;
fs.writeFileSync('server.ts', newServer);
