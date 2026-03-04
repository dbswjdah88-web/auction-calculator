// ====================================
// Zustand 스토어
// ====================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CalculatorState,
  PropertyInfo,
  BidInfo,
  SaleInfo,
  AcquisitionCosts,
  HoldingCosts,
  SaleCosts,
  TaxInfo,
  CustomCostItem,
  SavedCalculation,
  CalculationResult,
} from '@/types';
import {
  calculateResult,
  calcMinimumBidPrice,
  calcAcquisitionTax,
  calcStampDuty,
  calcAgentCommission,
  calcLoanInterest,
  calcPropertyTax,
} from '@/lib/calculator';


// ====================================
// 초기값 정의
// ====================================

const initialPropertyInfo: PropertyInfo = {
  propertyType: 'apartment',
  siDo: '서울특별시',
  siGunGu: '강남구',
  appraisalValue: 500_000_000,
  minimumBidPrice: 500_000_000,
  failedBidCount: 0,
  depreciationRate: 20,
  occupancyStatus: 'vacant',
  tenantDeposit: 0,
  priorRightAmount: 0,
  areaM2: 84,
  areaType: 'under85',
};

const initialBidInfo: BidInfo = {
  bidPrice: 400_000_000,
  bidRateToAppraisal: 80,
  bidRateToMinimum: 100,
};

const initialSaleInfo: SaleInfo = {
  expectedSalePrice: 550_000_000,
  holdingMonths: 6,
  saleMethod: 'agent',
};

const initialAcquisitionCosts: AcquisitionCosts = {
  acquisitionTax: 0,
  courtDepositInterestLoss: 0,
  stampDuty: 0,
  deliveryFee: 65_000,
  registrationLicenseTax: 0,
  localEducationTax: 0,
  courtRevenuestamp: 15_000,
  registrationFee: 15_000,
  legalScrivenerFee: 500_000,
  evictionCost: {
    movingFee: 0,
    litigationFee: 0,
    enforcementFee: 0,
  },
  unpaidManagementFee: 0,
  loanAmount: 0,
  loanRate: 4.0,
  loanMonths: 6,
  loanInterest: 0,
  loanSetupFee: 0,
  customItems: [],
  depositLockMonths: 30,
  annualInterestRate: 3.5,
};

const initialHoldingCosts: HoldingCosts = {
  propertyTax: 0,
  comprehensiveRealEstateTax: 0,
  maintenanceFeeMonthly: 0,
  repairCosts: [],
  insuranceFee: 0,
  customItems: [],
};

const initialSaleCosts: SaleCosts = {
  agentCommission: 0,
  agentCommissionRate: 0.4,
  cancelRegistrationFee: 0,
  customItems: [],
};

const initialTaxInfo: TaxInfo = {
  deductibleItems: {
    acquisitionTax: true,
    legalScrivenerFee: true,
    registrationFee: true,
    evictionCost: true,
    unpaidManagementFee: true,
    loanInterest: true,
    repairCosts: true,
    agentCommission: true,
    propertyTax: true,
    vehicleExpense: false,
    communicationFee: false,
    officeRent: false,
    advertisingFee: false,
  },
  vehicleExpense: 0,
  communicationFee: 0,
  officeRent: 0,
  advertisingFee: 0,
  customBusinessExpenses: [],
  existingIncome: 0,
  basicDeduction: 1_500_000,
  tradingProfit: 0,
  totalDeductible: 0,
  taxBase: 0,
  comprehensiveIncomeTax: 0,
  localIncomeTax: 0,
};

// ====================================
// 스토어 액션 타입
// ====================================
interface CalculatorActions {
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // 물건 정보 업데이트
  updatePropertyInfo: (updates: Partial<PropertyInfo>) => void;

  // 입찰가 업데이트
  updateBidInfo: (updates: Partial<BidInfo>) => void;
  setBidPrice: (price: number) => void;
  setBidRateToAppraisal: (rate: number) => void;

  // 매도 정보 업데이트
  updateSaleInfo: (updates: Partial<SaleInfo>) => void;

  // 비용 업데이트
  updateAcquisitionCosts: (updates: Partial<AcquisitionCosts>) => void;
  updateHoldingCosts: (updates: Partial<HoldingCosts>) => void;
  updateSaleCosts: (updates: Partial<SaleCosts>) => void;
  updateTaxInfo: (updates: Partial<TaxInfo>) => void;

  // 커스텀 항목 관리
  addCustomItem: (section: 'acquisition' | 'holding' | 'sale' | 'tax' | 'repair', item: Omit<CustomCostItem, 'id'>) => void;
  removeCustomItem: (section: 'acquisition' | 'holding' | 'sale' | 'tax' | 'repair', id: string) => void;
  updateCustomItem: (section: 'acquisition' | 'holding' | 'sale' | 'tax' | 'repair', id: string, updates: Partial<CustomCostItem>) => void;

  // 목표 설정
  setTargetProfit: (profit: number) => void;
  setTargetProfitRate: (rate: number) => void;
  setAreaAvgBidRate: (rate: number) => void;

  // 전체 재계산 (자동 비용 업데이트)
  recalculateAutoFields: () => void;

  // 계산 결과 가져오기
  getResult: () => CalculationResult;

  // 저장/불러오기
  saveCalculation: (name: string) => void;
  loadCalculation: (id: string) => void;
  deleteCalculation: (id: string) => void;

  // 초기화
  reset: () => void;
}

// ====================================
// 스토어 생성
// ====================================
export const useCalculatorStore = create<CalculatorState & CalculatorActions>()(
  persist(
    (set, get) => ({
      // 초기 상태
      currentStep: 1,
      propertyInfo: initialPropertyInfo,
      bidInfo: initialBidInfo,
      saleInfo: initialSaleInfo,
      acquisitionCosts: initialAcquisitionCosts,
      holdingCosts: initialHoldingCosts,
      saleCosts: initialSaleCosts,
      taxInfo: initialTaxInfo,
      targetProfit: 30_000_000,
      targetProfitRate: 10,
      savedCalculations: [],
      areaAvgBidRate: 80,

      // 스텝 이동
      setCurrentStep: (step) => set({ currentStep: step }),
      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(state.currentStep + 1, 6),
        })),
      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(state.currentStep - 1, 1),
        })),

      // 물건 정보 업데이트
      updatePropertyInfo: (updates) => {
        set((state) => ({
          propertyInfo: { ...state.propertyInfo, ...updates },
        }));
        // 유찰 횟수 변경 시 최저입찰가 재계산
        const { propertyInfo } = get();
        const newInfo = { ...propertyInfo, ...updates };
        const newMinPrice = calcMinimumBidPrice(
          newInfo.appraisalValue,
          newInfo.failedBidCount,
          newInfo.depreciationRate
        );
        set((state) => ({
          propertyInfo: { ...state.propertyInfo, minimumBidPrice: newMinPrice },
        }));
        get().recalculateAutoFields();
      },

      // 입찰가 업데이트
      updateBidInfo: (updates) => {
        set((state) => ({
          bidInfo: { ...state.bidInfo, ...updates },
        }));
        get().recalculateAutoFields();
      },

      setBidPrice: (price) => {
        const { propertyInfo } = get();
        const rateToAppraisal =
          propertyInfo.appraisalValue > 0
            ? (price / propertyInfo.appraisalValue) * 100
            : 0;
        const rateToMinimum =
          propertyInfo.minimumBidPrice > 0
            ? (price / propertyInfo.minimumBidPrice) * 100
            : 0;
        set((state) => ({
          bidInfo: {
            ...state.bidInfo,
            bidPrice: price,
            bidRateToAppraisal: rateToAppraisal,
            bidRateToMinimum: rateToMinimum,
          },
        }));
        get().recalculateAutoFields();
      },

      setBidRateToAppraisal: (rate) => {
        const { propertyInfo } = get();
        const price = Math.round(propertyInfo.appraisalValue * (rate / 100));
        const rateToMinimum =
          propertyInfo.minimumBidPrice > 0
            ? (price / propertyInfo.minimumBidPrice) * 100
            : 0;
        set((state) => ({
          bidInfo: {
            ...state.bidInfo,
            bidPrice: price,
            bidRateToAppraisal: rate,
            bidRateToMinimum: rateToMinimum,
          },
        }));
        get().recalculateAutoFields();
      },

      // 매도 정보 업데이트
      updateSaleInfo: (updates) => {
        set((state) => ({
          saleInfo: { ...state.saleInfo, ...updates },
        }));
        get().recalculateAutoFields();
      },

      // 비용 업데이트
      updateAcquisitionCosts: (updates) => {
        set((state) => ({
          acquisitionCosts: { ...state.acquisitionCosts, ...updates },
        }));
      },

      updateHoldingCosts: (updates) => {
        set((state) => ({
          holdingCosts: { ...state.holdingCosts, ...updates },
        }));
      },

      updateSaleCosts: (updates) => {
        set((state) => ({
          saleCosts: { ...state.saleCosts, ...updates },
        }));
      },

      updateTaxInfo: (updates) => {
        set((state) => ({
          taxInfo: { ...state.taxInfo, ...updates },
        }));
      },

      // 커스텀 항목 관리
      addCustomItem: (section, item) => {
        const newItem: CustomCostItem = {
          ...item,
          id: Math.random().toString(36).substr(2, 9),
        };
        set((state) => {
          if (section === 'acquisition') {
            return {
              acquisitionCosts: {
                ...state.acquisitionCosts,
                customItems: [...state.acquisitionCosts.customItems, newItem],
              },
            };
          } else if (section === 'holding') {
            return {
              holdingCosts: {
                ...state.holdingCosts,
                customItems: [...state.holdingCosts.customItems, newItem],
              },
            };
          } else if (section === 'sale') {
            return {
              saleCosts: {
                ...state.saleCosts,
                customItems: [...state.saleCosts.customItems, newItem],
              },
            };
          } else if (section === 'tax') {
            return {
              taxInfo: {
                ...state.taxInfo,
                customBusinessExpenses: [
                  ...state.taxInfo.customBusinessExpenses,
                  newItem,
                ],
              },
            };
          } else if (section === 'repair') {
            return {
              holdingCosts: {
                ...state.holdingCosts,
                repairCosts: [...state.holdingCosts.repairCosts, newItem],
              },
            };
          }
          return state;
        });
      },

      removeCustomItem: (section, id) => {
        set((state) => {
          if (section === 'acquisition') {
            return {
              acquisitionCosts: {
                ...state.acquisitionCosts,
                customItems: state.acquisitionCosts.customItems.filter((i) => i.id !== id),
              },
            };
          } else if (section === 'holding') {
            return {
              holdingCosts: {
                ...state.holdingCosts,
                customItems: state.holdingCosts.customItems.filter((i) => i.id !== id),
              },
            };
          } else if (section === 'sale') {
            return {
              saleCosts: {
                ...state.saleCosts,
                customItems: state.saleCosts.customItems.filter((i) => i.id !== id),
              },
            };
          } else if (section === 'tax') {
            return {
              taxInfo: {
                ...state.taxInfo,
                customBusinessExpenses: state.taxInfo.customBusinessExpenses.filter(
                  (i) => i.id !== id
                ),
              },
            };
          } else if (section === 'repair') {
            return {
              holdingCosts: {
                ...state.holdingCosts,
                repairCosts: state.holdingCosts.repairCosts.filter((i) => i.id !== id),
              },
            };
          }
          return state;
        });
      },

      updateCustomItem: (section, id, updates) => {
        set((state) => {
          const updateItems = (items: CustomCostItem[]) =>
            items.map((item) => (item.id === id ? { ...item, ...updates } : item));

          if (section === 'acquisition') {
            return {
              acquisitionCosts: {
                ...state.acquisitionCosts,
                customItems: updateItems(state.acquisitionCosts.customItems),
              },
            };
          } else if (section === 'holding') {
            return {
              holdingCosts: {
                ...state.holdingCosts,
                customItems: updateItems(state.holdingCosts.customItems),
              },
            };
          } else if (section === 'sale') {
            return {
              saleCosts: {
                ...state.saleCosts,
                customItems: updateItems(state.saleCosts.customItems),
              },
            };
          } else if (section === 'tax') {
            return {
              taxInfo: {
                ...state.taxInfo,
                customBusinessExpenses: updateItems(state.taxInfo.customBusinessExpenses),
              },
            };
          } else if (section === 'repair') {
            return {
              holdingCosts: {
                ...state.holdingCosts,
                repairCosts: updateItems(state.holdingCosts.repairCosts),
              },
            };
          }
          return state;
        });
      },

      // 목표 설정
      setTargetProfit: (profit) => set({ targetProfit: profit }),
      setTargetProfitRate: (rate) => set({ targetProfitRate: rate }),
      setAreaAvgBidRate: (rate) => set({ areaAvgBidRate: rate }),

      // 자동 필드 재계산
      recalculateAutoFields: () => {
        const { propertyInfo, bidInfo, saleInfo, acquisitionCosts, holdingCosts } = get();
        const { bidPrice } = bidInfo;
        const { holdingMonths, saleMethod, expectedSalePrice } = saleInfo;

        // 취득세
        const acquisitionTax = calcAcquisitionTax(
          propertyInfo.propertyType,
          bidPrice,
          propertyInfo.areaType
        );

        // 등록면허세: 낙찰가 × 0.2%
        const registrationLicenseTax = bidPrice * 0.002;
        const localEducationTax = registrationLicenseTax * 0.2;

        // 인지대
        const stampDuty = calcStampDuty(bidPrice);

        // 입찰보증금 이자 손실
        const depositAmount = bidPrice * 0.1;
        const courtDepositInterestLoss =
          depositAmount *
          (acquisitionCosts.depositLockMonths / 365) *
          (acquisitionCosts.annualInterestRate / 100);

        // 대출 이자
        const loanInterest = calcLoanInterest(
          acquisitionCosts.loanAmount,
          acquisitionCosts.loanRate,
          holdingMonths
        );

        // 재산세
        const propertyTax = calcPropertyTax(
          propertyInfo.propertyType,
          bidPrice,
          holdingMonths
        );

        // 중개보수
        const agentCommission = calcAgentCommission(expectedSalePrice, saleMethod);
        const agentCommissionRate =
          expectedSalePrice > 0 ? (agentCommission / expectedSalePrice) * 100 : 0;

        set((state) => ({
          acquisitionCosts: {
            ...state.acquisitionCosts,
            acquisitionTax,
            registrationLicenseTax,
            localEducationTax,
            stampDuty,
            courtDepositInterestLoss,
            loanInterest,
          },
          holdingCosts: {
            ...state.holdingCosts,
            propertyTax,
          },
          saleCosts: {
            ...state.saleCosts,
            agentCommission,
            agentCommissionRate,
          },
        }));
      },

      // 계산 결과
      getResult: (): CalculationResult => {
        const {
          propertyInfo,
          bidInfo,
          saleInfo,
          acquisitionCosts,
          holdingCosts,
          saleCosts,
          taxInfo,
          targetProfit,
          targetProfitRate,
        } = get();

        return calculateResult(
          propertyInfo,
          bidInfo,
          saleInfo,
          acquisitionCosts,
          holdingCosts,
          saleCosts,
          taxInfo,
          targetProfit,
          targetProfitRate
        );
      },

      // 저장
      saveCalculation: (name) => {
        const state = get();
        const result = state.getResult();
        const newSave: SavedCalculation = {
          id: Math.random().toString(36).substr(2, 9),
          name,
          date: new Date().toLocaleDateString('ko-KR'),
          summary: result,
          state: {
            propertyInfo: state.propertyInfo,
            bidInfo: state.bidInfo,
            saleInfo: state.saleInfo,
            acquisitionCosts: state.acquisitionCosts,
            holdingCosts: state.holdingCosts,
            saleCosts: state.saleCosts,
            taxInfo: state.taxInfo,
          },
        };
        set((s) => ({
          savedCalculations: [newSave, ...s.savedCalculations].slice(0, 20),
        }));
      },

      loadCalculation: (id) => {
        const { savedCalculations } = get();
        const saved = savedCalculations.find((s) => s.id === id);
        if (saved && saved.state) {
          set((s) => ({
            ...s,
            ...(saved.state as Partial<CalculatorState>),
          }));
        }
      },

      deleteCalculation: (id) => {
        set((state) => ({
          savedCalculations: state.savedCalculations.filter((s) => s.id !== id),
        }));
      },

      // 초기화
      reset: () => {
        set({
          currentStep: 1,
          propertyInfo: initialPropertyInfo,
          bidInfo: initialBidInfo,
          saleInfo: initialSaleInfo,
          acquisitionCosts: initialAcquisitionCosts,
          holdingCosts: initialHoldingCosts,
          saleCosts: initialSaleCosts,
          taxInfo: initialTaxInfo,
          targetProfit: 30_000_000,
          targetProfitRate: 10,
          areaAvgBidRate: 80,
        });
      },
    }),
    {
      name: 'auction-calculator-storage',
      version: 1,
    }
  )
);
