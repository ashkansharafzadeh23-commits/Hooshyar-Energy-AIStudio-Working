const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// replace the old logic
code = code.replace(/if \(\!process\.env\.GEMINI_API_KEY\) \{[\s\S]*?analysisText = response\.text;\n    \}/g, `
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
`);
fs.writeFileSync('server.ts', code);
