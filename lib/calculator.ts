// ====================================
// 계산 유틸리티 함수들
// ====================================

import type {
  PropertyType,
  PropertyInfo,
  BidInfo,
  SaleInfo,
  AcquisitionCosts,
  HoldingCosts,
  SaleCosts,
  TaxInfo,
  VatInfo,
  CalculationResult,
  ScenarioRow,
  LeverageAnalysis,
  TaxComparison,
} from '@/types';

// ====================================
// 금액 포맷 유틸리티
// ====================================

export const formatCurrency = (amount: number): string => {
  if (isNaN(amount) || amount === 0) return '0';
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
};

export const formatCurrencyKorean = (amount: number): string => {
  if (isNaN(amount) || amount === 0) return '0원';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  const eok = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  const rest = abs % 10_000;

  let result = '';
  if (eok > 0) result += `${formatCurrency(eok)}억 `;
  if (man > 0) result += `${formatCurrency(man)}만 `;
  if (rest > 0) result += `${formatCurrency(rest)}`;

  return `${sign}${result.trim()}원`;
};

export const formatPercent = (rate: number, digits = 1): string => {
  if (isNaN(rate)) return '0%';
  return `${rate.toFixed(digits)}%`;
};

export const parseNumber = (value: string): number => {
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
};

// ====================================
// 유찰 횟수에 따른 최저입찰가 계산
// ====================================
export const calcMinimumBidPrice = (
  appraisalValue: number,
  failedBidCount: number,
  depreciationRate: number // 20 또는 30
): number => {
  const rate = 1 - depreciationRate / 100;
  return appraisalValue * Math.pow(rate, failedBidCount);
};

// ====================================
// 취득세 계산 (매매사업자 기준)
// ====================================
export const calcAcquisitionTaxRate = (
  propertyType: PropertyType,
  bidPrice: number,
  areaType: 'under85' | 'over85'
): { rate: number; breakdown: { acquisitionTax: number; localEduTax: number; ruralSpecialTax: number } } => {
  const isResidential = ['apartment', 'villa', 'house', 'officetel'].includes(propertyType);

  if (!isResidential) {
    // 상가/근생/공장/토지: 4.6%
    const base = bidPrice * 0.04;
    const localEdu = base * 0.1; // 지방교육세 4% × 10% = 0.4%
    const rural = bidPrice * 0.002; // 농어촌특별세 0.2%
    return {
      rate: 4.6,
      breakdown: {
        acquisitionTax: base,
        localEduTax: localEdu,
        ruralSpecialTax: rural,
      },
    };
  }

  // 주거용 (매매사업자 중과 배제)
  // 가격 구간별 세율 결정
  let baseRate: number;

  if (bidPrice <= 600_000_000) {
    // 6억 이하
    baseRate = 0.01; // 1%
  } else if (bidPrice <= 900_000_000) {
    // 6억 초과 ~ 9억 이하: 슬라이딩 세율
    // 세율 = (취득가액 × 2/3억 - 3) / 100
    const slidingRate = ((bidPrice / 100_000_000) * (2 / 3) - 3) / 100;
    baseRate = Math.max(0.01, Math.min(0.03, slidingRate));
  } else {
    // 9억 초과: 3%
    baseRate = 0.03;
  }

  const acquisitionTax = bidPrice * baseRate;

  // 지방교육세: 취득세 × 10%
  const localEdu = acquisitionTax * 0.1;

  // 농어촌특별세
  let rural = 0;
  if (areaType === 'over85') {
    // 85㎡ 초과: 0.2%
    rural = bidPrice * 0.002;
  }
  // 85㎡ 이하: 농어촌특별세 면제

  const totalRate = ((acquisitionTax + localEdu + rural) / bidPrice) * 100;

  return {
    rate: parseFloat(totalRate.toFixed(2)),
    breakdown: {
      acquisitionTax,
      localEduTax: localEdu,
      ruralSpecialTax: rural,
    },
  };
};

export const calcAcquisitionTax = (
  propertyType: PropertyType,
  bidPrice: number,
  areaType: 'under85' | 'over85'
): number => {
  const { breakdown } = calcAcquisitionTaxRate(propertyType, bidPrice, areaType);
  return breakdown.acquisitionTax + breakdown.localEduTax + breakdown.ruralSpecialTax;
};

// ====================================
// 인지대 계산 (물건가액 기준)
// ====================================
export const calcStampDuty = (price: number): number => {
  if (price < 10_000_000) return 50_000;
  if (price < 30_000_000) return 100_000;
  if (price < 50_000_000) return 150_000;
  if (price < 100_000_000) return 200_000;
  if (price < 300_000_000) return 300_000;
  if (price < 500_000_000) return 400_000;
  if (price < 1_000_000_000) return 500_000;
  if (price < 3_000_000_000) return 600_000;
  return 750_000;
};

// ====================================
// 중개보수 계산
// ====================================
export const calcAgentCommissionRate = (salePrice: number): number => {
  if (salePrice < 50_000_000) return 0.006;       // 0.6%
  if (salePrice < 200_000_000) return 0.005;      // 0.5%
  if (salePrice < 900_000_000) return 0.004;      // 0.4%
  if (salePrice < 1_200_000_000) return 0.005;    // 0.5%
  if (salePrice < 1_500_000_000) return 0.006;    // 0.6%
  return 0.007;                                   // 0.7%
};

export const calcAgentCommission = (salePrice: number, saleMethod: string): number => {
  if (saleMethod === 'direct') return 0;

  const rate = calcAgentCommissionRate(salePrice);
  const calculated = salePrice * rate;

  // 상한선 적용
  if (salePrice < 50_000_000) return Math.min(calculated, 250_000);
  if (salePrice < 200_000_000) return Math.min(calculated, 800_000);

  return calculated;
};

// ====================================
// 재산세 계산 (간략화)
// ====================================
export const calcPropertyTax = (
  propertyType: PropertyType,
  bidPrice: number,
  holdingMonths: number
): number => {
  let annualTax: number;
  const isResidential = ['apartment', 'villa', 'house', 'officetel'].includes(propertyType);

  if (isResidential) {
    // 주택: 공시가격 × 60% (과표) × 세율
    const taxBase = bidPrice * 0.6;
    if (taxBase <= 60_000_000) {
      annualTax = taxBase * 0.001;
    } else if (taxBase <= 150_000_000) {
      annualTax = 60_000 + (taxBase - 60_000_000) * 0.0015;
    } else if (taxBase <= 300_000_000) {
      annualTax = 195_000 + (taxBase - 150_000_000) * 0.0025;
    } else {
      annualTax = 570_000 + (taxBase - 300_000_000) * 0.004;
    }
  } else {
    // 상가/토지 등: 별도합산 기준 간략화
    annualTax = bidPrice * 0.004; // 0.4% 대략
  }

  // 보유 기간 안분
  return (annualTax * holdingMonths) / 12;
};

// ====================================
// 대출 이자 계산
// ====================================
export const calcLoanInterest = (
  loanAmount: number,
  annualRate: number, // %
  holdingMonths: number
): number => {
  return loanAmount * (annualRate / 100) * (holdingMonths / 12);
};

// ====================================
// 종합소득세 계산
// ====================================
export const calcComprehensiveIncomeTax = (taxBase: number): number => {
  if (taxBase <= 0) return 0;

  if (taxBase <= 14_000_000) return taxBase * 0.06;
  if (taxBase <= 50_000_000) return taxBase * 0.15 - 1_260_000;
  if (taxBase <= 88_000_000) return taxBase * 0.24 - 5_760_000;
  if (taxBase <= 150_000_000) return taxBase * 0.35 - 15_440_000;
  if (taxBase <= 300_000_000) return taxBase * 0.38 - 19_940_000;
  if (taxBase <= 500_000_000) return taxBase * 0.40 - 25_940_000;
  if (taxBase <= 1_000_000_000) return taxBase * 0.42 - 35_940_000;
  return taxBase * 0.45 - 65_940_000;
};

// ====================================
// 개인 양도소득세 계산 (비교용)
// ====================================
export const calcCapitalGainsTax = (
  profit: number,
  holdingMonths: number
): number => {
  if (profit <= 0) return 0;

  const holdingYears = holdingMonths / 12;

  // 기본공제 250만원
  const basicDeduction = 2_500_000;
  const taxBase = Math.max(0, profit - basicDeduction);

  // 단기 (1년 미만) vs 장기
  if (holdingYears < 1) {
    // 1년 미만 단기: 70%
    return taxBase * 0.70;
  } else if (holdingYears < 2) {
    // 1~2년: 60%
    return taxBase * 0.60;
  } else {
    // 2년 이상: 일반과세 (6~45%)
    if (taxBase <= 14_000_000) return taxBase * 0.06;
    if (taxBase <= 50_000_000) return taxBase * 0.15 - 1_260_000;
    if (taxBase <= 88_000_000) return taxBase * 0.24 - 5_760_000;
    if (taxBase <= 150_000_000) return taxBase * 0.35 - 15_440_000;
    if (taxBase <= 300_000_000) return taxBase * 0.38 - 19_940_000;
    if (taxBase <= 500_000_000) return taxBase * 0.40 - 25_940_000;
    if (taxBase <= 1_000_000_000) return taxBase * 0.42 - 35_940_000;
    return taxBase * 0.45 - 65_940_000;
  }
};

// ====================================
// 취득비용 합계
// ====================================
export const calcAcquisitionCostTotal = (costs: AcquisitionCosts): number => {
  const eviction =
    costs.evictionCost.movingFee +
    costs.evictionCost.litigationFee +
    costs.evictionCost.enforcementFee;

  const customTotal = costs.customItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    costs.acquisitionTax +
    costs.courtDepositInterestLoss +
    costs.stampDuty +
    costs.deliveryFee +
    costs.registrationLicenseTax +
    costs.localEducationTax +
    costs.courtRevenuestamp +
    costs.registrationFee +
    costs.legalScrivenerFee +
    eviction +
    costs.unpaidManagementFee +
    costs.loanInterest +
    costs.loanSetupFee +
    customTotal
  );
};

// ====================================
// 보유비용 합계
// ====================================
export const calcHoldingCostTotal = (
  costs: HoldingCosts,
  holdingMonths: number
): number => {
  const repairTotal = costs.repairCosts.reduce((sum, item) => sum + item.amount, 0);
  const customTotal = costs.customItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    costs.propertyTax +
    costs.comprehensiveRealEstateTax +
    costs.maintenanceFeeMonthly * holdingMonths +
    repairTotal +
    costs.insuranceFee +
    customTotal
  );
};

// ====================================
// 매도비용 합계
// ====================================
export const calcSaleCostTotal = (costs: SaleCosts): number => {
  const customTotal = costs.customItems.reduce((sum, item) => sum + item.amount, 0);
  return costs.agentCommission + costs.cancelRegistrationFee + customTotal;
};

// ====================================
// 세금 계산 (매매사업자)
// ====================================
export const calcTaxes = (
  taxInfo: TaxInfo,
  bidPrice: number,
  salePrice: number,
  acquisitionCosts: AcquisitionCosts,
  holdingCosts: HoldingCosts,
  holdingMonths: number,
  saleCosts: SaleCosts
): { comprehensiveIncomeTax: number; localIncomeTax: number; tradingProfit: number; totalDeductible: number; taxBase: number } => {
  const tradingProfit = salePrice - bidPrice;

  // 비용처리 합계 계산
  let totalDeductible = 0;
  const d = taxInfo.deductibleItems;

  if (d.acquisitionTax) totalDeductible += acquisitionCosts.acquisitionTax;
  if (d.legalScrivenerFee) totalDeductible += acquisitionCosts.legalScrivenerFee;
  if (d.registrationFee) {
    totalDeductible +=
      acquisitionCosts.registrationLicenseTax +
      acquisitionCosts.localEducationTax +
      acquisitionCosts.courtRevenuestamp +
      acquisitionCosts.stampDuty +
      acquisitionCosts.registrationFee;
  }
  if (d.evictionCost) {
    totalDeductible +=
      acquisitionCosts.evictionCost.movingFee +
      acquisitionCosts.evictionCost.litigationFee +
      acquisitionCosts.evictionCost.enforcementFee;
  }
  if (d.unpaidManagementFee) totalDeductible += acquisitionCosts.unpaidManagementFee;
  if (d.loanInterest) totalDeductible += acquisitionCosts.loanInterest;
  if (d.repairCosts) {
    totalDeductible += holdingCosts.repairCosts.reduce((sum, item) => sum + item.amount, 0);
  }
  if (d.agentCommission) totalDeductible += saleCosts.agentCommission;
  if (d.propertyTax) totalDeductible += holdingCosts.propertyTax;
  if (d.vehicleExpense) totalDeductible += Math.min(taxInfo.vehicleExpense, 15_000_000);
  if (d.communicationFee) totalDeductible += taxInfo.communicationFee;
  if (d.officeRent) totalDeductible += taxInfo.officeRent;
  if (d.advertisingFee) totalDeductible += taxInfo.advertisingFee;

  const customBusinessExpTotal = taxInfo.customBusinessExpenses
    .filter((item) => item.included)
    .reduce((sum, item) => sum + item.amount, 0);
  totalDeductible += customBusinessExpTotal;

  // 과세표준 = 매매차익 - 비용처리 합계 - 기본공제 + 기존 소득 합산
  const taxBase = Math.max(
    0,
    tradingProfit - totalDeductible - taxInfo.basicDeduction + taxInfo.existingIncome
  );

  const comprehensiveIncomeTax = calcComprehensiveIncomeTax(taxBase);
  const localIncomeTax = comprehensiveIncomeTax * 0.1;

  return {
    comprehensiveIncomeTax,
    localIncomeTax,
    tradingProfit,
    totalDeductible,
    taxBase,
  };
};

// ====================================
// VAT (부가가치세) 계산
// ====================================

/**
 * 물건 종류 + 면적에 따라 부가가치세 과세 대상 여부 판단
 * - 주거용(아파트/빌라/다세대/단독) 85㎡ 초과: 과세
 * - 오피스텔: 주거용으로 사용 시 85㎡ 초과 과세 (여기서는 동일 기준 적용)
 * - 상가/근생/공장: 면적 무관 항상 과세
 * - 토지: 항상 면세
 */
export const isVatSubject = (
  propertyType: PropertyType,
  areaType: 'under85' | 'over85'
): boolean => {
  if (propertyType === 'land') return false; // 토지 면세
  if (['commercial', 'neighborhood', 'factory'].includes(propertyType)) return true; // 상가/근생/공장 항상 과세
  // 주거용 + 오피스텔: 85㎡ 초과만 과세
  return areaType === 'over85';
};

/**
 * 토지/건물 안분 비율 계산
 * returns { buildingRatio, landRatio }
 */
export const calcLandBuildingRatio = (
  vatInfo: VatInfo
): { buildingRatio: number; landRatio: number } => {
  let landVal = 0;
  let buildingVal = 0;

  if (vatInfo.allocMethod === 'standard') {
    landVal = vatInfo.landStandardPrice;
    buildingVal = vatInfo.buildingStandardPrice;
  } else if (vatInfo.allocMethod === 'appraisal') {
    landVal = vatInfo.landAppraisalPrice;
    buildingVal = vatInfo.buildingAppraisalPrice;
  } else {
    // direct: 직접 비율로 계산
    const total = vatInfo.buildingDirectAmount + vatInfo.landDirectAmount;
    if (total <= 0) return { buildingRatio: 0.5, landRatio: 0.5 };
    return {
      buildingRatio: vatInfo.buildingDirectAmount / total,
      landRatio: vatInfo.landDirectAmount / total,
    };
  }

  const total = landVal + buildingVal;
  if (total <= 0) return { buildingRatio: 0.5, landRatio: 0.5 };
  return {
    buildingRatio: buildingVal / total,
    landRatio: landVal / total,
  };
};

/**
 * VAT 전체 계산
 */
export const calcVat = (
  vatInfo: VatInfo,
  expectedSalePrice: number,
  bidPrice: number,
  isApplicable: boolean
): {
  buildingRatio: number;
  landRatio: number;
  buildingSaleAmount: number;
  landSaleAmount: number;
  buildingSupplyAmount: number;
  outputVat: number;
  inputVatFromPurchase: number;
  totalInputVat: number;
  vatPayable: number;
} => {
  if (!isApplicable) {
    return {
      buildingRatio: 0, landRatio: 1,
      buildingSaleAmount: 0, landSaleAmount: expectedSalePrice,
      buildingSupplyAmount: 0, outputVat: 0,
      inputVatFromPurchase: 0, totalInputVat: 0, vatPayable: 0,
    };
  }

  const { buildingRatio, landRatio } = calcLandBuildingRatio(vatInfo);

  // 건물분 / 토지분 매도가
  const buildingSaleAmount = expectedSalePrice * buildingRatio;
  const landSaleAmount = expectedSalePrice * landRatio;

  // 매출세액 계산
  let outputVat = 0;
  let buildingSupplyAmount = buildingSaleAmount;

  if (vatInfo.vatInclusionType === 'exclusive') {
    // VAT 별도: 매도가에 VAT 미포함 → 매출세액 = 건물분 × 10%
    outputVat = buildingSaleAmount * 0.1;
    buildingSupplyAmount = buildingSaleAmount;
  } else {
    // VAT 포함: 건물분 공급가액 = 건물분 / 1.1, VAT = 공급가액 × 10%
    buildingSupplyAmount = buildingSaleAmount / 1.1;
    outputVat = buildingSupplyAmount * 0.1;
  }

  // 취득 매입세액
  let inputVatFromPurchase = 0;
  const buildingBidAmount = bidPrice * buildingRatio;

  if (vatInfo.purchaseVatType === 'included') {
    inputVatFromPurchase = (buildingBidAmount / 1.1) * 0.1;
  } else if (vatInfo.purchaseVatType === 'separate') {
    inputVatFromPurchase = buildingBidAmount * 0.1;
  }

  // 기타 매입세액 (각 금액의 10/110)
  const inputVatInterior = vatInfo.inputVatInterior > 0
    ? (vatInfo.inputVatInterior / 1.1) * 0.1 : 0;
  const inputVatLegalScrivener = vatInfo.inputVatLegalScrivener > 0
    ? (vatInfo.inputVatLegalScrivener / 1.1) * 0.1 : 0;
  const inputVatAgentCommission = vatInfo.inputVatAgentCommission > 0
    ? (vatInfo.inputVatAgentCommission / 1.1) * 0.1 : 0;
  const customInputVat = vatInfo.customInputVatItems.reduce(
    (sum, item) => sum + (item.amount > 0 ? (item.amount / 1.1) * 0.1 : 0), 0
  );

  const totalInputVat =
    inputVatFromPurchase +
    inputVatInterior +
    inputVatLegalScrivener +
    inputVatAgentCommission +
    customInputVat;

  const vatPayable = outputVat - totalInputVat;

  return {
    buildingRatio,
    landRatio,
    buildingSaleAmount,
    landSaleAmount,
    buildingSupplyAmount,
    outputVat,
    inputVatFromPurchase,
    totalInputVat,
    vatPayable,
  };
};

// ====================================
// 메인 계산 함수
// ====================================
export const calculateResult = (
  propertyInfo: PropertyInfo,
  bidInfo: BidInfo,
  saleInfo: SaleInfo,
  acquisitionCosts: AcquisitionCosts,
  holdingCosts: HoldingCosts,
  saleCosts: SaleCosts,
  taxInfo: TaxInfo,
  vatInfo: VatInfo,
  targetProfit: number,
  targetProfitRate: number
): CalculationResult => {
  const { bidPrice } = bidInfo;
  const { expectedSalePrice, holdingMonths } = saleInfo;

  // VAT 과세 여부 판단
  const isVatApplicable = isVatSubject(propertyInfo.propertyType, propertyInfo.areaType);

  // VAT 계산
  const vatResult = calcVat(vatInfo, expectedSalePrice, bidPrice, isVatApplicable);
  const { vatPayable } = vatResult;

  // VAT 포함 매도인 경우 실질 매도가 조정
  // VAT 포함이면 건물분에서 VAT 만큼 실질 수령액 감소
  const effectiveSalePrice =
    isVatApplicable && vatInfo.vatInclusionType === 'inclusive'
      ? expectedSalePrice - vatResult.outputVat  // 실질 수령액 = 매도가 - 내포된 VAT
      : expectedSalePrice;

  const acquisitionCostTotal = calcAcquisitionCostTotal(acquisitionCosts);
  const holdingCostTotal = calcHoldingCostTotal(holdingCosts, holdingMonths);
  const saleCostTotal = calcSaleCostTotal(saleCosts);

  // 종합소득세: VAT 포함 매도 시 공급가액 기준으로 매매차익 산정
  const saleAmountForTax = isVatApplicable && vatInfo.vatInclusionType === 'inclusive'
    ? vatResult.buildingSupplyAmount + vatResult.landSaleAmount   // 공급가액 + 토지분
    : expectedSalePrice;

  const { comprehensiveIncomeTax, localIncomeTax, tradingProfit } =
    calcTaxes(
      taxInfo,
      bidPrice,
      saleAmountForTax,
      acquisitionCosts,
      holdingCosts,
      holdingMonths,
      saleCosts
    );

  const taxTotal = comprehensiveIncomeTax + localIncomeTax;

  // 총비용: 취득+보유+매도+소득세 (VAT는 별도 항목)
  const totalCosts = acquisitionCostTotal + holdingCostTotal + saleCostTotal + taxTotal;

  // 총 투자금 = 낙찰가 + 모든 비용 - 대출금
  const totalInvestment =
    bidPrice +
    acquisitionCostTotal +
    holdingCostTotal +
    saleCostTotal -
    acquisitionCosts.loanAmount;

  // 순수익 = 실질매도가 - 낙찰가 - 취득비용 - 보유비용 - 매도비용 - 소득세 - 납부VAT
  const netProfit =
    effectiveSalePrice -
    bidPrice -
    acquisitionCostTotal -
    holdingCostTotal -
    saleCostTotal -
    taxTotal -
    vatPayable;

  const profitRate =
    totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const annualProfitRate =
    holdingMonths > 0 ? profitRate * (12 / holdingMonths) : 0;
  const monthlyProfit = holdingMonths > 0 ? netProfit / holdingMonths : 0;

  // 손익분기점 (VAT 납부 포함)
  const breakEvenPrice =
    bidPrice + acquisitionCostTotal + holdingCostTotal + saleCostTotal + taxTotal + vatPayable;
  const breakEvenRateToAppraisal =
    propertyInfo.appraisalValue > 0
      ? (breakEvenPrice / propertyInfo.appraisalValue) * 100
      : 0;

  // 역산: 목표 순수익 달성 최대 입찰가
  const maxBidForTargetProfit = findMaxBid(
    propertyInfo,
    bidInfo,
    saleInfo,
    acquisitionCosts,
    holdingCosts,
    saleCosts,
    taxInfo,
    vatInfo,
    targetProfit
  );

  const maxBidForTargetRate = findMaxBidForRate(
    propertyInfo,
    bidInfo,
    saleInfo,
    acquisitionCosts,
    holdingCosts,
    saleCosts,
    taxInfo,
    vatInfo,
    targetProfitRate
  );

  // 시나리오 생성
  const scenarios = generateScenarios(
    propertyInfo,
    bidInfo,
    saleInfo,
    acquisitionCosts,
    holdingCosts,
    saleCosts,
    taxInfo,
    vatInfo
  );

  return {
    totalInvestment,
    totalCosts,
    grossProfit: tradingProfit,
    netProfit,
    profitRate,
    annualProfitRate,
    monthlyProfit,
    breakEvenPrice,
    breakEvenRateToAppraisal,
    acquisitionCostTotal,
    holdingCostTotal,
    saleCostTotal,
    taxTotal,
    vatPayable,
    isVatApplicable,
    maxBidForTargetProfit,
    maxBidForTargetRate,
    scenarios,
  };
};

  // 역산: 목표 순수익 최대 입찰가 (이진탐색)
const findMaxBid = (
  propertyInfo: PropertyInfo,
  bidInfo: BidInfo,
  saleInfo: SaleInfo,
  baseCosts: AcquisitionCosts,
  holdingCosts: HoldingCosts,
  saleCosts: SaleCosts,
  taxInfo: TaxInfo,
  vatInfo: VatInfo,
  targetProfit: number
): number => {
  if (targetProfit <= 0) return 0;

  const isVatApplicable = isVatSubject(propertyInfo.propertyType, propertyInfo.areaType);

  let lo = 0;
  let hi = saleInfo.expectedSalePrice;

  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const testCosts = buildCostsForBid(propertyInfo, mid, baseCosts, holdingCosts, saleCosts);

    const acqTotal = calcAcquisitionCostTotal(testCosts.acq);
    const holdTotal = calcHoldingCostTotal(holdingCosts, saleInfo.holdingMonths);
    const saleTotal = calcSaleCostTotal(testCosts.sale);
    const vatResult = calcVat(vatInfo, saleInfo.expectedSalePrice, mid, isVatApplicable);
    const effectiveSalePrice = isVatApplicable && vatInfo.vatInclusionType === 'inclusive'
      ? saleInfo.expectedSalePrice - vatResult.outputVat
      : saleInfo.expectedSalePrice;
    const { comprehensiveIncomeTax, localIncomeTax } = calcTaxes(
      taxInfo, mid, effectiveSalePrice, testCosts.acq, holdingCosts, saleInfo.holdingMonths, testCosts.sale
    );
    const profit = effectiveSalePrice - mid - acqTotal - holdTotal - saleTotal
      - comprehensiveIncomeTax - localIncomeTax - vatResult.vatPayable;

    if (profit > targetProfit) lo = mid;
    else hi = mid;
  }

  return Math.floor(lo);
};

const findMaxBidForRate = (
  propertyInfo: PropertyInfo,
  bidInfo: BidInfo,
  saleInfo: SaleInfo,
  baseCosts: AcquisitionCosts,
  holdingCosts: HoldingCosts,
  saleCosts: SaleCosts,
  taxInfo: TaxInfo,
  vatInfo: VatInfo,
  targetRate: number
): number => {
  if (targetRate <= 0) return 0;

  const isVatApplicable = isVatSubject(propertyInfo.propertyType, propertyInfo.areaType);

  let lo = 0;
  let hi = saleInfo.expectedSalePrice;

  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const testCosts = buildCostsForBid(propertyInfo, mid, baseCosts, holdingCosts, saleCosts);

    const acqTotal = calcAcquisitionCostTotal(testCosts.acq);
    const holdTotal = calcHoldingCostTotal(holdingCosts, saleInfo.holdingMonths);
    const saleTotal = calcSaleCostTotal(testCosts.sale);
    const vatResult = calcVat(vatInfo, saleInfo.expectedSalePrice, mid, isVatApplicable);
    const effectiveSalePrice = isVatApplicable && vatInfo.vatInclusionType === 'inclusive'
      ? saleInfo.expectedSalePrice - vatResult.outputVat
      : saleInfo.expectedSalePrice;
    const { comprehensiveIncomeTax, localIncomeTax } = calcTaxes(
      taxInfo, mid, effectiveSalePrice, testCosts.acq, holdingCosts, saleInfo.holdingMonths, testCosts.sale
    );
    const netProfit = effectiveSalePrice - mid - acqTotal - holdTotal - saleTotal
      - comprehensiveIncomeTax - localIncomeTax - vatResult.vatPayable;
    const investment = mid + acqTotal + holdTotal + saleTotal - baseCosts.loanAmount;
    const rate = investment > 0 ? (netProfit / investment) * 100 : 0;

    if (rate > targetRate) lo = mid;
    else hi = mid;
  }

  return Math.floor(lo);
};

// 특정 입찰가에 대한 비용 재계산
const buildCostsForBid = (
  propertyInfo: PropertyInfo,
  bidPrice: number,
  baseCosts: AcquisitionCosts,
  holdingCosts: HoldingCosts,
  saleCosts: SaleCosts
): { acq: AcquisitionCosts; sale: SaleCosts } => {
  const acquisitionTax = calcAcquisitionTax(
    propertyInfo.propertyType,
    bidPrice,
    propertyInfo.areaType
  );
  const registrationLicenseTax = bidPrice * 0.002;
  const localEduTax = registrationLicenseTax * 0.2;
  const stampDuty = calcStampDuty(bidPrice);

  return {
    acq: {
      ...baseCosts,
      acquisitionTax,
      registrationLicenseTax,
      localEducationTax: localEduTax,
      stampDuty,
    },
    sale: {
      ...saleCosts,
    },
  };
};

// ====================================
// 시나리오 생성
// ====================================
export const generateScenarios = (
  propertyInfo: PropertyInfo,
  bidInfo: BidInfo,
  saleInfo: SaleInfo,
  baseCosts: AcquisitionCosts,
  holdingCosts: HoldingCosts,
  saleCosts: SaleCosts,
  taxInfo: TaxInfo,
  vatInfo: VatInfo
): ScenarioRow[] => {
  const scenarios: ScenarioRow[] = [];
  const isVatApplicable = isVatSubject(propertyInfo.propertyType, propertyInfo.areaType);

  for (let rate = 50; rate <= 100; rate += 5) {
    const bidPrice = Math.round(propertyInfo.appraisalValue * (rate / 100));
    const testCosts = buildCostsForBid(propertyInfo, bidPrice, baseCosts, holdingCosts, saleCosts);

    const acqTotal = calcAcquisitionCostTotal(testCosts.acq);
    const holdTotal = calcHoldingCostTotal(holdingCosts, saleInfo.holdingMonths);
    const saleTotal = calcSaleCostTotal(testCosts.sale);
    const vatResult = calcVat(vatInfo, saleInfo.expectedSalePrice, bidPrice, isVatApplicable);
    const effectiveSalePrice = isVatApplicable && vatInfo.vatInclusionType === 'inclusive'
      ? saleInfo.expectedSalePrice - vatResult.outputVat
      : saleInfo.expectedSalePrice;
    const { comprehensiveIncomeTax, localIncomeTax } = calcTaxes(
      taxInfo, bidPrice, effectiveSalePrice, testCosts.acq, holdingCosts, saleInfo.holdingMonths, testCosts.sale
    );

    const netProfit = effectiveSalePrice - bidPrice - acqTotal - holdTotal - saleTotal
      - comprehensiveIncomeTax - localIncomeTax - vatResult.vatPayable;
    const investment = bidPrice + acqTotal + holdTotal + saleTotal - baseCosts.loanAmount;
    const profitRate = investment > 0 ? (netProfit / investment) * 100 : 0;
    const annualProfitRate = saleInfo.holdingMonths > 0 ? profitRate * (12 / saleInfo.holdingMonths) : 0;

    scenarios.push({ bidRatePercent: rate, bidPrice, netProfit, profitRate, annualProfitRate });
  }

  return scenarios;
};

// ====================================
// 대출 레버리지 분석
// ====================================
export const calcLeverageAnalysis = (
  propertyInfo: PropertyInfo,
  bidInfo: BidInfo,
  saleInfo: SaleInfo,
  baseCosts: AcquisitionCosts,
  holdingCosts: HoldingCosts,
  saleCosts: SaleCosts,
  taxInfo: TaxInfo,
  vatInfo: VatInfo
): LeverageAnalysis[] => {
  const ltvRatios = [0, 40, 50, 60, 70];
  const isVatApplicable = isVatSubject(propertyInfo.propertyType, propertyInfo.areaType);

  return ltvRatios.map((ltv) => {
    const loanAmount = Math.round(bidInfo.bidPrice * (ltv / 100));
    const loanInterest = calcLoanInterest(loanAmount, baseCosts.loanRate || 4.0, saleInfo.holdingMonths);
    const costs: AcquisitionCosts = { ...baseCosts, loanAmount, loanInterest };

    const acqTotal = calcAcquisitionCostTotal(costs);
    const holdTotal = calcHoldingCostTotal(holdingCosts, saleInfo.holdingMonths);
    const saleTotal = calcSaleCostTotal(saleCosts);
    const vatResult = calcVat(vatInfo, saleInfo.expectedSalePrice, bidInfo.bidPrice, isVatApplicable);
    const effectiveSalePrice = isVatApplicable && vatInfo.vatInclusionType === 'inclusive'
      ? saleInfo.expectedSalePrice - vatResult.outputVat
      : saleInfo.expectedSalePrice;
    const { comprehensiveIncomeTax, localIncomeTax } = calcTaxes(
      taxInfo, bidInfo.bidPrice, effectiveSalePrice, costs, holdingCosts, saleInfo.holdingMonths, saleCosts
    );

    const netProfit = effectiveSalePrice - bidInfo.bidPrice - acqTotal - holdTotal - saleTotal
      - comprehensiveIncomeTax - localIncomeTax - vatResult.vatPayable;
    const ownCapital = bidInfo.bidPrice + acqTotal + holdTotal + saleTotal - loanAmount;
    const roe = ownCapital > 0 ? (netProfit / ownCapital) * 100 : 0;
    const totalProfitRate = (bidInfo.bidPrice + acqTotal + holdTotal + saleTotal) > 0
      ? (netProfit / (bidInfo.bidPrice + acqTotal + holdTotal + saleTotal)) * 100 : 0;

    return { ltvRatio: ltv, loanAmount, ownCapital, netProfit, roe, totalProfitRate };
  });
};

// ====================================
// 세금 비교: 매매사업자 vs 개인 양도세
// ====================================
export const calcTaxComparison = (
  tradingProfit: number,
  holdingMonths: number,
  businessTaxInfo: TaxInfo,
  bidPrice: number,
  salePrice: number,
  acquisitionCosts: AcquisitionCosts,
  holdingCosts: HoldingCosts,
  saleCosts: SaleCosts
): TaxComparison => {
  const { comprehensiveIncomeTax, localIncomeTax } = calcTaxes(
    businessTaxInfo,
    bidPrice,
    salePrice,
    acquisitionCosts,
    holdingCosts,
    holdingMonths,
    saleCosts
  );

  const businessTax = comprehensiveIncomeTax + localIncomeTax;
  const businessNetProfit = tradingProfit - businessTax;

  // 개인 양도세 (취득비용 공제 후)
  const acquisitionCostForDeduction =
    acquisitionCosts.acquisitionTax +
    acquisitionCosts.legalScrivenerFee +
    acquisitionCosts.registrationLicenseTax;
  const capitalGainsProfit = Math.max(0, tradingProfit - acquisitionCostForDeduction);
  const capitalGainsTax = calcCapitalGainsTax(capitalGainsProfit, holdingMonths);
  const individualTax = capitalGainsTax * 1.1; // 지방소득세 10% 포함
  const individualNetProfit = tradingProfit - individualTax;

  const advantageous: 'business' | 'individual' =
    businessNetProfit >= individualNetProfit ? 'business' : 'individual';

  return {
    businessTax,
    individualTax,
    businessNetProfit,
    individualNetProfit,
    advantageous,
    difference: Math.abs(businessNetProfit - individualNetProfit),
  };
};
