import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { width, length } = req.body;
    
    if (!width || !length || width > 50 || length > 50) {
      return res.status(400).json({ error: 'Width and length are required and must be max 50m' });
    }

    const prompt = `You are a solar engineering AI.
The user wants to lay out solar panels in an area of ${width} meters (width/X) by ${length} meters (length/Z).
Panel size: 2.2m x 1.1m.
Row spacing: 0.5m. Column spacing: 0.1m.
Generate a valid layout that centers the panels in this area (around 0,0).
Max 40 panels to avoid overwhelming the JSON.
Format exactly as JSON:
{
  "recommendationText": "شرح کوتاه در مورد چیدمان پیشنهادی شما به زبان فارسی.",
  "panels": [
    { "x": 0, "z": 0, "rotation": [0, 0, 0] }
  ]
}
Do not use markdown formatting, output pure JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.1 }
    });

    const text = response.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let result;
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      result = JSON.parse(text);
    }
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Layout AI Error:', error);
    // Fallback simple generator
    const w = Number(req.body.width) || 10;
    const l = Number(req.body.length) || 10;
    const panels = [];
    const cols = Math.floor(w / 1.2);
    const rows = Math.floor(l / 2.7);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
         if (panels.length >= 40) break;
         panels.push({
           x: (c * 1.2) - (cols * 1.2) / 2 + 0.6,
           z: (r * 2.7) - (rows * 2.7) / 2 + 1.35,
           rotation: [-0.3, 0, 0]
         });
      }
    }
    return res.status(200).json({
      recommendationText: `هوش مصنوعی در دسترس نبود، اما چیدمان پایه برای ${panels.length} پنل تولید شد.`,
      panels
    });
  }
}
