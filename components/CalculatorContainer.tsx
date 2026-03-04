'use client';

import React, { useEffect } from 'react';
import { useCalculatorStore } from '@/store/calculatorStore';
import { ProgressBar, BottomSummaryBar } from '@/components/ui/inputs';
import { CalculationResult } from '@/types';
import dynamic from 'next/dynamic';

// 클라이언트 사이드 동적 임포트
const Step1PropertyInfo = dynamic(() => import('@/components/steps/Step1PropertyInfo'), { ssr: false });
const Step2BidInfo = dynamic(() => import('@/components/steps/Step2BidInfo'), { ssr: false });
const Step3SaleInfo = dynamic(() => import('@/components/steps/Step3SaleInfo'), { ssr: false });
const Step4Costs = dynamic(() => import('@/components/steps/Step4Costs'), { ssr: false });
const Step5Tax = dynamic(() => import('@/components/steps/Step5Tax'), { ssr: false });
const Step6Result = dynamic(() => import('@/components/steps/Step6Result'), { ssr: false });

const STEP_LABELS = ['물건정보', '입찰가', '매도예상', '비용입력', '세금계산', '결과'];

const EMPTY_RESULT: Partial<CalculationResult> = {
  netProfit: 0,
  profitRate: 0,
  totalInvestment: 0,
};

export default function CalculatorContainer() {
  const {
    currentStep,
    nextStep,
    prevStep,
    setCurrentStep,
    getResult,
    recalculateAutoFields,
  } = useCalculatorStore();

  // 초기 자동 계산
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    recalculateAutoFields();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 결과 계산 (매 렌더링마다 최신값 사용)
  let result: Partial<CalculationResult> = EMPTY_RESULT;
  try {
    result = getResult();
  } catch {
    result = EMPTY_RESULT;
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1PropertyInfo />;
      case 2: return <Step2BidInfo />;
      case 3: return <Step3SaleInfo />;
      case 4: return <Step4Costs />;
      case 5: return <Step5Tax />;
      case 6: return <Step6Result />;
      default: return <Step1PropertyInfo />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏛️</span>
              <div>
                <h1 className="text-sm font-bold text-white leading-tight">
                  경매 입찰가 계산기
                </h1>
                <p className="text-xs text-slate-400">부동산 매매사업자 기준</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm('모든 입력값을 초기화하시겠습니까?')) {
                  useCalculatorStore.getState().reset();
                }
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-slate-500"
            >
              초기화
            </button>
          </div>
          <ProgressBar
            currentStep={currentStep}
            totalSteps={6}
            stepLabels={STEP_LABELS}
          />
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-32">
        {renderStep()}

        {/* 이전/다음 버튼 */}
        <div className="flex gap-3 mt-8">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
            >
              ← 이전
            </button>
          )}
          {currentStep < 6 && (
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-colors"
            >
              다음 →
            </button>
          )}
          {currentStep === 6 && (
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
            >
              처음으로
            </button>
          )}
        </div>

        {/* 스텝 퀵 이동 (모바일용) */}
        <div className="mt-4 flex gap-1 justify-center">
          {STEP_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setCurrentStep(i + 1)}
              className={`w-6 h-1.5 rounded-full transition-all ${
                currentStep === i + 1 ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </main>

      {/* 하단 고정 바 */}
      <BottomSummaryBar
        netProfit={result.netProfit ?? 0}
        profitRate={result.profitRate ?? 0}
        totalInvestment={result.totalInvestment ?? 0}
      />
    </div>
  );
}
