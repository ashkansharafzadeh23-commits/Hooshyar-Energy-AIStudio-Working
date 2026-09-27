import { FinancingRequest, FinancingApplication, FinancialPartnerProfile, FinancingPartner, FinancingProduct, FinancialPartnerMatch, PartnerMatchingResult, PartnerMatchEligibility } from '../types/financing.js';
import { EnergyProject } from '../types/project.js';

export const financialPartnerMatchingService = {
  /**
   * Deterministic Partner Matching Engine
   * Evaluates project & application against partner's explicit criteria:
   * 1. financing amount
   * 2. project capacity
   * 3. project location
   * 4. project stage
   * 5. financing type
   * 6. equity requirement
   * 7. active status
   */
  matchApplicationWithPartners: (
    app: Partial<FinancingApplication> | Partial<FinancingRequest>,
    project: EnergyProject | null,
    partners: (FinancingPartner | FinancialPartnerProfile)[]
  ): PartnerMatchingResult[] => {
    const requestedAmount = (app as any).financingRequested || (app as any).requestedAmount || 0;
    const totalCost = app.totalProjectCost || 0;
    const ownerEquity = app.ownerEquity !== undefined ? app.ownerEquity : 0;
    const equityPercent = totalCost > 0 ? (ownerEquity / totalCost) * 100 : 0;
    const capacityKw = project?.targetCapacityKw || (project as any)?.capacityKw || 0;
    const province = project?.location?.province;
    const stage = project?.status;
    const financingType = app.financingType;

    return partners.map(partner => {
      const partnerName = (partner as any).name || (partner as any).displayName || 'نهاد مالی';
      const partnerCategory = (partner as any).category || (partner as any).partnerType || 'OTHER';

      // 1. Amount Criteria: explicit values only, never invent defaults
      const minAmount = (partner as any).minimumAmount !== undefined && (partner as any).minimumAmount !== null
        ? (partner as any).minimumAmount
        : ((partner as any).minimumFinancingAmount !== undefined && (partner as any).minimumFinancingAmount !== null
            ? (partner as any).minimumFinancingAmount
            : undefined);
      const maxAmount = (partner as any).maximumAmount !== undefined && (partner as any).maximumAmount !== null
        ? (partner as any).maximumAmount
        : ((partner as any).maximumFinancingAmount !== undefined && (partner as any).maximumFinancingAmount !== null
            ? (partner as any).maximumFinancingAmount
            : undefined);

      // 2. Location Criteria: explicit arrays only, never fabricate ['ALL']
      const rawLocations = (partner as any).supportedLocations !== undefined
        ? (partner as any).supportedLocations
        : (partner as any).supportedProvinces;
      const supportedLocations: string[] | undefined = Array.isArray(rawLocations) ? rawLocations : undefined;

      // 3. Stage Criteria: explicit arrays only, never fabricate ['ALL']
      const rawStages = (partner as any).supportedProjectStages !== undefined
        ? (partner as any).supportedProjectStages
        : (partner as any).eligibleProjectStages;
      const supportedStages: string[] | undefined = Array.isArray(rawStages) ? rawStages : undefined;

      // 4. Financing Type Criteria: explicit arrays only, never fabricate ['PROJECT_LOAN']
      const rawTypes = (partner as any).financingTypes !== undefined
        ? (partner as any).financingTypes
        : ((partner as any).supportedFinancingProducts !== undefined
            ? (partner as any).supportedFinancingProducts
            : (partner as any).supportedFinancingTypes);
      const supportedTypes: string[] | undefined = Array.isArray(rawTypes) ? rawTypes : undefined;

      // 5. Equity Requirement: explicit values only, never default to 20% or 0%
      const minEquity = (partner as any).minimumEquityPercent !== undefined && (partner as any).minimumEquityPercent !== null
        ? (partner as any).minimumEquityPercent 
        : ((partner as any).minimumEquityContributionPercent !== undefined && (partner as any).minimumEquityContributionPercent !== null
            ? (partner as any).minimumEquityContributionPercent
            : ((partner as any).minimumEquityRatioPercent !== undefined && (partner as any).minimumEquityRatioPercent !== null
                ? (partner as any).minimumEquityRatioPercent
                : undefined));

      // 6. Capacity Limits: explicit values only, never invent 0 or arbitrary capacities
      const minCapacity = (partner as any).minimumProjectCapacityKw !== undefined && (partner as any).minimumProjectCapacityKw !== null
        ? (partner as any).minimumProjectCapacityKw
        : undefined;
      const maxCapacity = (partner as any).maximumProjectCapacityKw !== undefined && (partner as any).maximumProjectCapacityKw !== null
        ? (partner as any).maximumProjectCapacityKw
        : undefined;

      // 7. Tenor & Collateral Criteria: explicit values only
      const maxTenor = (partner as any).maximumTenorMonths !== undefined && (partner as any).maximumTenorMonths !== null
        ? (partner as any).maximumTenorMonths
        : undefined;
      const collateralRequired = (partner as any).collateralRequired !== undefined && (partner as any).collateralRequired !== null
        ? (partner as any).collateralRequired
        : ((partner as any).requiresCollateral !== undefined && (partner as any).requiresCollateral !== null
            ? (partner as any).requiresCollateral
            : undefined);

      const isActive = (partner as any).activeStatus === 'ACTIVE' || (partner as any).status === 'ACTIVE' || (partner as any).isActive === true;

      const reasons: string[] = [];
      let isEligible = true;
      let isPotentiallyEligible = false;

      // 0. Active Status
      if (!isActive) {
        isEligible = false;
        reasons.push('نهاد مالی در حال حاضر غیرفعال است یا پذیرش پرونده جدید ندارد');
      }

      // 1. Financing Amount
      let amountEligible = true;
      let amountSpecified = false;
      let amountMsg = '';
      if (minAmount !== undefined && minAmount > 0 && requestedAmount < minAmount) {
        amountSpecified = true;
        amountEligible = false;
        isEligible = false;
        amountMsg = `مبلغ درخواستی (${(requestedAmount / 10000000).toLocaleString('fa-IR')} م.ت) کمتر از حداقل پذیرش (${(minAmount / 10000000).toLocaleString('fa-IR')} م.ت) است`;
        reasons.push(amountMsg);
      } else if (maxAmount !== undefined && maxAmount > 0 && requestedAmount > maxAmount) {
        amountSpecified = true;
        amountEligible = false;
        isEligible = false;
        amountMsg = `مبلغ درخواستی (${(requestedAmount / 10000000).toLocaleString('fa-IR')} م.ت) بیشتر از سقف تسهیلات (${(maxAmount / 10000000).toLocaleString('fa-IR')} م.ت) است`;
        reasons.push(amountMsg);
      } else if ((minAmount !== undefined && minAmount > 0) || (maxAmount !== undefined && maxAmount > 0)) {
        amountSpecified = true;
        amountMsg = 'میزان سرمایه درخواستی در محدوده مجاز این نهاد مالی است';
        reasons.push(amountMsg);
      } else {
        amountSpecified = false;
        amountMsg = 'سقف یا حداقل مبلغ تسهیلات توسط این نهاد مالی مشخص نشده است (نامشخص)';
        reasons.push(amountMsg);
      }

      // 2. Project Capacity
      let capacityEligible = true;
      let capacitySpecified = false;
      let capacityMsg = '';
      if (minCapacity !== undefined && minCapacity > 0 && capacityKw < minCapacity) {
        capacitySpecified = true;
        capacityEligible = false;
        isEligible = false;
        capacityMsg = `ظرفیت نیروگاه (${capacityKw} kW) کمتر از حداقل مجاز این نهاد (${minCapacity} kW) است`;
        reasons.push(capacityMsg);
      } else if (maxCapacity !== undefined && maxCapacity > 0 && capacityKw > maxCapacity) {
        capacitySpecified = true;
        capacityEligible = false;
        isEligible = false;
        capacityMsg = `ظرفیت نیروگاه (${capacityKw} kW) بیشتر از سقف مجاز این نهاد (${maxCapacity} kW) است`;
        reasons.push(capacityMsg);
      } else if ((minCapacity !== undefined && minCapacity > 0) || (maxCapacity !== undefined && maxCapacity > 0)) {
        capacitySpecified = true;
        capacityMsg = 'ظرفیت نامی پروژه با ضوابط نهاد مالی همخوانی دارد';
        reasons.push(capacityMsg);
      } else {
        capacitySpecified = false;
        capacityMsg = 'محدودیت ظرفیت نیروگاه توسط نهاد مالی اعلام نشده است (نامشخص)';
        reasons.push(capacityMsg);
      }

      // 3. Project Location
      let locationEligible = true;
      let locationSpecified = false;
      let locationMsg = '';
      if (supportedLocations !== undefined && supportedLocations.length > 0) {
        locationSpecified = true;
        if (!supportedLocations.includes('ALL') && province && !supportedLocations.includes(province)) {
          locationEligible = false;
          isEligible = false;
          locationMsg = `استان ${province} در حوزه جغرافیایی تحت پوشش این نهاد مالی نیست`;
          reasons.push(locationMsg);
        } else {
          locationMsg = 'محل اجرای پروژه در محدوده جغرافیایی تحت پوشش قرار دارد';
          reasons.push(locationMsg);
        }
      } else {
        locationSpecified = false;
        locationMsg = 'محدودیت جغرافیایی توسط این نهاد مالی اعلام نشده است (نامشخص)';
        reasons.push(locationMsg);
      }

      // 4. Project Stage
      let stageEligible = true;
      let stageSpecified = false;
      let stageMsg = '';
      if (supportedStages !== undefined && supportedStages.length > 0) {
        stageSpecified = true;
        if (!supportedStages.includes('ALL') && stage && !supportedStages.includes(stage)) {
          stageEligible = false;
          isEligible = false;
          stageMsg = `مرحله فعلی پروژه (${stage}) در لیست مراحل مورد پذیرش این نهاد قرار ندارد`;
          reasons.push(stageMsg);
        } else if (!supportedStages.includes('ALL') && !stage) {
          stageMsg = 'مرحله فعلی پروژه مشخص نشده است (نامشخص)';
          reasons.push(stageMsg);
        } else {
          stageMsg = 'مرحله آمادگی پروژه منطبق با الزامات ورود نهاد مالی است';
          reasons.push(stageMsg);
        }
      } else {
        stageSpecified = false;
        stageMsg = 'مراحل مجاز پروژه توسط این نهاد مالی اعلام نشده است (نامشخص)';
        reasons.push(stageMsg);
      }

      // 5. Financing Type
      let typeEligible = true;
      let typeSpecified = false;
      let typeMsg = '';
      if (supportedTypes !== undefined && supportedTypes.length > 0) {
        typeSpecified = true;
        if (!supportedTypes.includes('ALL') && financingType && !supportedTypes.includes(financingType)) {
          typeEligible = false;
          isEligible = false;
          typeMsg = `نوع تأمین مالی (${financingType}) توسط این نهاد مالی ارائه نمی‌شود`;
          reasons.push(typeMsg);
        } else if (!supportedTypes.includes('ALL') && !financingType) {
          typeMsg = 'نوع تأمین مالی درخواستی مشخص نشده است (نامشخص)';
          reasons.push(typeMsg);
        } else {
          typeMsg = `محصول تأمین مالی (${financingType || 'درخواستی'}) در سبد خدمات این نهاد فعال است`;
          reasons.push(typeMsg);
        }
      } else {
        typeSpecified = false;
        typeMsg = 'انواع محصولات تسهیلاتی مجاز توسط این نهاد مالی مشخص نشده است (نامشخص)';
        reasons.push(typeMsg);
      }

      // 6. Equity Requirement
      let equityEligible = true;
      let equitySpecified = false;
      let equityMsg = '';
      if (minEquity !== undefined) {
        equitySpecified = true;
        if (equityPercent < minEquity) {
          if (equityPercent >= minEquity - 5) {
            equityEligible = false;
            isPotentiallyEligible = true;
            equityMsg = `سهم آورده کارفرما (${equityPercent.toFixed(1)}٪) اندکی کمتر از حداقل موردنیاز (${minEquity}٪) است (قابل مذاکره مشروط)`;
            reasons.push(equityMsg);
          } else {
            equityEligible = false;
            isEligible = false;
            equityMsg = `سهم آورده کارفرما (${equityPercent.toFixed(1)}٪) کمتر از کف الزامی نهاد (${minEquity}٪) است`;
            reasons.push(equityMsg);
          }
        } else {
          equityMsg = `سهم آورده کارفرما (${equityPercent.toFixed(1)}٪) حداقل سهم مصوب (${minEquity}٪) را پوشش می‌دهد`;
          reasons.push(equityMsg);
        }
      } else {
        equitySpecified = false;
        equityMsg = 'الزام حداقل آورده نقدی توسط این نهاد مالی مشخص نشده است (نامشخص)';
        reasons.push(equityMsg);
      }

      // 7. Tenor & Collateral
      const requestedTenor = (app as any).requestedTenorMonths;
      let tenorEligible = true;
      let tenorSpecified = false;
      let tenorMsg = '';
      if (maxTenor !== undefined && maxTenor > 0) {
        tenorSpecified = true;
        if (requestedTenor && requestedTenor > maxTenor) {
          tenorEligible = false;
          isEligible = false;
          tenorMsg = `دوره بازپرداخت درخواستی (${requestedTenor} ماه) بیشتر از سقف مجاز نهاد (${maxTenor} ماه) است`;
          reasons.push(tenorMsg);
        } else {
          tenorMsg = `دوره بازپرداخت درخواستی در محدوده مجاز نهاد مالی (${maxTenor} ماه) است`;
          reasons.push(tenorMsg);
        }
      } else {
        tenorSpecified = false;
        tenorMsg = 'سقف دوره بازپرداخت توسط این نهاد مالی اعلام نشده است (نامشخص)';
        reasons.push(tenorMsg);
      }

      let collateralEligible = true;
      let collateralSpecified = false;
      let collateralMsg = '';
      if (collateralRequired !== undefined) {
        collateralSpecified = true;
        if (collateralRequired === true && (app as any).collateralAvailable === false) {
          collateralEligible = false;
          isPotentiallyEligible = true;
          collateralMsg = 'این نهاد مالی نیازمند تودیع وثیقه است، اما متقاضی هنوز وثیقه معرفی نکرده است';
          reasons.push(collateralMsg);
        } else {
          collateralMsg = 'شرایط وثیقه و تضامین منطبق است';
          reasons.push(collateralMsg);
        }
      } else {
        collateralSpecified = false;
        collateralMsg = 'الزامات وثیقه توسط این نهاد مالی اعلام نشده است (نامشخص)';
        reasons.push(collateralMsg);
      }

      let eligibilityStatus: 'ELIGIBLE' | 'POTENTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE' = 'NOT_ELIGIBLE';
      if (isEligible && amountEligible && capacityEligible && locationEligible && stageEligible && typeEligible && equityEligible && tenorEligible) {
        eligibilityStatus = 'ELIGIBLE';
      } else if (isPotentiallyEligible && amountEligible && locationEligible && typeEligible) {
        eligibilityStatus = 'POTENTIALLY_ELIGIBLE';
      } else {
        eligibilityStatus = 'NOT_ELIGIBLE';
      }

      return {
        partnerId: partner.id,
        partnerName,
        category: partnerCategory as any,
        eligibilityStatus,
        reasons,
        details: {
          amountFit: { eligible: amountEligible, specified: amountSpecified, message: amountMsg },
          capacityFit: { eligible: capacityEligible, specified: capacitySpecified, message: capacityMsg },
          locationFit: { eligible: locationEligible, specified: locationSpecified, message: locationMsg },
          stageFit: { eligible: stageEligible, specified: stageSpecified, message: stageMsg },
          financingTypeFit: { eligible: typeEligible, specified: typeSpecified, message: typeMsg },
          equityFit: { eligible: equityEligible, specified: equitySpecified, message: equityMsg },
          tenorFit: { eligible: tenorEligible, specified: tenorSpecified, message: tenorMsg },
          collateralFit: { eligible: collateralEligible, specified: collateralSpecified, message: collateralMsg }
        }
      };
    });
  },

  /**
   * Backward-compatibility wrapper for legacy matchRequestWithPartners
   */
  matchRequestWithPartners: (
    request: FinancingRequest,
    project: EnergyProject | null,
    partners: (FinancialPartnerProfile | FinancingPartner)[],
    products: FinancingProduct[]
  ): FinancialPartnerMatch[] => {
    const modernResults = financialPartnerMatchingService.matchApplicationWithPartners(request, project, partners);

    return modernResults.map(res => {
      const partner = partners.find(p => p.id === res.partnerId);
      const partnerProducts = products.filter(p => p.financialPartnerProfileId === res.partnerId && p.status === 'ACTIVE');
      const matchedProduct = partnerProducts[0];

      let matchScore = 50;
      if (res.eligibilityStatus === 'ELIGIBLE') matchScore = 90;
      else if (res.eligibilityStatus === 'POTENTIALLY_ELIGIBLE') matchScore = 70;
      else matchScore = 30;

      return {
        id: `MATCH-${request.id}-${res.partnerId}`,
        financingRequestId: request.id,
        financialPartnerProfileId: res.partnerId,
        financingProductId: matchedProduct?.id,
        matchScore,
        scoreBreakdown: {
          amountFit: res.details.amountFit.specified === false ? 10 : (res.details.amountFit.eligible ? 20 : 0),
          projectTypeFit: 15,
          technologyFit: 10,
          locationFit: res.details.locationFit.specified === false ? 5 : (res.details.locationFit.eligible ? 10 : 0),
          stageFit: res.details.stageFit.specified === false ? 5 : (res.details.stageFit.eligible ? 10 : 0),
          readinessFit: 15,
          tenorFit: res.details.tenorFit?.specified === false ? 5 : (res.details.tenorFit?.eligible ? 10 : 0),
          revenueModelFit: 5,
          collateralFit: res.details.collateralFit?.specified === false ? 3 : (res.details.collateralFit?.eligible ? 5 : 0)
        },
        eligibilityStatus: res.eligibilityStatus,
        eligibility: res.eligibilityStatus,
        reasons: res.reasons,
        algorithmVersion: '2.0-deterministic',
        status: 'PROPOSED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
  }
};
