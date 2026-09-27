import { calculateSolarSizing, calculateGeneratorSizing, calculatePowerbankSizing, calculateDailyConsumption, DIVERSITY_FACTORS } from '../../src/api/engine.js';
import { db } from '../../src/db/index.js';
import { SCORING_WEIGHTS } from './scoringConfig.js';

const SYSTEM_PROMPT = `When given a ranked list of energy system architectures (already scored and ordered by deterministic code — never re-order them yourself), write a short Persian explanation for each, covering: why it fits the user's consumption/budget/backup needs, and one honest trade-off or caveat. Never state a number that isn't present in the input JSON. End each explanation-set with:
"این پیشنهاد اولیه است؛ طراحی نهایی باید توسط کارشناس/EPC تایید شود."`;

function selectCandidateArchitectures(profile) {
  const all = [
    'solar_ongrid',
    'solar_hybrid',
    'solar_offgrid',
    'generator_only',
    'solar_generator',
    'solar_battery_generator'
  ];
  if (!profile.gridConnected) {
    return ['solar_offgrid', 'generator_only', 'solar_generator', 'solar_battery_generator'];
  }
  if (profile.backupRequired === false && profile.outageFrequency === 'none') {
    return ['solar_ongrid'];
  }
  return all;
}

function rankArchitectures(pool, profile) {
  return pool.map(cand => {
    let backupFitScore = 1.0;
    if (profile.backupRequired) {
      if (cand.type === 'solar_ongrid') {
        backupFitScore = 0.0;
      }
    }
    
    let costFitScore = 1.0;
    if (profile.budgetIRR) {
       if (cand.costEstimate > profile.budgetIRR) {
         costFitScore = Math.max(0, 1 - ((cand.costEstimate - profile.budgetIRR) / profile.budgetIRR));
       } else {
         const slack = (profile.budgetIRR - cand.costEstimate) / profile.budgetIRR;
         if (slack > 0.5) {
            costFitScore = 1 - (slack * 0.5);
         }
       }
    }
    
    let paybackScore = 0.5; // Do not compute this yet
    
    let reliabilityScore = 0.8;
    if (profile.outageFrequency === 'frequent') {
      if (cand.type.includes('generator')) reliabilityScore = 1.0;
      if (cand.type === 'solar_ongrid') reliabilityScore = 0.2;
    }
    
    const score = (backupFitScore * SCORING_WEIGHTS.backupFit) + (costFitScore * SCORING_WEIGHTS.costFit) + (paybackScore * SCORING_WEIGHTS.payback) + (reliabilityScore * SCORING_WEIGHTS.reliability);
    return { ...cand, score };
  }).sort((a, b) => b.score - a.score);
}

export default async function handler(req, res) {
  const profile = req.body.energyProfile;
  if (!profile) {
    return res.status(400).json({ error: "missing energyProfile" });
  }

  const candidates = selectCandidateArchitectures(profile);
  
  let dailyKwh = 0;
  if (profile.monthlyConsumptionKwh) {
    dailyKwh = profile.monthlyConsumptionKwh / 30;
  } else if (profile.selectedAppliances && profile.selectedAppliances.length > 0) {
    dailyKwh = calculateDailyConsumption(profile.selectedAppliances, profile.locationType || 'residential');
  }

  const evaluated = await Promise.all(candidates.map(async (type) => {
    let solarPart = null;
    let generatorPart = null;
    let batteryPart = null;
    
    let costEstimate = 0;

    if (type.includes('solar')) {
      solarPart = calculateSolarSizing(dailyKwh, profile.usableArea || profile.totalArea || 100);
      costEstimate += solarPart.finalKwp * 300_000_000;
    }
    
    if (type.includes('generator')) {
      const isThreePhase = profile.locationType === 'industrial' || profile.locationType === 'factory';
      generatorPart = calculateGeneratorSizing(profile.selectedAppliances || [], isThreePhase);
      costEstimate += generatorPart.finalKva * 150_000_000;
    }
    
    if (type.includes('hybrid') || type.includes('offgrid') || type.includes('battery')) {
      const backupHours = profile.backupHours || 2;
      batteryPart = calculatePowerbankSizing(profile.selectedAppliances || [], backupHours);
      costEstimate += batteryPart.capacityKwh * 400_000_000;
    }

    return { type, solarPart, generatorPart, batteryPart, costEstimate };
  }));

  const withinBudget = profile.budgetIRR
    ? evaluated.filter(e => e.costEstimate <= profile.budgetIRR * 1.15)
    : evaluated;
  const pool = withinBudget.length > 0 ? withinBudget : evaluated;

  const ranked = rankArchitectures(pool, profile).slice(0, 3);
  
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      recommendationId: "rec_" + Date.now(),
      assumptions: ["تحلیل مالی دقیق در نسخه بعدی اضافه میشود"],
      solutions: ranked.map((r, idx) => ({
        rank: idx + 1,
        systemType: r.type,
        technicalSummary: { solarPart: r.solarPart, generatorPart: r.generatorPart, batteryPart: r.batteryPart },
        estimatedCostIRR: r.costEstimate,
        score: r.score,
        explanation: "API Key وجود ندارد. این یک توضیح تستی است."
      }))
    });
  }

  // Call Claude
  let claudeExplanation = [];
  try {
    const claudeRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT}` }] },
        contents: [].map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
        }
      }),
    });

    if (claudeRes.ok) {
      const claudeData = await claudeRes.json();
      if (claudeData.error) throw new Error(claudeData.error.message);
    let textContent = claudeData.candidates[0].content.parts[0].text;
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
         claudeExplanation = JSON.parse(jsonMatch[0]);
      } else {
         claudeExplanation = JSON.parse(textContent);
      }
    }
  } catch(e) {
    console.error("Claude api error:", e);
  }

  const solutions = ranked.map((r, idx) => {
    const aiExp = claudeExplanation.find(c => c.systemType === r.type);
    return {
      rank: idx + 1,
      label: idx === 0 ? "بهترین انتخاب" : (idx === 1 ? "انتخاب دوم" : "گزینه جایگزین"),
      systemType: r.type,
      technicalSummary: { solarPart: r.solarPart, generatorPart: r.generatorPart, batteryPart: r.batteryPart },
      estimatedCostIRR: r.costEstimate,
      score: r.score,
      explanation: aiExp ? aiExp.explanation : "شرح در دسترس نیست."
    };
  });

  const recData = {
    recommendationId: "rec_" + Date.now(),
    assumptions: ["تحلیل مالی دقیق در نسخه بعدی اضافه میشود"],
    solutions
  };

  if (db.addRecommendationLog) {
     db.addRecommendationLog({ profile, recommendation: recData });
  }

  return res.status(200).json(recData);
}
