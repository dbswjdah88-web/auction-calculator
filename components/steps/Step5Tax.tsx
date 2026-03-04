'use client';

import React, { useState } from 'react';
import { useCalculatorStore } from '@/store/calculatorStore';
import {
  MoneyInput,
  SectionHeader,
  CheckboxItem,
  CustomItemList,
  CostSummaryRow,
} from '@/components/ui/inputs';
import {
  formatCurrencyKorean,
  calcTaxes,
  calcVat,
  isVatSubject,
  calcLandBuildingRatio,
} from '@/lib/calculator';
import type { LandBuildingAllocMethod, VatInclusionType, PurchaseVatType } from '@/types';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type ActiveTab = 'income' | 'vat';

export default function Step5Tax() {
  const {
    propertyInfo,
    bidInfo,
    saleInfo,
    acquisitionCosts,
    holdingCosts,
    saleCosts,
    taxInfo,
    vatInfo,
    updateTaxInfo,
    updateVatInfo,
    addCustomItem,
    removeCustomItem,
    updateCustomItem,
    addVatCustomItem,
    removeVatCustomItem,
    updateVatCustomItem,
  } = useCalculatorStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('income');

  // 부가세 과세 대상 여부
  const isVatApplicable = isVatSubject(propertyInfo.propertyType, propertyInfo.areaType);

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

  // 실시간 VAT 계산
  const vatResult = calcVat(
    vatInfo,
    saleInfo.expectedSalePrice,
    bidInfo.bidPrice,
    isVatApplicable
  );

  // 토지/건물 비율 (실시간 반영)
  const { buildingRatio, landRatio } = calcLandBuildingRatio(vatInfo);

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

  // 도넛차트 데이터 (토지/건물 비율)
  const donutData = [
    { name: '건물분', value: Math.round(buildingRatio * 100), color: '#D4A843' },
    { name: '토지분', value: Math.round(landRatio * 100), color: '#64748B' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="세금 계산"
        description="매매사업자 종합소득세와 부가가치세를 계산합니다."
        icon="📊"
      />

      {/* 탭 선택 */}
      <div className="flex gap-2 p-1 bg-slate-800 rounded-xl border border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab('income')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'income'
              ? 'bg-amber-500 text-slate-900 shadow-lg'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📊 종합소득세
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vat')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all relative ${
            activeTab === 'vat'
              ? 'bg-amber-500 text-slate-900 shadow-lg'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🧾 부가가치세
          {isVatApplicable && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </div>

      {/* ==============================
          종합소득세 탭
      ============================== */}
      {activeTab === 'income' && (
        <div className="space-y-6">
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
            <CostSummaryRow label="기존 소득 합산" amount={taxInfo.existingIncome} />
            <CostSummaryRow label="기본공제" amount={taxInfo.basicDeduction} />
            <CostSummaryRow label="과세표준" amount={taxResult.taxBase} isTotal />

            <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
              <div className="p-2 bg-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
                {taxResult.taxBase <= 0 ? (
                  <p className="text-emerald-400">✅ 과세표준 0원 이하 - 세금 없음</p>
                ) : taxResult.taxBase <= 14_000_000 ? (
                  <p>적용 세율: <strong className="text-amber-300">6%</strong> (1,400만원 이하)</p>
                ) : taxResult.taxBase <= 50_000_000 ? (
                  <p>적용 세율: <strong className="text-amber-300">15%</strong> (5,000만원 이하)</p>
                ) : taxResult.taxBase <= 88_000_000 ? (
                  <p>적용 세율: <strong className="text-amber-300">24%</strong> (8,800만원 이하)</p>
                ) : taxResult.taxBase <= 150_000_000 ? (
                  <p>적용 세율: <strong className="text-amber-300">35%</strong> (1.5억원 이하)</p>
                ) : taxResult.taxBase <= 300_000_000 ? (
                  <p>적용 세율: <strong className="text-amber-300">38%</strong> (3억원 이하)</p>
                ) : taxResult.taxBase <= 500_000_000 ? (
                  <p>적용 세율: <strong className="text-amber-300">40%</strong> (5억원 이하)</p>
                ) : taxResult.taxBase <= 1_000_000_000 ? (
                  <p>적용 세율: <strong className="text-amber-300">42%</strong> (10억원 이하)</p>
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
      )}

      {/* ==============================
          부가가치세 탭
      ============================== */}
      {activeTab === 'vat' && (
        <div className="space-y-6">
          {/* 과세 여부 상태 배너 */}
          {!isVatApplicable ? (
            <div className="p-4 bg-emerald-900/20 border border-emerald-600/50 rounded-xl flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-emerald-300 text-sm">부가가치세 면세 대상</p>
                <p className="text-xs text-emerald-400/70 mt-1">
                  {propertyInfo.propertyType === 'land'
                    ? '토지는 부가가치세가 과세되지 않습니다.'
                    : '85㎡ 이하 주거용 부동산은 부가가치세가 면세됩니다.'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ※ Step 1에서 물건 종류와 면적을 변경하면 자동으로 업데이트됩니다.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* 과세 대상 배너 */}
              <div className="p-4 bg-red-900/20 border border-red-600/50 rounded-xl flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold text-red-300 text-sm">부가가치세 과세 대상</p>
                  <p className="text-xs text-red-400/70 mt-1">
                    {['commercial', 'neighborhood', 'factory'].includes(propertyInfo.propertyType)
                      ? '상가·근린생활시설·공장은 면적에 관계없이 건물분에 부가가치세가 과세됩니다.'
                      : '85㎡ 초과 주거용 부동산은 건물분에 부가가치세가 과세됩니다.'}
                  </p>
                </div>
              </div>

              {/* ─── 1. 토지/건물 안분 ─── */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  🏗️ 토지/건물 안분 방법
                </h3>

                {/* 안분 방법 탭 */}
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'standard', label: '기준시가\n안분', icon: '📋' },
                    { value: 'appraisal', label: '감정평가\n안분', icon: '🔍' },
                    { value: 'direct', label: '직접\n입력', icon: '✏️' },
                  ] as { value: LandBuildingAllocMethod; label: string; icon: string }[]).map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => updateVatInfo({ allocMethod: m.value })}
                      className={`p-3 rounded-xl border text-xs font-medium transition-all text-center whitespace-pre-line
                        ${vatInfo.allocMethod === m.value
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                    >
                      <div className="text-xl mb-1">{m.icon}</div>
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* 안분 방법별 입력 */}
                {vatInfo.allocMethod === 'standard' && (
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
                    <p className="text-xs text-slate-400">
                      🏠 개별공시지가(토지) × 면적 + 건물 기준시가로 비율 산정
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">토지 기준시가 (원)</label>
                        <input
                          type="number"
                          value={vatInfo.landStandardPrice || ''}
                          onChange={(e) => updateVatInfo({ landStandardPrice: Number(e.target.value) || 0 })}
                          placeholder="토지 기준시가"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm
                            focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">= 개별공시지가(원/㎡) × 토지면적(㎡)</p>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">건물 기준시가 (원)</label>
                        <input
                          type="number"
                          value={vatInfo.buildingStandardPrice || ''}
                          onChange={(e) => updateVatInfo({ buildingStandardPrice: Number(e.target.value) || 0 })}
                          placeholder="건물 기준시가"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm
                            focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">국세청 건물기준시가 조회</p>
                      </div>
                    </div>
                    {/* 편의 계산기: 개별공시지가 × 면적 */}
                    <div className="p-3 bg-slate-700/50 rounded-lg space-y-2">
                      <p className="text-xs text-amber-400 font-medium">⚡ 토지 기준시가 자동 계산</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">개별공시지가 (원/㎡)</label>
                          <input
                            type="number"
                            value={vatInfo.landUnitPrice || ''}
                            onChange={(e) => {
                              const unitPrice = Number(e.target.value) || 0;
                              updateVatInfo({
                                landUnitPrice: unitPrice,
                                landStandardPrice: unitPrice * (vatInfo.landAreaM2 || 0),
                              });
                            }}
                            placeholder="예: 5000000"
                            className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs
                              focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">토지 면적 (㎡)</label>
                          <input
                            type="number"
                            value={vatInfo.landAreaM2 || ''}
                            onChange={(e) => {
                              const area = Number(e.target.value) || 0;
                              updateVatInfo({
                                landAreaM2: area,
                                landStandardPrice: (vatInfo.landUnitPrice || 0) * area,
                              });
                            }}
                            placeholder="예: 50"
                            className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs
                              focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {vatInfo.allocMethod === 'appraisal' && (
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
                    <p className="text-xs text-slate-400">
                      📊 감정평가서상 토지/건물 감정가 기준으로 비율 산정
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">토지 감정가 (원)</label>
                        <input
                          type="number"
                          value={vatInfo.landAppraisalPrice || ''}
                          onChange={(e) => updateVatInfo({ landAppraisalPrice: Number(e.target.value) || 0 })}
                          placeholder="토지 감정가"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm
                            focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">건물 감정가 (원)</label>
                        <input
                          type="number"
                          value={vatInfo.buildingAppraisalPrice || ''}
                          onChange={(e) => updateVatInfo({ buildingAppraisalPrice: Number(e.target.value) || 0 })}
                          placeholder="건물 감정가"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm
                            focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {vatInfo.allocMethod === 'direct' && (
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
                    <p className="text-xs text-slate-400">
                      ✏️ 건물분/토지분 금액을 직접 입력하여 비율 계산
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <MoneyInput
                        label="건물분 금액 (원)"
                        value={vatInfo.buildingDirectAmount}
                        onChange={(v) => updateVatInfo({ buildingDirectAmount: v })}
                      />
                      <MoneyInput
                        label="토지분 금액 (원)"
                        value={vatInfo.landDirectAmount}
                        onChange={(v) => updateVatInfo({ landDirectAmount: v })}
                      />
                    </div>
                  </div>
                )}

                {/* 토지/건물 비율 시각화 (도넛 차트) */}
                {(buildingRatio > 0 || landRatio > 0) && (buildingRatio + landRatio > 0) && (
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <div className="grid grid-cols-2 gap-4 items-center">
                      <div>
                        <ResponsiveContainer width="100%" height={140}>
                          <PieChart>
                            <Pie
                              data={donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={60}
                              paddingAngle={3}
                              dataKey="value"
                              startAngle={90}
                              endAngle={450}
                            >
                              {donutData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v: number | undefined) => [`${v ?? 0}%`, '']}
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500" />
                            <span className="text-slate-300">건물분</span>
                          </div>
                          <span className="font-mono font-bold text-amber-300">
                            {(buildingRatio * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-500" />
                            <span className="text-slate-300">토지분</span>
                          </div>
                          <span className="font-mono text-slate-400">
                            {(landRatio * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-700 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">건물분 매도가</span>
                            <span className="font-mono text-amber-300">
                              {formatCurrencyKorean(vatResult.buildingSaleAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">토지분 매도가</span>
                            <span className="font-mono text-slate-400">
                              {formatCurrencyKorean(vatResult.landSaleAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── 2. 매도 VAT 설정 ─── */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-200">💰 매도가 VAT 포함 여부</h3>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'exclusive', label: 'VAT 별도', desc: '매도가 + VAT 10% 별도 수령', icon: '➕' },
                    { value: 'inclusive', label: 'VAT 포함', desc: '매도가에 VAT 포함 (순수령액 감소)', icon: '📦' },
                  ] as { value: VatInclusionType; label: string; desc: string; icon: string }[]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateVatInfo({ vatInclusionType: opt.value })}
                      className={`p-3 rounded-xl border text-left transition-all
                        ${vatInfo.vatInclusionType === opt.value
                          ? 'bg-amber-500/20 border-amber-500'
                          : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                        }`}
                    >
                      <div className="text-base mb-1">{opt.icon}</div>
                      <div className={`text-sm font-semibold ${vatInfo.vatInclusionType === opt.value ? 'text-amber-300' : 'text-slate-300'}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
                {vatInfo.vatInclusionType === 'inclusive' && (
                  <div className="p-3 bg-orange-900/20 border border-orange-600/50 rounded-lg text-xs text-orange-300">
                    ⚠️ VAT 포함 매도 시 건물분 공급가액({formatCurrencyKorean(vatResult.buildingSupplyAmount)})이
                    실질 수령액입니다. 순이익이 VAT 별도 대비 감소합니다.
                  </div>
                )}
              </div>

              {/* ─── 3. 취득(매입) VAT ─── */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-200">🔄 낙찰가 부가세 포함 여부</h3>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'none', label: '면세/없음', desc: '취득 매입세액 없음', icon: '❌' },
                    { value: 'included', label: 'VAT 포함', desc: '낙찰가에 VAT 포함', icon: '📦' },
                    { value: 'separate', label: 'VAT 별도', desc: '낙찰가 외 VAT 별도', icon: '➕' },
                  ] as { value: PurchaseVatType; label: string; desc: string; icon: string }[]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateVatInfo({ purchaseVatType: opt.value })}
                      className={`p-3 rounded-xl border text-center text-xs transition-all
                        ${vatInfo.purchaseVatType === opt.value
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                    >
                      <div className="text-base mb-1">{opt.icon}</div>
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-slate-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
                {vatInfo.purchaseVatType !== 'none' && (
                  <div className="p-3 bg-slate-800 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">건물분 낙찰가</span>
                      <span className="font-mono text-slate-300">
                        {formatCurrencyKorean(bidInfo.bidPrice * buildingRatio)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">취득 매입세액</span>
                      <span className="font-mono text-emerald-400">
                        {formatCurrencyKorean(vatResult.inputVatFromPurchase)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── 4. 기타 매입세액 공제 ─── */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-200">📑 기타 매입세액 공제 항목</h3>
                <p className="text-xs text-slate-500">
                  아래 비용의 부가세(공급가액의 10%)가 매입세액으로 공제됩니다. (금액 입력 시 10/110 자동 계산)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <MoneyInput
                    label="인테리어/수리비 (부가세 포함)"
                    value={vatInfo.inputVatInterior}
                    onChange={(v) => updateVatInfo({ inputVatInterior: v })}
                    hint={vatInfo.inputVatInterior > 0 ? `매입세액: ${formatCurrencyKorean((vatInfo.inputVatInterior / 1.1) * 0.1)}` : ''}
                  />
                  <MoneyInput
                    label="법무사비 (부가세 포함)"
                    value={vatInfo.inputVatLegalScrivener}
                    onChange={(v) => updateVatInfo({ inputVatLegalScrivener: v })}
                    hint={vatInfo.inputVatLegalScrivener > 0 ? `매입세액: ${formatCurrencyKorean((vatInfo.inputVatLegalScrivener / 1.1) * 0.1)}` : ''}
                  />
                  <MoneyInput
                    label="중개보수 (부가세 포함)"
                    value={vatInfo.inputVatAgentCommission}
                    onChange={(v) => updateVatInfo({ inputVatAgentCommission: v })}
                    hint={vatInfo.inputVatAgentCommission > 0 ? `매입세액: ${formatCurrencyKorean((vatInfo.inputVatAgentCommission / 1.1) * 0.1)}` : ''}
                  />
                </div>

                {/* 기타 매입세액 항목 자유 추가 */}
                <div className="space-y-2">
                  {vatInfo.customInputVatItems.map((item) => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateVatCustomItem(item.id, { name: e.target.value })}
                        placeholder="항목명"
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm
                          focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <input
                        type="number"
                        value={item.amount || ''}
                        onChange={(e) => updateVatCustomItem(item.id, { amount: Number(e.target.value) || 0 })}
                        placeholder="부가세 포함 금액"
                        className="w-36 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm
                          focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <span className="text-xs text-emerald-400 w-24 text-right">
                        {item.amount > 0 ? formatCurrencyKorean((item.amount / 1.1) * 0.1) : '-'}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVatCustomItem(item.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addVatCustomItem({ name: '', amount: 0 })}
                    className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 text-sm
                      hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                  >
                    + 기타 매입세액 항목 추가
                  </button>
                </div>
              </div>

              {/* ─── 5. VAT 계산 결과 요약 ─── */}
              <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-700/50 rounded-xl space-y-3">
                <h3 className="text-sm font-semibold text-amber-300">🧾 부가가치세 계산 결과</h3>

                <div className="space-y-2">
                  <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg space-y-1">
                    <p className="text-xs text-red-400 font-medium">📤 매출세액 (납부 의무)</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">
                        건물분 공급가액 ({(buildingRatio * 100).toFixed(1)}%)
                      </span>
                      <span className="font-mono text-slate-300">
                        {formatCurrencyKorean(vatResult.buildingSupplyAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-red-300">매출세액 (× 10%)</span>
                      <span className="font-mono text-red-300">
                        {formatCurrencyKorean(vatResult.outputVat)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-900/20 border border-emerald-700/30 rounded-lg space-y-1">
                    <p className="text-xs text-emerald-400 font-medium">📥 매입세액 (공제 가능)</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">취득 매입세액</span>
                      <span className="font-mono text-slate-300">
                        {formatCurrencyKorean(vatResult.inputVatFromPurchase)}
                      </span>
                    </div>
                    {vatInfo.inputVatInterior > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">인테리어/수리</span>
                        <span className="font-mono text-slate-300">
                          {formatCurrencyKorean((vatInfo.inputVatInterior / 1.1) * 0.1)}
                        </span>
                      </div>
                    )}
                    {vatInfo.inputVatLegalScrivener > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">법무사비</span>
                        <span className="font-mono text-slate-300">
                          {formatCurrencyKorean((vatInfo.inputVatLegalScrivener / 1.1) * 0.1)}
                        </span>
                      </div>
                    )}
                    {vatInfo.inputVatAgentCommission > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">중개보수</span>
                        <span className="font-mono text-slate-300">
                          {formatCurrencyKorean((vatInfo.inputVatAgentCommission / 1.1) * 0.1)}
                        </span>
                      </div>
                    )}
                    {vatInfo.customInputVatItems.filter(i => i.amount > 0).map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-400">{item.name || '기타'}</span>
                        <span className="font-mono text-slate-300">
                          {formatCurrencyKorean((item.amount / 1.1) * 0.1)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold pt-1 border-t border-emerald-700/30">
                      <span className="text-emerald-300">매입세액 합계</span>
                      <span className="font-mono text-emerald-300">
                        {formatCurrencyKorean(vatResult.totalInputVat)}
                      </span>
                    </div>
                  </div>

                  {/* 최종 납부/환급 */}
                  <div className={`p-4 rounded-xl border-2 ${
                    vatResult.vatPayable > 0
                      ? 'bg-red-900/20 border-red-600'
                      : vatResult.vatPayable < 0
                      ? 'bg-emerald-900/20 border-emerald-600'
                      : 'bg-slate-800 border-slate-600'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm text-white">
                        {vatResult.vatPayable > 0 ? '🔴 납부 부가세' : vatResult.vatPayable < 0 ? '🟢 환급 부가세' : '부가세 없음'}
                      </span>
                      <span className={`font-mono font-bold text-xl ${
                        vatResult.vatPayable > 0 ? 'text-red-400' : vatResult.vatPayable < 0 ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {formatCurrencyKorean(Math.abs(vatResult.vatPayable))}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      = 매출세액({formatCurrencyKorean(vatResult.outputVat)}) - 매입세액({formatCurrencyKorean(vatResult.totalInputVat)})
                    </p>
                    {vatResult.vatPayable !== 0 && (
                      <p className="text-xs mt-2 text-amber-400">
                        ※ 이 금액이 최종 순이익에서 차감됩니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
