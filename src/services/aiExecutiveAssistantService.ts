import { portfolioAggregationService } from './portfolioAggregationService.js';
import { lifecycleIntelligenceService } from './lifecycleIntelligenceService.js';
import { platformIntelligenceEngine } from './platformIntelligenceEngine.js';
import { portfolioRepository } from '../repositories/portfolioRepository.js';
import { externalCircuitBreakers } from '../reliability/circuitBreaker.js';
import { executeWithTimeout, DEFAULT_TIMEOUTS } from '../reliability/externalClient.js';
import { extractSafeExternalErrorMetadata } from '../reliability/errorRedaction.js';
import { logger } from '../observability/logger.js';

export interface ExecutiveSummaryResponse {
  portfolioId: string;
  portfolioName: string;
  summaryText: string;
  keyHighlights: string[];
  attentionItems: string[];
  verifiedFacts: {
    totalProjects: number;
    knownPlannedCapacityKw: number;
    knownOperationalCapacityKw: number;
    activeContracts: number;
    activeAlerts: number;
    openMaintenanceCases: number;
    stalledProjectsCount: number;
    overdueMilestonesCount: number;
    offlineAssetsCount: number;
  };
  generatedAt: string;
  generatedBy: 'GEMINI_AI' | 'VERIFIED_FACTS_ENGINE';
}

export const aiExecutiveAssistantService = {
  /**
   * Generates an executive summary based exclusively on verified portfolio facts.
   */
  async generateExecutiveSummary(portfolioId: string, customPrompt?: string): Promise<ExecutiveSummaryResponse | null> {
    const portfolio = portfolioRepository.getPortfolioById(portfolioId);
    if (!portfolio) return null;

    const overview = portfolioAggregationService.getPortfolioOverview(portfolioId);
    const lifecycle = lifecycleIntelligenceService.getLifecycleIntelligence(portfolioId);
    const assetIntel = portfolioAggregationService.getAssetPortfolioIntelligence(portfolioId);
    const finIntel = portfolioAggregationService.getFinancialPortfolioView(portfolioId);
    const procIntel = portfolioAggregationService.getProcurementIntelligence(portfolioId);
    const opsIntel = portfolioAggregationService.getOperationsIntelligence(portfolioId);
    const insights = platformIntelligenceEngine.generatePortfolioInsights(portfolioId);

    if (!overview) return null;

    const offlineAssetsCount = (assetIntel?.telemetryBreakdown.notConnected || 0) + (assetIntel?.telemetryBreakdown.dataUnavailable || 0);

    const verifiedFacts = {
      totalProjects: overview.totalProjects,
      knownPlannedCapacityKw: overview.plannedSolarCapacity.knownCapacityKw,
      knownOperationalCapacityKw: overview.operationalCapacity.knownCapacityKw,
      activeContracts: overview.activeContracts,
      activeAlerts: overview.activeAlerts,
      openMaintenanceCases: overview.openMaintenanceCases,
      stalledProjectsCount: lifecycle?.stalledProjects.length || 0,
      overdueMilestonesCount: lifecycle?.overdueMilestones.length || 0,
      offlineAssetsCount
    };

    const keyHighlights: string[] = [
      `پرتفوی '${portfolio.name}' شامل ${overview.totalProjects} پروژه خورشیدی است.`,
      `مجموع ظرفیت برنامه‌ریزی‌شده تأییدشده: ${overview.plannedSolarCapacity.knownCapacityKw.toLocaleString()} کیلووات (از میان ${overview.plannedSolarCapacity.projectsWithKnownCapacity} پروژه دارای داده ثبت‌شده).`,
      `ظرفیت عملیاتی فعال متصل به شبکه: ${overview.operationalCapacity.knownCapacityKw.toLocaleString()} کیلووات در قالب ${overview.totalOperationalAssets} دارایی خورشیدی.`,
      `تعداد قراردادهای فعال اجرایی: ${overview.activeContracts} فقره در حال اجرا.`
    ];

    const attentionItems: string[] = [];
    if (lifecycle && lifecycle.overdueMilestones.length > 0) {
      attentionItems.push(`${lifecycle.overdueMilestones.length} مایلستون اجرایی تاریخ‌گذشته شناسایی شد.`);
    }
    if (lifecycle && lifecycle.stalledProjects.length > 0) {
      attentionItems.push(`${lifecycle.stalledProjects.length} پروژه دچار توقف پیشرفت و فاقد به‌روزرسانی در بازه مجاز شناسایی شد.`);
    }
    if (offlineAssetsCount > 0) {
      attentionItems.push(`${offlineAssetsCount} دارایی عملیاتی داده تله‌متری زنده ارسال نمی‌کنند.`);
    }
    if (overview.openMaintenanceCases > 0) {
      attentionItems.push(`${overview.openMaintenanceCases} مورد تعمیر و نگهداری باز در دست اقدام است.`);
    }
    if (overview.activeAlerts > 0) {
      attentionItems.push(`${overview.activeAlerts} هشدار فعال در تجهیزات خورشیدی ثبت شده است.`);
    }

    let summaryText = '';
    let generatedBy: 'GEMINI_AI' | 'VERIFIED_FACTS_ENGINE' = 'VERIFIED_FACTS_ENGINE';

    // Attempt Gemini AI if API key is provided
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        
        const systemPrompt = `You are Hooshyar Energy's Executive Solar Portfolio AI Assistant.
Analyze ONLY the verified factual data provided below.
STRICT RULES:
1. Do NOT invent any numbers, percentages, projects, or dates.
2. If any metric is missing or unknown, explicitly state that it is unavailable.
3. Keep the tone professional, objective, and executive-ready.
4. Output in Persian (Farsi).
5. Never alter project states.`;

        const contextData = {
          portfolioName: portfolio.name,
          verifiedFacts,
          keyHighlights,
          attentionItems,
          insightsSummary: insights.map(i => ({ title: i.title, severity: i.severity, message: i.message })),
          userPrompt: customPrompt || 'گزارش تحلیلی و مدیریتی وضعیت جاری پرتفوی خورشیدی را ارائه دهید.'
        };

        const prompt = `${systemPrompt}\n\nداده‌های واقعی پرتفوی:\n${JSON.stringify(contextData, null, 2)}`;
        
        const response = await externalCircuitBreakers.geminiAi.execute(async () => {
          return await executeWithTimeout(
            () => ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt
            }),
            'GEMINI_AI',
            DEFAULT_TIMEOUTS.GEMINI_AI || 15000
          );
        });

        if (response && response.text) {
          summaryText = response.text;
          generatedBy = 'GEMINI_AI';
        }
      } catch (err: any) {
        const safeMeta = extractSafeExternalErrorMetadata('GEMINI_AI', err);
        logger.warn(`Executive summary AI generation failed; using deterministic verified facts engine`, {
          service: 'EXECUTIVE_ASSISTANT',
          event: 'AI_FALLBACK_TO_FACTS',
          metadata: {
            portfolioId,
            provider: safeMeta.provider,
            httpStatus: safeMeta.httpStatus,
            errorCategory: safeMeta.errorCategory,
            isTransient: safeMeta.isTransient
          }
        });
        // Fallback gracefully to verified template
        generatedBy = 'VERIFIED_FACTS_ENGINE';
      }
    }

    if (!summaryText) {
      summaryText = `گزارش مدیریتی پرتفوی '${portfolio.name}':
این پرتفوی در حال حاضر مشتمل بر ${overview.totalProjects} پروژه خورشیدی با مجموع ظرفیت برنامه‌ریزی‌شده مشخص ${overview.plannedSolarCapacity.knownCapacityKw.toLocaleString()} کیلووات و ظرفیت عملیاتی ${overview.operationalCapacity.knownCapacityKw.toLocaleString()} کیلووات است.
در بخش عملیات، ${overview.totalOperationalAssets} نیروگاه به شبکه متصل بوده و ${overview.activeContracts} قرارداد اجرایی معتبر ثبت گردیده است.
${attentionItems.length > 0 ? `نکات نیازمند توجه ویژه شامل ${attentionItems.join(' و ')} می‌باشد.` : 'کلیه پروژه‌ها و دارایی‌ها در وضعیت پایدار و فاقد ریسک بحرانی فوری قرار دارند.'}`;
    }

    return {
      portfolioId: portfolio.id,
      portfolioName: portfolio.name,
      summaryText,
      keyHighlights,
      attentionItems,
      verifiedFacts,
      generatedAt: new Date().toISOString(),
      generatedBy
    };
  }
};
