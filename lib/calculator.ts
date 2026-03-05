// ====================================
// 계산 유틸리티 함수들 v3
// 법인/개인/매매사업자 세금 + 양도소득세 정밀계산
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
  CapitalGainsTaxInfo,
  VatInfo,
  CalculationResult,
  ScenarioRow,
  LeverageAnalysis,
  TaxComparison,
  TaxComparisonDetail,
  RegulationZone,
  HousingCount,
  CorporationType,
  BidderType,
} from '@/types';

// 개인 매매사업자 가능 주거용 물건 종류
export const INDIVIDUAL_TRADER_ELIGIBLE_TYPES: PropertyType[] = ['apartment', 'villa', 'house', 'officetel'];

/** 개인 매매사업자 적용 가능 여부 (주거용만 허용) */
export const isIndividualTraderEligible = (propertyType: PropertyType): boolean => {
  return INDIVIDUAL_TRADER_ELIGIBLE_TYPES.includes(propertyType);
};

/** 실제 적용 세금 모드 결정
 *  - individual_trader + 비주거용 → 개인 양도소득세로 대체
 *  - 그 외는 그대로 반환
 */
export const resolveEffectiveBidderType = (
  bidderType: BidderType,
  propertyType: PropertyType
): BidderType => {
  if (bidderType === 'individual_trader' && !isIndividualTraderEligible(propertyType)) {
    return 'individual'; // 비주거용에는 매매사업자 불가 → 개인 양도세로
  }
  return bidderType;
};

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
// 최저입찰가 계산
// ====================================
export const calcMinimumBidPrice = (
  appraisalValue: number,
  failedBidCount: number,
  depreciationRate: number
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
    const base = bidPrice * 0.04;
    const localEdu = base * 0.1;
    const rural = bidPrice * 0.002;
    return { rate: 4.6, breakdown: { acquisitionTax: base, localEduTax: localEdu, ruralSpecialTax: rural } };
  }

  let baseRate: number;
  if (bidPrice <= 600_000_000) {
    baseRate = 0.01;
  } else if (bidPrice <= 900_000_000) {
    const slidingRate = ((bidPrice / 100_000_000) * (2 / 3) - 3) / 100;
    baseRate = Math.max(0.01, Math.min(0.03, slidingRate));
  } else {
    baseRate = 0.03;
  }

  const acquisitionTax = bidPrice * baseRate;
  const localEdu = acquisitionTax * 0.1;
  let rural = 0;
  if (areaType === 'over85') rural = bidPrice * 0.002;

  const totalRate = ((acquisitionTax + localEdu + rural) / bidPrice) * 100;
  return {
    rate: parseFloat(totalRate.toFixed(2)),
    breakdown: { acquisitionTax, localEduTax: localEdu, ruralSpecialTax: rural },
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
// 인지대
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
// 중개보수
// ====================================
export const calcAgentCommissionRate = (salePrice: number): number => {
  if (salePrice < 50_000_000) return 0.006;
  if (salePrice < 200_000_000) return 0.005;
  if (salePrice < 900_000_000) return 0.004;
  if (salePrice < 1_200_000_000) return 0.005;
  if (salePrice < 1_500_000_000) return 0.006;
  return 0.007;
};

export const calcAgentCommission = (salePrice: number, saleMethod: string): number => {
  if (saleMethod === 'direct') return 0;
  const rate = calcAgentCommissionRate(salePrice);
  const calculated = salePrice * rate;
  if (salePrice < 50_000_000) return Math.min(calculated, 250_000);
  if (salePrice < 200_000_000) return Math.min(calculated, 800_000);
  return calculated;
};

// ====================================
// 재산세
// ====================================
export const calcPropertyTax = (
  propertyType: PropertyType,
  bidPrice: number,
  holdingMonths: number
): number => {
  let annualTax: number;
  const isResidential = ['apartment', 'villa', 'house', 'officetel'].includes(propertyType);

  if (isResidential) {
    const taxBase = bidPrice * 0.6;
    if (taxBase <= 60_000_000) annualTax = taxBase * 0.001;
    else if (taxBase <= 150_000_000) annualTax = 60_000 + (taxBase - 60_000_000) * 0.0015;
    else if (taxBase <= 300_000_000) annualTax = 195_000 + (taxBase - 150_000_000) * 0.0025;
    else annualTax = 570_000 + (taxBase - 300_000_000) * 0.004;
  } else {
    annualTax = bidPrice * 0.004;
  }
  return (annualTax * holdingMonths) / 12;
};

// ====================================
// 대출 이자
// ====================================
export const calcLoanInterest = (loanAmount: number, annualRate: number, holdingMonths: number): number => {
  if (!loanAmount || loanAmount <= 0) return 0;
  if (!annualRate || annualRate <= 0) return 0;
  if (!holdingMonths || holdingMonths <= 0) return 0;
  return loanAmount * (annualRate / 100) * (holdingMonths / 12);
};

// ====================================
// 종합소득세 (매매사업자) - 2024 세율
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

/** 종합소득세 실효세율 텍스트 */
export const getIncomeTaxBracketLabel = (taxBase: number): string => {
  if (taxBase <= 0) return '과세 없음';
  if (taxBase <= 14_000_000) return '6% (1,400만원 이하)';
  if (taxBase <= 50_000_000) return '15% (5,000만원 이하)';
  if (taxBase <= 88_000_000) return '24% (8,800만원 이하)';
  if (taxBase <= 150_000_000) return '35% (1.5억원 이하)';
  if (taxBase <= 300_000_000) return '38% (3억원 이하)';
  if (taxBase <= 500_000_000) return '40% (5억원 이하)';
  if (taxBase <= 1_000_000_000) return '42% (10억원 이하)';
  return '45% (10억원 초과)';
};

// ====================================
// 장기보유특별공제율 계산
// ====================================
/**
 * 주택: 1세대 1주택 (거주요건 충족 시 최대 80%)
 * 일반 자산: 보유기간 기준 (최대 30%)
 * 비사업용 토지: 공제 없음
 */
export const calcLongTermDeductionRate = (
  propertyType: PropertyType,
  holdingMonths: number,
  isOneHousehold: boolean,
  residencyYears: number,
  regulationZone: RegulationZone,
  isNonbusiness: boolean
): number => {
  if (isNonbusiness && propertyType === 'land') return 0; // 비사업용 토지: 공제 없음

  const holdingYears = holdingMonths / 12;

  const isResidential = ['apartment', 'villa', 'house', 'officetel'].includes(propertyType);

  // 1세대 1주택 특례 (2년 거주 요건)
  if (isResidential && isOneHousehold && residencyYears >= 2) {
    // 보유기간 공제 + 거주기간 공제 (각 4%, 합산 최대 80%)
    const holdingDeduction = Math.min(Math.floor(holdingYears) * 4, 40); // 보유: 연 4%, 최대 40%
    const residencyDeduction = Math.min(Math.floor(residencyYears) * 4, 40); // 거주: 연 4%, 최대 40%
    return Math.min(holdingDeduction + residencyDeduction, 80);
  }

  // 일반 주택 (다주택 / 거주요건 미충족)
  if (isResidential) {
    // 투기과열지구 등 규제지역 다주택: 장기보유특별공제 배제
    if (
      regulationZone !== 'normal' &&
      (holdingYears >= 1) // 단기 중과는 별도 처리
    ) {
      return 0; // 규제지역 다주택: 장기보유특별공제 배제
    }
    // 일반: 보유 3년부터 연 2%, 최대 30%
    if (holdingYears < 3) return 0;
    return Math.min(Math.floor(holdingYears) * 2, 30);
  }

  // 비주거용 (상가/토지 등)
  if (holdingYears < 3) return 0;
  if (holdingYears < 4) return 6;
  if (holdingYears < 5) return 8;
  if (holdingYears < 6) return 10;
  if (holdingYears < 7) return 12;
  if (holdingYears < 8) return 14;
  if (holdingYears < 9) return 16;
  if (holdingYears < 10) return 18;
  if (holdingYears < 11) return 20;
  if (holdingYears < 12) return 22;
  if (holdingYears < 13) return 24;
  if (holdingYears < 14) return 26;
  if (holdingYears < 15) return 28;
  return 30; // 15년 이상: 30%
};

// ====================================
// 개인 양도소득세 정밀 계산
// ====================================
export interface CapitalGainsCalcResult {
  capitalGains: number;          // 양도차익
  longTermDeductionAmount: number; // 장기보유특별공제액
  longTermDeductionRate: number;  // 공제율 (%)
  basicDeduction: number;         // 기본공제 (250만원)
  taxBase: number;                // 과세표준
  taxRate: number;                // 적용 세율 (%)
  tax: number;                    // 양도소득세
  localTax: number;               // 지방소득세 (10%)
  totalTax: number;               // 합계
  specialNote: string;            // 중과세 등 특이사항
}

export const calcCapitalGainsTaxDetailed = (
  profit: number,                   // 양도차익 (매도가 - 낙찰가 - 필요경비)
  propertyType: PropertyType,
  holdingMonths: number,
  regulationZone: RegulationZone,
  housingCount: HousingCount,
  isOneHousehold: boolean,
  residencyYears: number,
  isNonbusiness: boolean,
  longTermDeductionRateOverride: number | null = null  // null이면 자동계산
): CapitalGainsCalcResult => {
  if (profit <= 0) {
    return {
      capitalGains: profit, longTermDeductionAmount: 0, longTermDeductionRate: 0,
      basicDeduction: 2_500_000, taxBase: 0, taxRate: 0, tax: 0, localTax: 0, totalTax: 0,
      specialNote: '양도차익 없음',
    };
  }

  const holdingYears = holdingMonths / 12;
  const isResidential = ['apartment', 'villa', 'house', 'officetel'].includes(propertyType);
  let specialNote = '';
  let taxRate = 0;
  let tax = 0;

  // ── 1세대 1주택 비과세 판단 ──
  if (isResidential && isOneHousehold && housingCount === 'one' && residencyYears >= 2 && holdingYears >= 2) {
    // 12억 이하 비과세 (2023년 이후), 초과분만 과세
    const taxableGains = profit > 1_200_000_000
      ? profit * (1 - 1_200_000_000 / profit)
      : 0;
    if (taxableGains <= 0) {
      return {
        capitalGains: profit, longTermDeductionAmount: 0, longTermDeductionRate: 0,
        basicDeduction: 0, taxBase: 0, taxRate: 0, tax: 0, localTax: 0, totalTax: 0,
        specialNote: '1세대 1주택 비과세 (12억 이하)',
      };
    }
    profit = taxableGains;
    specialNote = '1세대 1주택 (12억 초과분 과세)';
  }

  // ── 장기보유특별공제 ──
  const ltdRate = longTermDeductionRateOverride !== null
    ? longTermDeductionRateOverride
    : calcLongTermDeductionRate(propertyType, holdingMonths, isOneHousehold, residencyYears, regulationZone, isNonbusiness);
  const longTermDeductionAmount = profit * (ltdRate / 100);
  const afterLTD = profit - longTermDeductionAmount;

  // ── 기본공제 250만원 ──
  const basicDeduction = 2_500_000;
  const taxBase = Math.max(0, afterLTD - basicDeduction);

  // ── 세율 결정 ──
  if (isResidential) {
    // 주택: 단기 중과 + 다주택 중과
    if (holdingYears < 1) {
      // 1년 미만: 70% (규제지역 주택 포함)
      taxRate = 70;
      specialNote += ' / 1년 미만 단기 70%';
    } else if (holdingYears < 2) {
      // 1~2년 미만: 60%
      taxRate = 60;
      specialNote += ' / 1~2년 60%';
    } else {
      // 2년 이상 보유
      // 다주택 중과: 규제지역 내 2주택 +20%p, 3주택 이상 +30%p
      let surcharge = 0;
      if (regulationZone !== 'normal') {
        if (housingCount === 'two') { surcharge = 20; specialNote += ' / 규제지역 2주택 +20%p 중과'; }
        else if (housingCount === 'three_plus') { surcharge = 30; specialNote += ' / 규제지역 3주택 +30%p 중과'; }
      }
      // 투기지역 토지거래허가구역: 추가 10%p (중복 적용)
      if (regulationZone === 'speculation' || regulationZone === 'land_trade') {
        surcharge = Math.max(surcharge, 10);
      }

      if (surcharge > 0) {
        // 중과: 기본세율 + 가산세율 (누진 + 가산)
        const baseTax = calcProgressiveTax(taxBase);
        tax = baseTax + taxBase * (surcharge / 100);
        taxRate = taxBase > 0 ? (tax / taxBase) * 100 : 0;
      } else {
        tax = calcProgressiveTax(taxBase);
        taxRate = taxBase > 0 ? (tax / taxBase) * 100 : 0;
      }
      const localTax = tax * 0.1;
      return {
        capitalGains: profit,
        longTermDeductionAmount,
        longTermDeductionRate: ltdRate,
        basicDeduction,
        taxBase,
        taxRate: parseFloat(taxRate.toFixed(1)),
        tax,
        localTax,
        totalTax: tax + localTax,
        specialNote: specialNote.replace(/^\s*\/\s*/, ''),
      };
    }
    // 단기 중과 (고정 세율)
    tax = taxBase * (taxRate / 100);
  } else if (propertyType === 'land') {
    // 토지: 비사업용 중과 +10%p
    if (isNonbusiness) {
      const baseTax = calcProgressiveTax(taxBase);
      tax = baseTax + taxBase * 0.10;
      specialNote += ' / 비사업용 토지 +10%p 중과';
      taxRate = taxBase > 0 ? (tax / taxBase) * 100 : 0;
    } else {
      // 사업용 토지: 1년 미만 50%, 1~2년 40%, 2년 이상 누진
      if (holdingYears < 1) { taxRate = 50; tax = taxBase * 0.50; specialNote += ' / 사업용 토지 1년 미만 50%'; }
      else if (holdingYears < 2) { taxRate = 40; tax = taxBase * 0.40; specialNote += ' / 사업용 토지 1~2년 40%'; }
      else { tax = calcProgressiveTax(taxBase); taxRate = taxBase > 0 ? (tax / taxBase) * 100 : 0; }
    }
  } else {
    // 상가/근생/공장/오피스텔 (비주거 부동산)
    // 1년 미만 50%, 1~2년 40%, 2년 이상 누진
    if (holdingYears < 1) { taxRate = 50; tax = taxBase * 0.50; specialNote += ' / 1년 미만 단기 50%'; }
    else if (holdingYears < 2) { taxRate = 40; tax = taxBase * 0.40; specialNote += ' / 1~2년 40%'; }
    else { tax = calcProgressiveTax(taxBase); taxRate = taxBase > 0 ? (tax / taxBase) * 100 : 0; }
  }

  const localTax = tax * 0.1;
  return {
    capitalGains: profit,
    longTermDeductionAmount,
    longTermDeductionRate: ltdRate,
    basicDeduction,
    taxBase,
    taxRate: parseFloat(taxRate.toFixed(1)),
    tax,
    localTax,
    totalTax: tax + localTax,
    specialNote: specialNote.replace(/^\s*\/\s*/, ''),
  };
};

/** 누진세 계산 (양도소득세/종합소득세 공통) */
const calcProgressiveTax = (base: number): number => {
  if (base <= 0) return 0;
  if (base <= 14_000_000) return base * 0.06;
  if (base <= 50_000_000) return base * 0.15 - 1_260_000;
  if (base <= 88_000_000) return base * 0.24 - 5_760_000;
  if (base <= 150_000_000) return base * 0.35 - 15_440_000;
  if (base <= 300_000_000) return base * 0.38 - 19_940_000;
  if (base <= 500_000_000) return base * 0.40 - 25_940_000;
  if (base <= 1_000_000_000) return base * 0.42 - 35_940_000;
  return base * 0.45 - 65_940_000;
};

// 하위 호환용
export const calcCapitalGainsTax = (profit: number, holdingMonths: number): number => {
  if (profit <= 0) return 0;
  const holdingYears = holdingMonths / 12;
  const basicDeduction = 2_500_000;
  const taxBase = Math.max(0, profit - basicDeduction);
  if (holdingYears < 1) return taxBase * 0.70;
  if (holdingYears < 2) return taxBase * 0.60;
  return calcProgressiveTax(taxBase);
};

// ====================================
// 법인세 계산 (2024)
// ====================================
/**
 * 법인세율 (2024):
 * - 2억 이하: 9%
 * - 2억~200억: 19%
 * - 200억~3000억: 21%
 * - 3000억 초과: 24%
 *
 * 주택 취득 법인 추가세금:
 * - 법인이 주택 취득 시 취득세 12% 중과
 * - 법인이 주택 양도 시 토지 등 양도소득: 일반 법인세 + 추가 10%
 */
export interface CorporateTaxResult {
  taxableIncome: number;
  corporateTax: number;
  localTax: number;         // 지방소득세 10%
  housingSpecialTax: number; // 주택 양도 추가세 (법인)
  totalTax: number;
  effectiveRate: number;    // 실효세율
}

export const calcCorporateTax = (
  profit: number,               // 법인 양도차익
  propertyType: PropertyType,
  corporationType: CorporationType,
  existingCorporateIncome: number = 0  // 기존 법인 과세표준
): CorporateTaxResult => {
  if (profit <= 0) {
    return { taxableIncome: 0, corporateTax: 0, localTax: 0, housingSpecialTax: 0, totalTax: 0, effectiveRate: 0 };
  }

  const isResidential = ['apartment', 'villa', 'house', 'officetel'].includes(propertyType);
  const taxableIncome = profit + existingCorporateIncome;

  // 법인세 계산 (누진)
  let corporateTax = 0;
  const prevTax = calcCorporateProgressiveTax(existingCorporateIncome);
  const totalTaxBeforeExtra = calcCorporateProgressiveTax(taxableIncome);
  corporateTax = Math.max(0, totalTaxBeforeExtra - prevTax); // 부동산 관련 세금만 분리

  const localTax = corporateTax * 0.1; // 지방소득세 10%

  // 주택 법인 양도: 추가 세율 20% (일반 법인세에 추가)
  // 2022.01 이후 취득한 법인 주택 처분 시
  let housingSpecialTax = 0;
  if (isResidential) {
    housingSpecialTax = profit * 0.20; // 추가 20%
  }

  const total = corporateTax + localTax + housingSpecialTax;
  const effectiveRate = profit > 0 ? (total / profit) * 100 : 0;

  return {
    taxableIncome: profit,
    corporateTax,
    localTax,
    housingSpecialTax,
    totalTax: total,
    effectiveRate: parseFloat(effectiveRate.toFixed(1)),
  };
};

const calcCorporateProgressiveTax = (income: number): number => {
  if (income <= 0) return 0;
  if (income <= 200_000_000) return income * 0.09;
  if (income <= 20_000_000_000) return 18_000_000 + (income - 200_000_000) * 0.19;
  if (income <= 300_000_000_000) return 3_780_000_000 + (income - 20_000_000_000) * 0.21;
  return 66_780_000_000 + (income - 300_000_000_000) * 0.24;
};

// ====================================
// 비용 합계 함수들
// ====================================
export const calcAcquisitionCostTotal = (costs: AcquisitionCosts): number => {
  const eviction =
    costs.evictionCost.movingFee +
    costs.evictionCost.litigationFee +
    costs.evictionCost.enforcementFee +
    (costs.evictionCost.keyMoney ?? 0) +
    (costs.evictionCost.cleanupFee ?? 0);
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

export const calcHoldingCostTotal = (costs: HoldingCosts, holdingMonths: number): number => {
  const repairTotal = costs.repairCosts.reduce((sum, item) => sum + item.amount, 0);
  const repairDetailTotal = (costs.repairCostDetails ?? []).reduce((sum, item) => sum + item.amount, 0);
  const customTotal = costs.customItems.reduce((sum, item) => sum + item.amount, 0);
  return (
    costs.propertyTax +
    costs.comprehensiveRealEstateTax +
    costs.maintenanceFeeMonthly * holdingMonths +
    repairTotal +
    repairDetailTotal +
    costs.insuranceFee +
    customTotal
  );
};

export const calcSaleCostTotal = (costs: SaleCosts): number => {
  const customTotal = costs.customItems.reduce((sum, item) => sum + item.amount, 0);
  return costs.agentCommission + costs.cancelRegistrationFee + customTotal;
};

// ====================================
// 매매사업자 종합소득세 계산
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
      acquisitionCosts.evictionCost.enforcementFee +
      (acquisitionCosts.evictionCost.keyMoney ?? 0) +
      (acquisitionCosts.evictionCost.cleanupFee ?? 0);
  }
  if (d.unpaidManagementFee) totalDeductible += acquisitionCosts.unpaidManagementFee;
  if (d.loanInterest) totalDeductible += acquisitionCosts.loanInterest;
  if (d.repairCosts) {
    totalDeductible += holdingCosts.repairCosts.reduce((sum, item) => sum + item.amount, 0);
    totalDeductible += (holdingCosts.repairCostDetails ?? []).reduce((sum, item) => sum + item.amount, 0);
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

  const taxBase = Math.max(
    0,
    tradingProfit - totalDeductible - taxInfo.basicDeduction + taxInfo.existingIncome
  );
  const comprehensiveIncomeTax = calcComprehensiveIncomeTax(taxBase);
  const localIncomeTax = comprehensiveIncomeTax * 0.1;

  return { comprehensiveIncomeTax, localIncomeTax, tradingProfit, totalDeductible, taxBase };
};

// ====================================
// 3가지 세금 구조 비교
// ====================================
export const calcTaxComparisonDetail = (
  params: {
    bidPrice: number;
    salePrice: number;
    acquisitionCosts: AcquisitionCosts;
    holdingCosts: HoldingCosts;
    holdingMonths: number;
    saleCosts: SaleCosts;
    taxInfo: TaxInfo;
    propertyInfo: PropertyInfo;
    capitalGainsTaxInfo: CapitalGainsTaxInfo;
  }
): TaxComparisonDetail => {
  const { bidPrice, salePrice, acquisitionCosts, holdingCosts, holdingMonths, saleCosts, taxInfo, propertyInfo, capitalGainsTaxInfo } = params;

  // 공통 기준 매매차익
  const grossProfit = salePrice - bidPrice;

  // 매매사업자(종합소득세)는 주거용 물건에만 적용 가능
  const isEligibleForTrader = isIndividualTraderEligible(propertyInfo.propertyType);

  // ── 1. 매매사업자 종합소득세 ──
  const { comprehensiveIncomeTax, localIncomeTax } = calcTaxes(
    taxInfo, bidPrice, salePrice, acquisitionCosts, holdingCosts, holdingMonths, saleCosts
  );
  const businessTax = comprehensiveIncomeTax + localIncomeTax;
  const businessNetProfit = grossProfit - businessTax;
  const businessEffective = grossProfit > 0 ? (businessTax / grossProfit) * 100 : 0;

  // ── 2. 개인 양도소득세 ──
  // 필요경비 차감
  const deductibleForCGT =
    acquisitionCosts.acquisitionTax +
    acquisitionCosts.legalScrivenerFee +
    acquisitionCosts.registrationLicenseTax +
    acquisitionCosts.stampDuty +
    (capitalGainsTaxInfo.deductibleRepairCosts
      ? holdingCosts.repairCosts.reduce((s, i) => s + i.amount, 0)
      : 0);
  const cgtProfit = Math.max(0, grossProfit - (capitalGainsTaxInfo.deductibleAcquisitionCosts ? deductibleForCGT : 0));

  const ltdRateOverride = capitalGainsTaxInfo.autoLongTermDeduction
    ? null
    : capitalGainsTaxInfo.longTermDeductionRate;

  const cgtResult = calcCapitalGainsTaxDetailed(
    cgtProfit,
    propertyInfo.propertyType,
    holdingMonths,
    capitalGainsTaxInfo.regulationZone,
    capitalGainsTaxInfo.housingCount,
    capitalGainsTaxInfo.isOneHousehold,
    capitalGainsTaxInfo.residencyYears,
    capitalGainsTaxInfo.isNonbusiness,
    ltdRateOverride
  );
  const individualTax = cgtResult.totalTax;
  const individualNetProfit = grossProfit - individualTax;
  const individualEffective = grossProfit > 0 ? (individualTax / grossProfit) * 100 : 0;

  // ── 3. 법인세 ──
  const corpResult = calcCorporateTax(
    grossProfit,
    propertyInfo.propertyType,
    capitalGainsTaxInfo.corporationType,
    capitalGainsTaxInfo.corporateTaxBaseIncome
  );
  const corpNetProfit = grossProfit - corpResult.totalTax;
  const corpEffective = grossProfit > 0 ? (corpResult.totalTax / grossProfit) * 100 : 0;

  // ── 최적 비교 ──
  // 주거용이 아니면 매매사업자 옵션 제외하고 비교
  const nets = isEligibleForTrader
    ? [
        { key: 'business' as const, net: businessNetProfit },
        { key: 'individual' as const, net: individualNetProfit },
        { key: 'corporation' as const, net: corpNetProfit },
      ]
    : [
        { key: 'individual' as const, net: individualNetProfit },
        { key: 'corporation' as const, net: corpNetProfit },
      ];
  nets.sort((a, b) => b.net - a.net);
  const best = nets[0].key;
  const bestSavings = nets[0].net - nets[nets.length - 1].net;

  return {
    business: {
      tax: businessTax,
      netProfit: businessNetProfit,
      effectiveRate: businessEffective,
      eligibleForPropertyType: isEligibleForTrader,
    },
    individual: {
      tax: individualTax,
      netProfit: individualNetProfit,
      effectiveRate: individualEffective,
      breakdown: {
        capitalGains: cgtResult.capitalGains,
        longTermDeduction: cgtResult.longTermDeductionAmount,
        basicDeduction: cgtResult.basicDeduction,
        taxBase: cgtResult.taxBase,
        cgt: cgtResult.tax,
        localTax: cgtResult.localTax,
      },
    },
    corporation: {
      tax: corpResult.totalTax,
      netProfit: corpNetProfit,
      effectiveRate: corpEffective,
      type: capitalGainsTaxInfo.corporationType,
    },
    best,
    bestSavings,
  };
};

// ====================================
// VAT 계산
// ====================================
export const isVatSubject = (propertyType: PropertyType, areaType: 'under85' | 'over85'): boolean => {
  if (propertyType === 'land') return false;
  if (['commercial', 'neighborhood', 'factory'].includes(propertyType)) return true;
  return areaType === 'over85';
};

export const calcLandBuildingRatio = (vatInfo: VatInfo): { buildingRatio: number; landRatio: number } => {
  let landVal = 0, buildingVal = 0;
  if (vatInfo.allocMethod === 'standard') {
    landVal = vatInfo.landStandardPrice;
    buildingVal = vatInfo.buildingStandardPrice;
  } else if (vatInfo.allocMethod === 'appraisal') {
    landVal = vatInfo.landAppraisalPrice;
    buildingVal = vatInfo.buildingAppraisalPrice;
  } else {
    const total = vatInfo.buildingDirectAmount + vatInfo.landDirectAmount;
    if (total <= 0) return { buildingRatio: 0.5, landRatio: 0.5 };
    return { buildingRatio: vatInfo.buildingDirectAmount / total, landRatio: vatInfo.landDirectAmount / total };
  }
  const total = landVal + buildingVal;
  if (total <= 0) return { buildingRatio: 0.5, landRatio: 0.5 };
  return { buildingRatio: buildingVal / total, landRatio: landVal / total };
};

export const calcVat = (
  vatInfo: VatInfo,
  expectedSalePrice: number,
  bidPrice: number,
  isApplicable: boolean
) => {
  if (!isApplicable) {
    return {
      buildingRatio: 0, landRatio: 1,
      buildingSaleAmount: 0, landSaleAmount: expectedSalePrice,
      buildingSupplyAmount: 0, outputVat: 0,
      inputVatFromPurchase: 0, totalInputVat: 0, vatPayable: 0,
    };
  }
  const { buildingRatio, landRatio } = calcLandBuildingRatio(vatInfo);
  const buildingSaleAmount = expectedSalePrice * buildingRatio;
  const landSaleAmount = expectedSalePrice * landRatio;
  let outputVat = 0, buildingSupplyAmount = buildingSaleAmount;
  if (vatInfo.vatInclusionType === 'exclusive') {
    outputVat = buildingSaleAmount * 0.1;
    buildingSupplyAmount = buildingSaleAmount;
  } else {
    buildingSupplyAmount = buildingSaleAmount / 1.1;
    outputVat = buildingSupplyAmount * 0.1;
  }
  const buildingBidAmount = bidPrice * buildingRatio;
  let inputVatFromPurchase = 0;
  if (vatInfo.purchaseVatType === 'included') inputVatFromPurchase = (buildingBidAmount / 1.1) * 0.1;
  else if (vatInfo.purchaseVatType === 'separate') inputVatFromPurchase = buildingBidAmount * 0.1;
  const inputVatInterior = vatInfo.inputVatInterior > 0 ? (vatInfo.inputVatInterior / 1.1) * 0.1 : 0;
  const inputVatLegal = vatInfo.inputVatLegalScrivener > 0 ? (vatInfo.inputVatLegalScrivener / 1.1) * 0.1 : 0;
  const inputVatAgent = vatInfo.inputVatAgentCommission > 0 ? (vatInfo.inputVatAgentCommission / 1.1) * 0.1 : 0;
  const customInputVat = vatInfo.customInputVatItems.reduce(
    (sum, item) => sum + (item.amount > 0 ? (item.amount / 1.1) * 0.1 : 0), 0
  );
  const totalInputVat = inputVatFromPurchase + inputVatInterior + inputVatLegal + inputVatAgent + customInputVat;
  const vatPayable = outputVat - totalInputVat;
  return {
    buildingRatio, landRatio, buildingSaleAmount, landSaleAmount,
    buildingSupplyAmount, outputVat, inputVatFromPurchase, totalInputVat, vatPayable,
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
  capitalGainsTaxInfo: CapitalGainsTaxInfo,
  vatInfo: VatInfo,
  targetProfit: number,
  targetProfitRate: number
): CalculationResult => {
  const { bidPrice } = bidInfo;
  const { expectedSalePrice, holdingMonths } = saleInfo;

  const isVatApplicable = isVatSubject(propertyInfo.propertyType, propertyInfo.areaType);
  const vatResult = calcVat(vatInfo, expectedSalePrice, bidPrice, isVatApplicable);
  const { vatPayable } = vatResult;

  const effectiveSalePrice =
    isVatApplicable && vatInfo.vatInclusionType === 'inclusive'
      ? expectedSalePrice - vatResult.outputVat
      : expectedSalePrice;

  const acquisitionCostTotal = calcAcquisitionCostTotal(acquisitionCosts);
  const holdingCostTotal = calcHoldingCostTotal(holdingCosts, holdingMonths);
  const saleCostTotal = calcSaleCostTotal(saleCosts);

  const saleAmountForTax = isVatApplicable && vatInfo.vatInclusionType === 'inclusive'
    ? vatResult.buildingSupplyAmount + vatResult.landSaleAmount
    : expectedSalePrice;

  // 실제 적용 입찰자 유형 (비주거용 매매사업자 → 개인으로 강제)
  const effectiveBidderType = resolveEffectiveBidderType(
    propertyInfo.bidderType ?? 'individual',
    propertyInfo.propertyType
  );

  // 주 세금 계산: 입찰자 유형에 따라 달라짐
  let taxTotal = 0;
  if (effectiveBidderType === 'individual_trader') {
    // 개인 매매사업자: 종합소득세
    const { comprehensiveIncomeTax, localIncomeTax } = calcTaxes(
      taxInfo, bidPrice, saleAmountForTax, acquisitionCosts, holdingCosts, holdingMonths, saleCosts
    );
    taxTotal = comprehensiveIncomeTax + localIncomeTax;
  } else if (effectiveBidderType === 'corporation') {
    // 법인: 법인세
    const grossProfit = saleAmountForTax - bidPrice;
    const corpResult = calcCorporateTax(
      grossProfit, propertyInfo.propertyType, capitalGainsTaxInfo.corporationType,
      capitalGainsTaxInfo.corporateTaxBaseIncome
    );
    taxTotal = corpResult.totalTax;
  } else {
    // 개인: 양도소득세
    const grossProfit = saleAmountForTax - bidPrice;
    const deductibleForCGT = capitalGainsTaxInfo.deductibleAcquisitionCosts
      ? acquisitionCosts.acquisitionTax + acquisitionCosts.legalScrivenerFee +
        acquisitionCosts.registrationLicenseTax + acquisitionCosts.stampDuty +
        (capitalGainsTaxInfo.deductibleRepairCosts ? holdingCosts.repairCosts.reduce((s, i) => s + i.amount, 0) : 0)
      : 0;
    const cgtProfit = Math.max(0, grossProfit - deductibleForCGT);
    const ltdOverride = capitalGainsTaxInfo.autoLongTermDeduction ? null : capitalGainsTaxInfo.longTermDeductionRate;
    const cgtResult = calcCapitalGainsTaxDetailed(
      cgtProfit, propertyInfo.propertyType, holdingMonths,
      capitalGainsTaxInfo.regulationZone, capitalGainsTaxInfo.housingCount,
      capitalGainsTaxInfo.isOneHousehold, capitalGainsTaxInfo.residencyYears,
      capitalGainsTaxInfo.isNonbusiness, ltdOverride
    );
    taxTotal = cgtResult.totalTax;
  }

  // 종합소득세는 taxTotal에서 분리 표시용으로도 계산 유지
  const { comprehensiveIncomeTax, localIncomeTax, tradingProfit } = calcTaxes(
    taxInfo, bidPrice, saleAmountForTax, acquisitionCosts, holdingCosts, holdingMonths, saleCosts
  );
  const businessTaxTotal = comprehensiveIncomeTax + localIncomeTax;

  // 결과 표시용: Step6에서는 주 세금(taxTotal)을 사용
  // taxTotal이 이미 위에서 입찰자 유형별로 계산됨
  // 단, 비용 합계에는 항상 세금 포함
  const totalCosts = acquisitionCostTotal + holdingCostTotal + saleCostTotal + taxTotal;
  const totalInvestment = bidPrice + acquisitionCostTotal + holdingCostTotal + saleCostTotal - acquisitionCosts.loanAmount;

  const netProfit = effectiveSalePrice - bidPrice - acquisitionCostTotal - holdingCostTotal - saleCostTotal - taxTotal - vatPayable;

  const profitRate = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  const annualProfitRate = holdingMonths > 0 ? profitRate * (12 / holdingMonths) : 0;
  const monthlyProfit = holdingMonths > 0 ? netProfit / holdingMonths : 0;

  const breakEvenPrice = bidPrice + acquisitionCostTotal + holdingCostTotal + saleCostTotal + taxTotal + vatPayable;
  const breakEvenRateToAppraisal = propertyInfo.appraisalValue > 0
    ? (breakEvenPrice / propertyInfo.appraisalValue) * 100 : 0;

  // 3가지 세금 구조 비교
  const taxComparison = calcTaxComparisonDetail({
    bidPrice, salePrice: saleAmountForTax,
    acquisitionCosts, holdingCosts, holdingMonths, saleCosts,
    taxInfo, propertyInfo, capitalGainsTaxInfo,
  });

  const maxBidForTargetProfit = findMaxBid(
    propertyInfo, bidInfo, saleInfo, acquisitionCosts, holdingCosts, saleCosts, taxInfo, capitalGainsTaxInfo, vatInfo, targetProfit
  );
  const maxBidForTargetRate = findMaxBidForRate(
    propertyInfo, bidInfo, saleInfo, acquisitionCosts, holdingCosts, saleCosts, taxInfo, capitalGainsTaxInfo, vatInfo, targetProfitRate
  );
  const scenarios = generateScenarios(
    propertyInfo, bidInfo, saleInfo, acquisitionCosts, holdingCosts, saleCosts, taxInfo, capitalGainsTaxInfo, vatInfo
  );

  return {
    totalInvestment, totalCosts, grossProfit: tradingProfit, netProfit,
    profitRate, annualProfitRate, monthlyProfit, breakEvenPrice, breakEvenRateToAppraisal,
    acquisitionCostTotal, holdingCostTotal, saleCostTotal,
    taxTotal: effectiveBidderType === 'individual_trader' ? businessTaxTotal : taxTotal,
    vatPayable, isVatApplicable,
    taxComparison, maxBidForTargetProfit, maxBidForTargetRate, scenarios,
  };
};

// ====================================
// 역산 (이진탐색)
// ====================================
const buildCostsForBid = (
  propertyInfo: PropertyInfo, bidPrice: number,
  baseCosts: AcquisitionCosts, holdingCosts: HoldingCosts, saleCosts: SaleCosts
): { acq: AcquisitionCosts; sale: SaleCosts } => {
  const acquisitionTax = calcAcquisitionTax(propertyInfo.propertyType, bidPrice, propertyInfo.areaType);
  const registrationLicenseTax = bidPrice * 0.002;
  const localEduTax = registrationLicenseTax * 0.2;
  const stampDuty = calcStampDuty(bidPrice);
  return {
    acq: { ...baseCosts, acquisitionTax, registrationLicenseTax, localEducationTax: localEduTax, stampDuty },
    sale: { ...saleCosts },
  };
};

const findMaxBid = (
  propertyInfo: PropertyInfo, bidInfo: BidInfo, saleInfo: SaleInfo,
  baseCosts: AcquisitionCosts, holdingCosts: HoldingCosts, saleCosts: SaleCosts,
  taxInfo: TaxInfo, capitalGainsTaxInfo: CapitalGainsTaxInfo, vatInfo: VatInfo, targetProfit: number
): number => {
  if (targetProfit <= 0) return 0;
  const isVatApplicable = isVatSubject(propertyInfo.propertyType, propertyInfo.areaType);
  let lo = 0, hi = saleInfo.expectedSalePrice;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const testCosts = buildCostsForBid(propertyInfo, mid, baseCosts, holdingCosts, saleCosts);
    const acqTotal = calcAcquisitionCostTotal(testCosts.acq);
    const holdTotal = calcHoldingCostTotal(holdingCosts, saleInfo.holdingMonths);
    const saleTotal = calcSaleCostTotal(testCosts.sale);
    const vatResult = calcVat(vatInfo, saleInfo.expectedSalePrice, mid, isVatApplicable);
    const effectiveSalePrice = isVatApplicable && vatInfo.vatInclusionType === 'inclusive'
      ? saleInfo.expectedSalePrice - vatResult.outputVat : saleInfo.expectedSalePrice;
    const { comprehensiveIncomeTax, localIncomeTax } = calcTaxes(
      taxInfo, mid, effectiveSalePrice, testCosts.acq, holdingCosts, saleInfo.holdingMonths, testCosts.sale
    );
    const profit = effectiveSalePrice - mid - acqTotal - holdTotal - saleTotal
      - comprehensiveIncomeTax - localIncomeTax - vatResult.vatPayable;
    if (profit > targetProfit) lo = mid; else hi = mid;
  }
  return Math.floor(lo);
};

const findMaxBidForRate = (
  propertyInfo: PropertyInfo, bidInfo: BidInfo, saleInfo: SaleInfo,
  baseCosts: AcquisitionCosts, holdingCosts: HoldingCosts, saleCosts: SaleCosts,
  taxInfo: TaxInfo, capitalGainsTaxInfo: CapitalGainsTaxInfo, vatInfo: VatInfo, targetRate: number
): number => {
  if (targetRate <= 0) return 0;
  const isVatApplicable = isVatSubject(propertyInfo.propertyType, propertyInfo.areaType);
  let lo = 0, hi = saleInfo.expectedSalePrice;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const testCosts = buildCostsForBid(propertyInfo, mid, baseCosts, holdingCosts, saleCosts);
    const acqTotal = calcAcquisitionCostTotal(testCosts.acq);
    const holdTotal = calcHoldingCostTotal(holdingCosts, saleInfo.holdingMonths);
    const saleTotal = calcSaleCostTotal(testCosts.sale);
    const vatResult = calcVat(vatInfo, saleInfo.expectedSalePrice, mid, isVatApplicable);
    const effectiveSalePrice = isVatApplicable && vatInfo.vatInclusionType === 'inclusive'
      ? saleInfo.expectedSalePrice - vatResult.outputVat : saleInfo.expectedSalePrice;
    const { comprehensiveIncomeTax, localIncomeTax } = calcTaxes(
      taxInfo, mid, effectiveSalePrice, testCosts.acq, holdingCosts, saleInfo.holdingMonths, testCosts.sale
    );
    const netProfit = effectiveSalePrice - mid - acqTotal - holdTotal - saleTotal
      - comprehensiveIncomeTax - localIncomeTax - vatResult.vatPayable;
    const investment = mid + acqTotal + holdTotal + saleTotal - baseCosts.loanAmount;
    const rate = investment > 0 ? (netProfit / investment) * 100 : 0;
    if (rate > targetRate) lo = mid; else hi = mid;
  }
  return Math.floor(lo);
};

// ====================================
// 시나리오 생성
// ====================================
export const generateScenarios = (
  propertyInfo: PropertyInfo, bidInfo: BidInfo, saleInfo: SaleInfo,
  baseCosts: AcquisitionCosts, holdingCosts: HoldingCosts, saleCosts: SaleCosts,
  taxInfo: TaxInfo, capitalGainsTaxInfo: CapitalGainsTaxInfo, vatInfo: VatInfo
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
      ? saleInfo.expectedSalePrice - vatResult.outputVat : saleInfo.expectedSalePrice;
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
// 레버리지 분석
// ====================================
export const calcLeverageAnalysis = (
  propertyInfo: PropertyInfo, bidInfo: BidInfo, saleInfo: SaleInfo,
  baseCosts: AcquisitionCosts, holdingCosts: HoldingCosts, saleCosts: SaleCosts,
  taxInfo: TaxInfo, vatInfo: VatInfo
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
      ? saleInfo.expectedSalePrice - vatResult.outputVat : saleInfo.expectedSalePrice;
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

// 하위 호환 (구버전 Step6Result용)
export const calcTaxComparison = (
  tradingProfit: number, holdingMonths: number, businessTaxInfo: TaxInfo,
  bidPrice: number, salePrice: number,
  acquisitionCosts: AcquisitionCosts, holdingCosts: HoldingCosts, saleCosts: SaleCosts
): TaxComparison => {
  const { comprehensiveIncomeTax, localIncomeTax } = calcTaxes(
    businessTaxInfo, bidPrice, salePrice, acquisitionCosts, holdingCosts, holdingMonths, saleCosts
  );
  const businessTax = comprehensiveIncomeTax + localIncomeTax;
  const businessNetProfit = tradingProfit - businessTax;
  const acquisitionCostForDeduction =
    acquisitionCosts.acquisitionTax + acquisitionCosts.legalScrivenerFee + acquisitionCosts.registrationLicenseTax;
  const capitalGainsProfit = Math.max(0, tradingProfit - acquisitionCostForDeduction);
  const capitalGainsTax = calcCapitalGainsTax(capitalGainsProfit, holdingMonths);
  const individualTax = capitalGainsTax * 1.1;
  const individualNetProfit = tradingProfit - individualTax;
  const advantageous: 'business' | 'individual' = businessNetProfit >= individualNetProfit ? 'business' : 'individual';
  return { businessTax, individualTax, businessNetProfit, individualNetProfit, advantageous, difference: Math.abs(businessNetProfit - individualNetProfit) };
};
