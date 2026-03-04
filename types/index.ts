// ====================================
// 부동산 경매 입찰가 계산기 - 타입 정의
// ====================================

// 물건 종류
export type PropertyType =
  | 'apartment'     // 아파트
  | 'officetel'     // 오피스텔
  | 'villa'         // 다세대/빌라
  | 'house'         // 단독주택
  | 'commercial'    // 상가
  | 'land'          // 토지
  | 'neighborhood'  // 근린생활시설
  | 'factory';      // 공장

// 점유 상태
export type OccupancyStatus = 'vacant' | 'tenant' | 'owner';

// 매도 방식
export type SaleMethod = 'direct' | 'agent';

// 자유 입력 항목 (항목명 + 금액)
export interface CustomCostItem {
  id: string;
  name: string;
  amount: number;
  included: boolean; // 비용처리 포함 여부
}

// ====================================
// A. 물건 기본 정보
// ====================================
export interface PropertyInfo {
  propertyType: PropertyType;
  siDo: string;           // 시/도
  siGunGu: string;        // 시/군/구
  appraisalValue: number; // 감정가
  minimumBidPrice: number; // 최저입찰가
  failedBidCount: number; // 유찰 횟수
  depreciationRate: number; // 체감율 (20 또는 30)
  occupancyStatus: OccupancyStatus;
  tenantDeposit: number;  // 임차인 보증금
  priorRightAmount: number; // 선순위 권리분석 금액
  areaM2: number;         // 전용면적 (㎡)
  areaType: 'under85' | 'over85'; // 85㎡ 기준
}

// ====================================
// B. 입찰가 설정
// ====================================
export interface BidInfo {
  bidPrice: number;       // 입찰 희망가
  bidRateToAppraisal: number; // 감정가 대비 낙찰가율 (%)
  bidRateToMinimum: number;   // 최저가 대비 입찰가 비율 (%)
}

// ====================================
// C. 매도 예상가 설정
// ====================================
export interface SaleInfo {
  expectedSalePrice: number; // 예상 매도가
  holdingMonths: number;     // 예상 보유 기간 (개월)
  saleMethod: SaleMethod;    // 매도 방식
}

// ====================================
// D. 취득 시 비용
// ====================================
export interface AcquisitionCosts {
  // 자동 계산
  acquisitionTax: number;       // 취득세
  courtDepositInterestLoss: number; // 입찰보증금 이자 손실
  stampDuty: number;            // 인지대
  deliveryFee: number;          // 송달료
  registrationLicenseTax: number; // 등록면허세
  localEducationTax: number;    // 지방교육세 (등록면허세의 20%)
  courtRevenuestamp: number;    // 대법원 수입인지
  registrationFee: number;      // 등기신청 수수료

  // 수동 입력
  legalScrivenerFee: number;    // 법무사 비용
  evictionCost: {
    movingFee: number;          // 이사비
    litigationFee: number;      // 명도소송비
    enforcementFee: number;     // 강제집행비
  };
  unpaidManagementFee: number;  // 미납 관리비

  // 대출
  loanAmount: number;           // 대출 금액
  loanRate: number;             // 대출 금리 (연 %)
  loanMonths: number;           // 대출 기간 (개월)
  loanInterest: number;         // 대출 이자 (자동 계산)
  loanSetupFee: number;         // 대출 설정비

  // 기타
  customItems: CustomCostItem[];

  // 대출 이율 계산용
  depositLockMonths: number;    // 보증금 묶이는 기간 (일)
  annualInterestRate: number;   // 연이율 (%)
}

// ====================================
// E. 보유 시 비용
// ====================================
export interface HoldingCosts {
  propertyTax: number;          // 재산세 (연간)
  comprehensiveRealEstateTax: number; // 종합부동산세
  maintenanceFeeMonthly: number; // 월 관리비/공과금
  repairCosts: CustomCostItem[]; // 수리/인테리어 (항목별)
  insuranceFee: number;         // 보험료
  customItems: CustomCostItem[];
}

// ====================================
// F. 매도 시 비용
// ====================================
export interface SaleCosts {
  agentCommission: number;      // 중개보수 (자동 계산)
  agentCommissionRate: number;  // 중개보수율 (%)
  cancelRegistrationFee: number; // 말소 비용
  customItems: CustomCostItem[];
}

// ====================================
// G. 매매사업자 세금
// ====================================
export interface TaxInfo {
  // 비용처리 항목 체크박스
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
    vehicleExpense: boolean;   // 차량유지비
    communicationFee: boolean; // 통신비
    officeRent: boolean;       // 사무실 임차료
    advertisingFee: boolean;   // 광고비
  };
  
  // 기타 사업경비
  vehicleExpense: number;       // 차량유지비
  communicationFee: number;     // 통신비
  officeRent: number;           // 사무실 임차료
  advertisingFee: number;       // 광고비
  customBusinessExpenses: CustomCostItem[];

  // 기존 소득 합산
  existingIncome: number;       // 다른 사업소득/근로소득 합산

  // 기본공제
  basicDeduction: number;       // 기본공제 (150만원 기본)

  // 계산 결과
  tradingProfit: number;        // 매매차익
  totalDeductible: number;      // 비용처리 합계
  taxBase: number;              // 과세표준
  comprehensiveIncomeTax: number; // 종합소득세
  localIncomeTax: number;       // 지방소득세
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
  
  // 고급 기능
  targetProfit: number;         // 목표 순수익
  targetProfitRate: number;     // 목표 수익률
  
  // 저장 이력
  savedCalculations: SavedCalculation[];
  
  // 최근 낙찰 통계
  areaAvgBidRate: number;       // 지역 평균 낙찰가율
}

// 저장된 계산 이력
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
  totalInvestment: number;      // 총 투자금 (실투자금)
  totalCosts: number;           // 총 비용 합계
  grossProfit: number;          // 매매차익 (세전)
  netProfit: number;            // 순수익 (세후)
  profitRate: number;           // 수익률 (%)
  annualProfitRate: number;     // 연환산 수익률 (%)
  monthlyProfit: number;        // 월평균 수익
  breakEvenPrice: number;       // 손익분기점 매도가
  breakEvenRateToAppraisal: number; // 손익분기점 감정가 대비 비율

  // 비용 상세
  acquisitionCostTotal: number;
  holdingCostTotal: number;
  saleCostTotal: number;
  taxTotal: number;

  // 역산
  maxBidForTargetProfit: number;    // 목표 순수익 달성 최대 입찰가
  maxBidForTargetRate: number;      // 목표 수익률 달성 최대 입찰가

  // 시나리오 (입찰가율 60~100%)
  scenarios: ScenarioRow[];
}

// 시나리오 테이블 행
export interface ScenarioRow {
  bidRatePercent: number;       // 입찰가율 (%)
  bidPrice: number;             // 입찰가
  netProfit: number;            // 순수익
  profitRate: number;           // 수익률
  annualProfitRate: number;     // 연환산 수익률
}

// 대출 레버리지 분석
export interface LeverageAnalysis {
  ltvRatio: number;             // LTV 비율 (%)
  loanAmount: number;           // 대출금
  ownCapital: number;           // 자기자본
  netProfit: number;            // 순수익
  roe: number;                  // 자기자본수익률 (ROE)
  totalProfitRate: number;      // 전체 수익률
}

// 세금 비교 (매매사업자 vs 개인 양도세)
export interface TaxComparison {
  businessTax: number;          // 매매사업자 세금 (종합소득세 + 지방소득세)
  individualTax: number;        // 개인 양도세 (양도소득세 + 지방소득세)
  businessNetProfit: number;    // 매매사업자 순수익
  individualNetProfit: number;  // 개인 순수익
  advantageous: 'business' | 'individual'; // 유리한 쪽
  difference: number;           // 차이
}
