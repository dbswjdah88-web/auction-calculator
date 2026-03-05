// ====================================
// 부동산 경매 입찰가 계산기 - 타입 정의 v3
// ====================================

export type PropertyType =
  | 'apartment'     // 아파트
  | 'officetel'     // 오피스텔
  | 'villa'         // 다세대/빌라
  | 'house'         // 단독주택
  | 'commercial'    // 상가
  | 'land'          // 토지
  | 'neighborhood'  // 근린생활시설
  | 'factory';      // 공장

export type OccupancyStatus = 'vacant' | 'tenant' | 'owner';
export type SaleMethod = 'direct' | 'agent';

/** 입찰자 구분: 개인 vs 법인 */
export type BidderType = 'individual' | 'corporation';

/** 주택 보유 수 (1주택/2주택/3주택이상) */
export type HousingCount = 'one' | 'two' | 'three_plus';

/** 양도소득세 과세 방식 선택 */
export type CapitalGainsTaxMode =
  | 'business'        // 매매사업자 종합소득세
  | 'individual_cgt'  // 개인 양도소득세
  | 'corporation';    // 법인세

/** 지역 구분 (주택 양도세 중과 판단) */
export type RegulationZone =
  | 'normal'          // 일반지역
  | 'speculation'     // 투기지역
  | 'overheated'      // 투기과열지구
  | 'land_trade';     // 토지거래허가구역

/** 법인 구분 */
export type CorporationType = 'general' | 'small_medium'; // 일반법인/중소기업

export interface CustomCostItem {
  id: string;
  name: string;
  amount: number;
  included: boolean;
}

// ====================================
// A. 물건 기본 정보
// ====================================
export interface PropertyInfo {
  propertyType: PropertyType;
  siDo: string;
  siGunGu: string;
  appraisalValue: number;
  minimumBidPrice: number;
  failedBidCount: number;
  depreciationRate: number;
  occupancyStatus: OccupancyStatus;
  tenantDeposit: number;
  priorRightAmount: number;
  areaM2: number;
  areaType: 'under85' | 'over85';
  // 신규: 규제지역
  regulationZone: RegulationZone;
  // 신규: 주택 보유 수 (양도세 중과 적용 시)
  housingCount: HousingCount;
  // 신규: 입찰자 구분
  bidderType: BidderType;
  // 신규: 법인 구분
  corporationType: CorporationType;
}

// ====================================
// B. 입찰가 설정
// ====================================
export interface BidInfo {
  bidPrice: number;
  bidRateToAppraisal: number;
  bidRateToMinimum: number;
}

// ====================================
// C. 매도 예상가 설정
// ====================================
export interface SaleInfo {
  expectedSalePrice: number;
  holdingMonths: number;
  saleMethod: SaleMethod;
}

// ====================================
// D. 취득 시 비용
// ====================================
export interface EvictionCostDetail {
  movingFee: number;          // 이사비
  litigationFee: number;      // 명도소송비
  enforcementFee: number;     // 강제집행비
  keyMoney: number;           // 합의금/위로금
  cleanupFee: number;         // 청소/폐기물처리비
}

export interface RepairCostDetail {
  id: string;
  category: 'plumbing' | 'electrical' | 'interior' | 'exterior' | 'appliance' | 'other';
  name: string;
  amount: number;
  included: boolean;
}

export interface AcquisitionCosts {
  acquisitionTax: number;
  courtDepositInterestLoss: number;
  stampDuty: number;
  deliveryFee: number;
  registrationLicenseTax: number;
  localEducationTax: number;
  courtRevenuestamp: number;
  registrationFee: number;
  legalScrivenerFee: number;
  evictionCost: EvictionCostDetail;
  unpaidManagementFee: number;
  loanAmount: number;
  loanRate: number;
  loanMonths: number;
  loanInterest: number;
  loanSetupFee: number;
  customItems: CustomCostItem[];
  depositLockMonths: number;
  annualInterestRate: number;
}

// ====================================
// E. 보유 시 비용
// ====================================
export interface HoldingCosts {
  propertyTax: number;
  comprehensiveRealEstateTax: number;
  maintenanceFeeMonthly: number;
  repairCosts: CustomCostItem[];
  repairCostDetails: RepairCostDetail[];  // 신규: 카테고리별 수리비
  insuranceFee: number;
  customItems: CustomCostItem[];
}

// ====================================
// F. 매도 시 비용
// ====================================
export interface SaleCosts {
  agentCommission: number;
  agentCommissionRate: number;
  cancelRegistrationFee: number;
  // 신규: 중개보수 세부 분리
  agentCommissionBuy: number;   // 매수 측 중개보수 (취득 비용)
  agentCommissionSell: number;  // 매도 측 중개보수 (매도 비용)
  customItems: CustomCostItem[];
}

// ====================================
// G-1. 매매사업자 종합소득세 정보
// ====================================
export interface TaxInfo {
  deductibleItems: {
    acquisitionTax: boolean;
    legalScrivenerFee: boolean;
    registrationFee: boolean;
    evictionCost: boolean;
    unpaidManagementFee: boolean;
    loanInterest: boolean;
    repairCosts: boolean;
    agentCommission: boolean;
    propertyTax: boolean;
    vehicleExpense: boolean;
    communicationFee: boolean;
    officeRent: boolean;
    advertisingFee: boolean;
  };
  vehicleExpense: number;
  communicationFee: number;
  officeRent: number;
  advertisingFee: number;
  customBusinessExpenses: CustomCostItem[];
  existingIncome: number;
  basicDeduction: number;
  tradingProfit: number;
  totalDeductible: number;
  taxBase: number;
  comprehensiveIncomeTax: number;
  localIncomeTax: number;
}

// ====================================
// G-2. 양도소득세 상세 설정 (개인)
// ====================================
export interface CapitalGainsTaxInfo {
  /** 과세 방식 선택 */
  taxMode: CapitalGainsTaxMode;

  // 개인 양도소득세 관련
  housingCount: HousingCount;       // 주택 보유 수
  regulationZone: RegulationZone;   // 규제지역
  isNonbusiness: boolean;           // 비사업용 토지 여부
  hasLongTermDeduction: boolean;    // 장기보유특별공제 적용 여부

  // 장기보유특별공제율 (직접 입력 or 자동계산)
  longTermDeductionRate: number;    // % (0~80)
  autoLongTermDeduction: boolean;   // 자동계산 여부

  // 기본공제 (250만원)
  basicDeduction: number;

  // 취득가액 공제 (필요경비)
  deductibleAcquisitionCosts: boolean;  // 취득세/법무사 등 공제 여부
  deductibleRepairCosts: boolean;       // 수리비 공제 여부

  // 1세대 1주택 비과세 (2년 거주)
  isOneHousehold: boolean;
  residencyYears: number;

  // 법인 관련
  corporationType: CorporationType;
  corporateTaxBaseIncome: number;   // 법인 기타 과세표준 소득 (누진 적용용)

  // 계산 결과 (자동)
  capitalGainsProfit: number;       // 양도차익
  longTermDeductionAmount: number;  // 장기보유특별공제액
  taxableIncome: number;            // 과세표준
  capitalGainsTax: number;          // 양도소득세
  localCapitalGainsTax: number;     // 지방소득세
  totalTax: number;                 // 합계
  netProfit: number;                // 세후 순수익
}

// ====================================
// 전체 계산기 상태
// ====================================
export interface CalculatorState {
  currentStep: number;
  propertyInfo: PropertyInfo;
  bidInfo: BidInfo;
  saleInfo: SaleInfo;
  acquisitionCosts: AcquisitionCosts;
  holdingCosts: HoldingCosts;
  saleCosts: SaleCosts;
  taxInfo: TaxInfo;
  capitalGainsTaxInfo: CapitalGainsTaxInfo;
  vatInfo: VatInfo;
  targetProfit: number;
  targetProfitRate: number;
  savedCalculations: SavedCalculation[];
  areaAvgBidRate: number;
}

export interface SavedCalculation {
  id: string;
  name: string;
  date: string;
  summary: CalculationResult;
  state: Partial<CalculatorState>;
}

// ====================================
// 계산 결과
// ====================================
export interface CalculationResult {
  totalInvestment: number;
  totalCosts: number;
  grossProfit: number;
  netProfit: number;
  profitRate: number;
  annualProfitRate: number;
  monthlyProfit: number;
  breakEvenPrice: number;
  breakEvenRateToAppraisal: number;

  acquisitionCostTotal: number;
  holdingCostTotal: number;
  saleCostTotal: number;
  taxTotal: number;
  vatPayable: number;
  isVatApplicable: boolean;

  // 세금 비교 결과 (3가지)
  taxComparison: TaxComparisonDetail;

  maxBidForTargetProfit: number;
  maxBidForTargetRate: number;
  scenarios: ScenarioRow[];
}

/** 3가지 세금 구조 비교 */
export interface TaxComparisonDetail {
  // 매매사업자 (종합소득세)
  business: {
    tax: number;
    netProfit: number;
    effectiveRate: number;
  };
  // 개인 양도소득세
  individual: {
    tax: number;
    netProfit: number;
    effectiveRate: number;
    breakdown: {
      capitalGains: number;
      longTermDeduction: number;
      basicDeduction: number;
      taxBase: number;
      cgt: number;
      localTax: number;
    };
  };
  // 법인세
  corporation: {
    tax: number;
    netProfit: number;
    effectiveRate: number;
    type: CorporationType;
  };
  best: 'business' | 'individual' | 'corporation';
  bestSavings: number;
}

export interface ScenarioRow {
  bidRatePercent: number;
  bidPrice: number;
  netProfit: number;
  profitRate: number;
  annualProfitRate: number;
}

export interface LeverageAnalysis {
  ltvRatio: number;
  loanAmount: number;
  ownCapital: number;
  netProfit: number;
  roe: number;
  totalProfitRate: number;
}

export interface TaxComparison {
  businessTax: number;
  individualTax: number;
  businessNetProfit: number;
  individualNetProfit: number;
  advantageous: 'business' | 'individual';
  difference: number;
}

// ====================================
// VAT
// ====================================
export type LandBuildingAllocMethod = 'standard' | 'appraisal' | 'direct';
export type VatInclusionType = 'exclusive' | 'inclusive';
export type PurchaseVatType = 'included' | 'separate' | 'none';

export interface VatInfo {
  isVatApplicable: boolean;
  allocMethod: LandBuildingAllocMethod;
  landStandardPrice: number;
  buildingStandardPrice: number;
  landUnitPrice: number;
  landAreaM2: number;
  landAppraisalPrice: number;
  buildingAppraisalPrice: number;
  buildingDirectAmount: number;
  landDirectAmount: number;
  buildingRatio: number;
  landRatio: number;
  buildingSaleAmount: number;
  landSaleAmount: number;
  vatInclusionType: VatInclusionType;
  outputVat: number;
  buildingSupplyAmount: number;
  purchaseVatType: PurchaseVatType;
  inputVatFromPurchase: number;
  inputVatInterior: number;
  inputVatLegalScrivener: number;
  inputVatAgentCommission: number;
  customInputVatItems: Array<{ id: string; name: string; amount: number }>;
  totalInputVat: number;
  vatPayable: number;
}
