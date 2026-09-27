import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { billImage, siteImages, manualConsumption, area } = req.body;

    let prompt = `You are a professional solar energy engineer. The user wants to design a solar system.
Available area for installation: ${area || 'unknown'} square meters.`;

    if (manualConsumption) {
      prompt += `\nThe user has manually specified a monthly electricity consumption of ${manualConsumption} kWh.`;
    }

    prompt += `\nAnalyze the provided images (if any).
If an electricity bill is provided, extract the monthly consumption in kWh (usually derived from the total period consumption).
If a site/roof image is provided, assess the layout, shading, and potential for solar panels.

Based on the consumption and area, calculate an approximate solar system size (in kWp). Usually, 1 kWp produces ~4.5 kWh/day (135 kWh/month) and requires ~5 sqm of area.
Provide your response strictly as a JSON object (without markdown blocks like \`\`\`json) with the following structure:
{
  "monthlyConsumptionKwh": number (extracted from bill or use manual, or 0 if neither),
  "solarCapacityKwp": number (recommended system size in kW),
  "recommendedDesign": "String explaining the layout and sizing in Persian (Farsi). Max 3 sentences."
}
DO NOT RETURN ANYTHING OTHER THAN THE JSON OBJECT.`;

    const contents = [{ role: 'user', parts: [] }];

    if (billImage) {
      contents[0].parts.push({
        inlineData: {
          mimeType: billImage.mimeType || 'image/jpeg',
          data: billImage.data,
        }
      });
    }

    if (siteImages && Array.isArray(siteImages)) {
      siteImages.forEach(img => {
        contents[0].parts.push({
          inlineData: {
            mimeType: img.mimeType || 'image/jpeg',
            data: img.data,
          }
        });
      });
    }

    contents[0].parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        temperature: 0.2
      }
    });

    const text = response.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    return res.status(200).json(result);

  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: 'Failed to analyze images' });
  }
}
