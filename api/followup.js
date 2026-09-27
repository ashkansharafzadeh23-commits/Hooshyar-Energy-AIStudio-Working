import { runRuleEngine } from './analyze.js';

const SYSTEM_PROMPT_EXTRACT = `تو فقط وظیفه استخراج داری، نه تحلیل یا محاسبه. پیام کاربر را بخوان و آن را به یک تغییر ساختاریافته (Patch) روی ورودی قبلی تبدیل کن. فقط از لوازم موجود در فهرست appliances-config پروژه استفاده کن (توان هرکدام از همان فهرست بیاید، هرگز عدد جدید اختراع نکن). اگر کاربر عدد دقیقی گفت (مثلاً "متراژ رو کن به ۴۰۰ متر")، همان عدد را در Patch بگذار. اگر پیام کاربر مبهم بود و نمی‌توانی مطمئن به یک تغییر مشخص برسی، به‌جای حدس زدن، در فیلد needsClarification یک سوال شفاف‌کننده بنویس. خروجی فقط یک JSON با این ساختار باشد، بدون متن اضافه:
{
  "patchType": "add_appliance | remove_appliance | change_area | change_city | change_goal | unclear",
  "applianceId": "split_ac" یا null,
  "quantityDelta": 1 یا null,
  "newAreaValue": null یا عدد,
  "needsClarification": null یا "متن سوال شفاف‌کننده"
}`;

const SYSTEM_PROMPT_DIFF = `تو فقط تفاوت بین دو نتیجه محاسبه‌شده (که هر دو توسط Rule Engine ساخته شده‌اند، نه توسط تو) را به فارسی ساده توضیح می‌دهی. هرگز عددی که در ورودی نیامده تولید نکن. لحن دوستانه و مستقیم باشد، مثلاً: "با این تغییر، به ۲ پنل بیشتر (جمعاً ۱۶ پنل) و ۱.۱ کیلووات توان بیشتر نیاز دارید." خروجی فقط یک جمله یا دو جمله کوتاه فارسی باشد، بدون JSON.`;

// A naive mock catalog to map appliance IDs if needed (if frontend sends a raw string instead of matching an ID, but let's assume LLM extracts reasonable IDs or we don't strictly enforce id-to-watt mapping here if we can rely on frontend previousInput, wait. The prompt says "فقط از لوازم موجود در فهرست appliances-config پروژه استفاده کن (توان هرکدام از همان فهرست بیاید...)"
// Actually, I'll pass the appliances catalog to the LLM so it knows the IDs and watts.

const APPLIANCES_CATALOG = [
  { id: 'fridge', name: 'یخچال', watt: 300, defaultHours: 24 },
  { id: 'split_ac', name: 'کولر گازی', watt: 2000, defaultHours: 8 },
  { id: 'water_cooler', name: 'کولر آبی', watt: 600, defaultHours: 8 },
  { id: 'tv', name: 'تلویزیون', watt: 150, defaultHours: 6 },
  { id: 'lighting', name: 'روشنایی', watt: 200, defaultHours: 6 },
  { id: 'washing_machine', name: 'ماشین لباسشویی', watt: 2500, defaultHours: 1 },
  { id: 'water_pump', name: 'پمپ آب', watt: 750, defaultHours: 2 },
  { id: 'miner', name: 'دستگاه ماینر', watt: 3000, defaultHours: 24 }
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { previousInput, previousResult, message } = req.body;
  if (!previousInput || !previousResult || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ reply: "کلید API تنظیم نشده است.", needsClarification: "کلید API تنظیم نشده است." });
  }

  try {
    // 1. Extract Patch
    const extractRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT_EXTRACT}` }] },
        contents: [].map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
        }
      }),
    });

    if (!extractRes.ok) throw new Error("Extract API failed");
    const extractData = await extractRes.json();
    let extractText = extractData.content[0].text;
    
    // parse JSON
    const jsonMatch = extractText.match(/\{[\s\S]*\}/);
    if (jsonMatch) extractText = jsonMatch[0];
    const patch = JSON.parse(extractText);

    if (patch.patchType === 'unclear' || patch.needsClarification) {
      return res.status(200).json({
        reply: patch.needsClarification || "لطفاً دقیق‌تر بفرمایید.",
        needsClarification: patch.needsClarification || "لطفاً دقیق‌تر بفرمایید.",
        updatedInput: null,
        updatedResult: null,
        diffSummary: null
      });
    }

    // 2. Apply Patch
    const updatedInput = JSON.parse(JSON.stringify(previousInput));
    
    if (patch.patchType === 'change_area' && patch.newAreaValue) {
      updatedInput.area = patch.newAreaValue;
    } else if (patch.patchType === 'change_city' && patch.newAreaValue) {
      updatedInput.city = patch.newAreaValue;
    } else if (patch.patchType === 'add_appliance' || patch.patchType === 'remove_appliance') {
      if (!updatedInput.appliances) updatedInput.appliances = [];
      const delta = patch.quantityDelta || (patch.patchType === 'add_appliance' ? 1 : -1);
      
      let existing = updatedInput.appliances.find(a => a.id === patch.applianceId);
      if (existing) {
        existing.quantity += delta;
        if (existing.quantity <= 0) {
          updatedInput.appliances = updatedInput.appliances.filter(a => a.id !== patch.applianceId);
        }
      } else if (delta > 0) {
        const catItem = APPLIANCES_CATALOG.find(a => a.id === patch.applianceId);
        if (catItem) {
          updatedInput.appliances.push({
            id: catItem.id,
            name: catItem.name,
            watt: catItem.watt,
            hours: catItem.defaultHours,
            quantity: delta
          });
        }
      }
    }

    // 3. Run Rule Engine
    const ruleRes = await runRuleEngine(updatedInput);
    if (ruleRes.error) {
      return res.status(ruleRes.error.status).json({ reply: "خطا در محاسبه مجدد." });
    }
    const updatedResult = ruleRes.engineResult;

    // 4. Generate Diff Summary
    const diffRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT_DIFF}` }] },
        contents: [].map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
        }
      }),
    });

    let reply = "محاسبات با موفقیت بروزرسانی شد.";
    if (diffRes.ok) {
      const diffData = await diffRes.json();
      reply = diffData.content[0].text;
    }

    // Calculate diff for frontend
    const diffSummary = {};
    if (updatedResult.solar?.finalKwp && previousResult.solar?.finalKwp) {
      diffSummary.systemPowerKwDelta = +(updatedResult.solar.finalKwp - previousResult.solar.finalKwp).toFixed(2);
    }
    const prevPanel = previousResult.solar?.panelOptions?.economy || previousResult.solar?.panelOptions?.default;
    const updPanel = updatedResult.solar?.panelOptions?.economy || updatedResult.solar?.panelOptions?.default;
    if (prevPanel && updPanel) {
      diffSummary.panelCountDelta = updPanel.panelCount - prevPanel.panelCount;
    }

    return res.status(200).json({
      reply,
      needsClarification: null,
      updatedInput,
      updatedResult,
      diffSummary
    });

  } catch (err) {
    console.error("Followup Error:", err);
    return res.status(500).json({ reply: "خطا در ارتباط با سرور." });
  }
}
