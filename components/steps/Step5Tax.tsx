'use client';

import React from 'react';
import { useCalculatorStore } from '@/store/calculatorStore';
import {
  MoneyInput,
  SectionHeader,
  CheckboxItem,
  CustomItemList,
  CostSummaryRow,
} from '@/components/ui/inputs';
import { formatCurrencyKorean, calcTaxes } from '@/lib/calculator';

export default function Step5Tax() {
  const {
    bidInfo,
    saleInfo,
    acquisitionCosts,
    holdingCosts,
    saleCosts,
    taxInfo,
    updateTaxInfo,
    addCustomItem,
    removeCustomItem,
    updateCustomItem,
  } = useCalculatorStore();

  // 실시간 세금 계산
  const taxResult = calcTaxes(
    taxInfo,
    bidInfo.bidPrice,
    saleInfo.expectedSalePrice,
    acquisitionCosts,
    holdingCosts,
    saleInfo.holdingMonths,
    saleCosts
  );

  const updateDeductible = (key: keyof typeof taxInfo.deductibleItems, value: boolean) => {
    updateTaxInfo({
      deductibleItems: {
        ...taxInfo.deductibleItems,
        [key]: value,
      },
    });
  };

  // 비용처리 항목들 (체크박스)
  const deductibleList = [
    {
      key: 'acquisitionTax' as const,
      label: '취득세 및 부대세금',
      sublabel: '취득세 + 지방교육세 + 농어촌특별세',
      amount: acquisitionCosts.acquisitionTax,
    },
    {
      key: 'legalScrivenerFee' as const,
      label: '법무사 비용',
      sublabel: '등기대리 법무사 비용',
      amount: acquisitionCosts.legalScrivenerFee,
    },
    {
      key: 'registrationFee' as const,
      label: '등기 비용',
      sublabel: '등록면허세 + 인지대 + 수수료',
      amount:
        acquisitionCosts.registrationLicenseTax +
        acquisitionCosts.localEducationTax +
        acquisitionCosts.courtRevenuestamp +
        acquisitionCosts.stampDuty +
        acquisitionCosts.registrationFee,
    },
    {
      key: 'evictionCost' as const,
      label: '명도 비용',
      sublabel: '이사비 + 명도소송비 + 강제집행비',
      amount:
        acquisitionCosts.evictionCost.movingFee +
        acquisitionCosts.evictionCost.litigationFee +
        acquisitionCosts.evictionCost.enforcementFee,
    },
    {
      key: 'unpaidManagementFee' as const,
      label: '미납 관리비',
      sublabel: '인수한 미납 관리비',
      amount: acquisitionCosts.unpaidManagementFee,
    },
    {
      key: 'loanInterest' as const,
      label: '대출 이자',
      sublabel: '사업용 대출 이자에 한함',
      amount: acquisitionCosts.loanInterest,
    },
    {
      key: 'repairCosts' as const,
      label: '수리/인테리어 비용',
      sublabel: '자본적지출 해당분',
      amount: holdingCosts.repairCosts.reduce((s, i) => s + i.amount, 0),
    },
    {
      key: 'agentCommission' as const,
      label: '중개보수',
      sublabel: '매도 시 중개보수',
      amount: saleCosts.agentCommission,
    },
    {
      key: 'propertyTax' as const,
      label: '재산세',
      sublabel: '보유 기간 재산세',
      amount: holdingCosts.propertyTax,
    },
    {
      key: 'vehicleExpense' as const,
      label: '차량유지비',
      sublabel: '사업용 차량 (한도 1,500만원/년)',
      amount: Math.min(taxInfo.vehicleExpense, 15_000_000),
    },
    {
      key: 'communicationFee' as const,
      label: '통신비',
      sublabel: '사업용 통신비',
      amount: taxInfo.communicationFee,
    },
    {
      key: 'officeRent' as const,
      label: '사무실 임차료',
      sublabel: '사업용 사무실',
      amount: taxInfo.officeRent,
    },
    {
      key: 'advertisingFee' as const,
      label: '광고비',
      sublabel: '매물 홍보 광고비',
      amount: taxInfo.advertisingFee,
    },
  ];

  return (
    <div className="space-y-8">
      <SectionHeader
        title="매매사업자 세금 계산"
        description="매매사업자는 양도소득세 대신 종합소득세로 과세됩니다."
        icon="📊"
      />

      {/* 매매차익 표시 */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">매매차익 (매도가 - 낙찰가)</span>
          <span className={`font-mono font-bold ${taxResult.tradingProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrencyKorean(taxResult.tradingProfit)}
          </span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {formatCurrencyKorean(saleInfo.expectedSalePrice)} - {formatCurrencyKorean(bidInfo.bidPrice)}
        </div>
      </div>

      {/* 비용처리 체크리스트 */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          ✅ 비용처리 가능 항목 선택
          <span className="text-xs text-slate-500 font-normal">(체크된 항목이 과세표준에서 공제됩니다)</span>
        </h3>
        <div className="space-y-2">
          {deductibleList.map((item) => (
            <CheckboxItem
              key={item.key}
              checked={taxInfo.deductibleItems[item.key]}
              onChange={(v) => updateDeductible(item.key, v)}
              label={item.label}
              sublabel={item.sublabel}
              amount={item.amount}
            />
          ))}
        </div>
      </div>

      {/* 기타 사업경비 */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">💼 기타 사업경비 입력</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <MoneyInput
            label="차량유지비 (연간, 한도 1,500만원)"
            value={taxInfo.vehicleExpense}
            onChange={(v) => updateTaxInfo({ vehicleExpense: v })}
          />
          <MoneyInput
            label="통신비"
            value={taxInfo.communicationFee}
            onChange={(v) => updateTaxInfo({ communicationFee: v })}
          />
          <MoneyInput
            label="사무실 임차료"
            value={taxInfo.officeRent}
            onChange={(v) => updateTaxInfo({ officeRent: v })}
          />
          <MoneyInput
            label="광고비"
            value={taxInfo.advertisingFee}
            onChange={(v) => updateTaxInfo({ advertisingFee: v })}
          />
        </div>
        <CustomItemList
          items={taxInfo.customBusinessExpenses}
          onAdd={() => addCustomItem('tax', { name: '', amount: 0, included: true })}
          onRemove={(id) => removeCustomItem('tax', id)}
          onUpdate={(id, updates) => updateCustomItem('tax', id, updates)}
          showIncluded
          addLabel="+ 기타 사업경비 추가"
        />
      </div>

      {/* 기존 소득 합산 */}
      <div className="p-4 bg-orange-900/20 border border-orange-700/50 rounded-xl space-y-3">
        <h3 className="text-sm font-semibold text-orange-300">⚠️ 기존 소득 합산</h3>
        <MoneyInput
          label="다른 소득 합산 (근로소득, 사업소득 등)"
          value={taxInfo.existingIncome}
          onChange={(v) => updateTaxInfo({ existingIncome: v })}
          hint="매매차익에 합산되어 세율 구간이 결정됩니다"
        />
        {taxInfo.existingIncome > 0 && (
          <p className="text-xs text-orange-300">
            ※ 기존 소득 {formatCurrencyKorean(taxInfo.existingIncome)} 합산 시 세율 구간이 높아질 수 있습니다.
          </p>
        )}
      </div>

      {/* 기본공제 */}
      <MoneyInput
        label="기본공제"
        value={taxInfo.basicDeduction}
        onChange={(v) => updateTaxInfo({ basicDeduction: v })}
        hint="기본 150만원 (상황에 따라 다를 수 있음)"
      />

      {/* 세금 계산 결과 */}
      <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-700/50 rounded-xl space-y-2">
        <h3 className="text-sm font-semibold text-amber-300 mb-3">📊 종합소득세 계산 결과</h3>
        <CostSummaryRow label="매매차익" amount={taxResult.tradingProfit} />
        <CostSummaryRow label="비용처리 합계 (공제)" amount={taxResult.totalDeductible} />
        <CostSummaryRow
          label="기존 소득 합산"
          amount={taxInfo.existingIncome}
        />
        <CostSummaryRow
          label="기본공제"
          amount={taxInfo.basicDeduction}
        />
        <CostSummaryRow
          label="과세표준"
          amount={taxResult.taxBase}
          isTotal
        />

        <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
          {/* 세율 구간 표시 */}
          <div className="p-2 bg-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
            {taxResult.taxBase <= 0 ? (
              <p className="text-emerald-400">✅ 과세표준 0원 이하 - 세금 없음</p>
            ) : taxResult.taxBase <= 14_000_000 ? (
              <p>적용 세율: <strong className="text-amber-300">6%</strong> (1,400만원 이하)</p>
            ) : taxResult.taxBase <= 50_000_000 ? (
              <p>적용 세율: <strong className="text-amber-300">15%</strong> (1,400만원 초과 ~ 5,000만원 이하)</p>
            ) : taxResult.taxBase <= 88_000_000 ? (
              <p>적용 세율: <strong className="text-amber-300">24%</strong> (5,000만원 초과 ~ 8,800만원 이하)</p>
            ) : taxResult.taxBase <= 150_000_000 ? (
              <p>적용 세율: <strong className="text-amber-300">35%</strong> (8,800만원 초과 ~ 1억5천만원 이하)</p>
            ) : taxResult.taxBase <= 300_000_000 ? (
              <p>적용 세율: <strong className="text-amber-300">38%</strong> (1억5천만원 초과 ~ 3억원 이하)</p>
            ) : taxResult.taxBase <= 500_000_000 ? (
              <p>적용 세율: <strong className="text-amber-300">40%</strong> (3억원 초과 ~ 5억원 이하)</p>
            ) : taxResult.taxBase <= 1_000_000_000 ? (
              <p>적용 세율: <strong className="text-amber-300">42%</strong> (5억원 초과 ~ 10억원 이하)</p>
            ) : (
              <p>적용 세율: <strong className="text-amber-300">45%</strong> (10억원 초과)</p>
            )}
          </div>
          <CostSummaryRow label="종합소득세" amount={taxResult.comprehensiveIncomeTax} />
          <CostSummaryRow label="지방소득세 (종소세 × 10%)" amount={taxResult.localIncomeTax} />
          <CostSummaryRow
            label="세금 합계"
            amount={taxResult.comprehensiveIncomeTax + taxResult.localIncomeTax}
            isTotal
          />
        </div>
      </div>
    </div>
  );
}
