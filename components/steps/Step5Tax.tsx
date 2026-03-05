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
  calcCapitalGainsTaxDetailed,
  calcCorporateTax,
  calcLongTermDeductionRate,
} from '@/lib/calculator';
import type {
  LandBuildingAllocMethod,
  VatInclusionType,
  PurchaseVatType,
  RegulationZone,
  HousingCount,
} from '@/types';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type ActiveTab = 'income' | 'capital_gains' | 'corporation' | 'vat';

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
    capitalGainsTaxInfo,
    updateTaxInfo,
    updateVatInfo,
    updateCapitalGainsTaxInfo,
    addCustomItem,
    removeCustomItem,
    updateCustomItem,
    addVatCustomItem,
    removeVatCustomItem,
    updateVatCustomItem,
  } = useCalculatorStore();

  const safeCgtInfo = capitalGainsTaxInfo ?? {
    taxMode: 'individual_cgt' as const,
    housingCount: 'one' as HousingCount,
    regulationZone: 'normal' as RegulationZone,
    isNonbusiness: false,
    hasLongTermDeduction: true,
    longTermDeductionRate: 0,
    autoLongTermDeduction: true,
    basicDeduction: 2_500_000,
    deductibleAcquisitionCosts: true,
    deductibleRepairCosts: false,
    isOneHousehold: false,
    residencyYears: 0,
    corporationType: 'general' as const,
    corporateTaxBaseIncome: 0,
    capitalGainsProfit: 0,
    longTermDeductionAmount: 0,
    taxableIncome: 0,
    capitalGainsTax: 0,
    localCapitalGainsTax: 0,
    totalTax: 0,
    netProfit: 0,
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>('income');

  // 부가세 과세 여부
  const isVatApplicable = isVatSubject(propertyInfo.propertyType, propertyInfo.areaType);

  // 종합소득세 계산
  const taxResult = calcTaxes(
    taxInfo,
    bidInfo.bidPrice,
    saleInfo.expectedSalePrice,
    acquisitionCosts,
    holdingCosts,
    saleInfo.holdingMonths,
    saleCosts
  );

  // VAT 계산
  const vatResult = calcVat(vatInfo, saleInfo.expectedSalePrice, bidInfo.bidPrice, isVatApplicable);
  const { buildingRatio, landRatio } = calcLandBuildingRatio(vatInfo);

  // 개인 양도소득세 계산
  const grossProfit = saleInfo.expectedSalePrice - bidInfo.bidPrice;
  const deductibleForCGT = safeCgtInfo.deductibleAcquisitionCosts
    ? acquisitionCosts.acquisitionTax +
      acquisitionCosts.legalScrivenerFee +
      acquisitionCosts.registrationLicenseTax +
      acquisitionCosts.stampDuty +
      (safeCgtInfo.deductibleRepairCosts
        ? holdingCosts.repairCosts.reduce((s, i) => s + i.amount, 0)
        : 0)
    : 0;
  const cgtProfit = Math.max(0, grossProfit - deductibleForCGT);

  const autoLtdRate = calcLongTermDeductionRate(
    propertyInfo.propertyType,
    saleInfo.holdingMonths,
    safeCgtInfo.isOneHousehold,
    safeCgtInfo.residencyYears,
    safeCgtInfo.regulationZone,
    safeCgtInfo.isNonbusiness
  );

  const cgtResult = calcCapitalGainsTaxDetailed(
    cgtProfit,
    propertyInfo.propertyType,
    saleInfo.holdingMonths,
    safeCgtInfo.regulationZone,
    safeCgtInfo.housingCount,
    safeCgtInfo.isOneHousehold,
    safeCgtInfo.residencyYears,
    safeCgtInfo.isNonbusiness,
    safeCgtInfo.autoLongTermDeduction ? null : safeCgtInfo.longTermDeductionRate
  );

  // 법인세 계산
  const corpResult = calcCorporateTax(
    grossProfit,
    propertyInfo.propertyType,
    safeCgtInfo.corporationType,
    safeCgtInfo.corporateTaxBaseIncome
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
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800 rounded-xl border border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab('income')}
          className={`py-2.5 px-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'income'
              ? 'bg-amber-500 text-slate-900 shadow-lg'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📊 종합소득세
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('capital_gains')}
          className={`py-2.5 px-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'capital_gains'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🏠 양도소득세
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('corporation')}
          className={`py-2.5 px-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'corporation'
              ? 'bg-purple-500 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🏢 법인세
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vat')}
          className={`py-2.5 px-2 rounded-lg text-xs font-semibold transition-all relative ${
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
          양도소득세 탭
      ============================== */}
      {activeTab === 'capital_gains' && (
        <div className="space-y-5">
          {/* 안내 배너 */}
          <div className="p-3 bg-blue-900/20 border border-blue-600/40 rounded-xl text-xs text-blue-300">
            📌 개인이 부동산을 양도할 때 납부하는 세금입니다. 매매사업자와 달리 종합소득세와 합산하지 않습니다.
          </div>

          {/* 매매차익 */}
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">양도차익 (매도가 - 낙찰가)</span>
              <span className={`font-mono font-bold ${grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrencyKorean(grossProfit)}
              </span>
            </div>
          </div>

          {/* 1세대 1주택 비과세 설정 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">🏠 1세대 1주택 비과세 조건</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      safeCgtInfo.isOneHousehold ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                    onClick={() => updateCapitalGainsTaxInfo({ isOneHousehold: !safeCgtInfo.isOneHousehold })}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      safeCgtInfo.isOneHousehold ? 'left-7' : 'left-1'
                    }`} />
                  </div>
                  <span className="text-sm text-slate-300">1세대 1주택</span>
                </label>
                {safeCgtInfo.isOneHousehold && (
                  <p className="text-xs text-emerald-400 mt-1 ml-14">
                    ✅ 2년 보유+거주 시 12억 이하 비과세
                  </p>
                )}
              </div>
              {safeCgtInfo.isOneHousehold && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">거주 기간 (년)</label>
                  <input
                    type="number"
                    value={safeCgtInfo.residencyYears || ''}
                    onChange={(e) => updateCapitalGainsTaxInfo({ residencyYears: Number(e.target.value) || 0 })}
                    min="0" max="30" step="0.5"
                    placeholder="거주 년수"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm
                      focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 주택 보유 수 & 규제지역 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">주택 보유 수</label>
              <div className="space-y-1">
                {[
                  { value: 'one', label: '1주택' },
                  { value: 'two', label: '2주택' },
                  { value: 'three_plus', label: '3주택+' },
                ].map((hc) => (
                  <button
                    key={hc.value}
                    type="button"
                    onClick={() => updateCapitalGainsTaxInfo({ housingCount: hc.value as HousingCount })}
                    className={`w-full py-2 rounded-lg text-xs font-medium border transition-all text-left px-3
                      ${safeCgtInfo.housingCount === hc.value
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                  >
                    {hc.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">지역 구분</label>
              <div className="space-y-1">
                {[
                  { value: 'normal', label: '일반지역' },
                  { value: 'speculation', label: '투기지역' },
                  { value: 'overheated', label: '투기과열지구' },
                  { value: 'land_trade', label: '토지거래허가구역' },
                ].map((zone) => (
                  <button
                    key={zone.value}
                    type="button"
                    onClick={() => updateCapitalGainsTaxInfo({ regulationZone: zone.value as RegulationZone })}
                    className={`w-full py-1.5 rounded-lg text-xs font-medium border transition-all text-left px-3
                      ${safeCgtInfo.regulationZone === zone.value
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                  >
                    {zone.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 장기보유특별공제 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">📅 장기보유특별공제</h3>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={safeCgtInfo.autoLongTermDeduction}
                  onChange={() => updateCapitalGainsTaxInfo({ autoLongTermDeduction: true })}
                  className="accent-blue-500"
                />
                <span className="text-sm text-slate-300">
                  자동계산 ({saleInfo.holdingMonths}개월 → 공제율 {autoLtdRate}%)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!safeCgtInfo.autoLongTermDeduction}
                  onChange={() => updateCapitalGainsTaxInfo({ autoLongTermDeduction: false })}
                  className="accent-blue-500"
                />
                <span className="text-sm text-slate-300">직접입력</span>
              </label>
            </div>
            {!safeCgtInfo.autoLongTermDeduction && (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={safeCgtInfo.longTermDeductionRate || ''}
                  onChange={(e) => updateCapitalGainsTaxInfo({ longTermDeductionRate: Number(e.target.value) || 0 })}
                  min="0" max="80" step="1"
                  placeholder="공제율 %"
                  className="w-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm
                    focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-400">% (최대 80%)</span>
              </div>
            )}
          </div>

          {/* 필요경비 공제 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">💰 필요경비 공제 (양도차익 차감)</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-800 rounded-lg border border-slate-700">
                <input
                  type="checkbox"
                  checked={safeCgtInfo.deductibleAcquisitionCosts}
                  onChange={(e) => updateCapitalGainsTaxInfo({ deductibleAcquisitionCosts: e.target.checked })}
                  className="accent-blue-500"
                />
                <div>
                  <span className="text-sm text-slate-300">취득 필요경비 공제</span>
                  <span className="text-xs text-slate-500 ml-2">(취득세 + 법무사 + 등기비용)</span>
                  <div className="text-xs text-blue-400 mt-0.5">
                    = {formatCurrencyKorean(
                      acquisitionCosts.acquisitionTax +
                      acquisitionCosts.legalScrivenerFee +
                      acquisitionCosts.registrationLicenseTax +
                      acquisitionCosts.stampDuty
                    )}
                  </div>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-800 rounded-lg border border-slate-700">
                <input
                  type="checkbox"
                  checked={safeCgtInfo.deductibleRepairCosts}
                  onChange={(e) => updateCapitalGainsTaxInfo({ deductibleRepairCosts: e.target.checked })}
                  className="accent-blue-500"
                />
                <div>
                  <span className="text-sm text-slate-300">자본적 지출 공제</span>
                  <span className="text-xs text-slate-500 ml-2">(수리/인테리어 - 가치증가분)</span>
                  <div className="text-xs text-blue-400 mt-0.5">
                    = {formatCurrencyKorean(holdingCosts.repairCosts.reduce((s, i) => s + i.amount, 0))}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 비사업용 토지 */}
          {propertyInfo.propertyType === 'land' && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-800 rounded-lg border border-slate-700">
                <input
                  type="checkbox"
                  checked={safeCgtInfo.isNonbusiness}
                  onChange={(e) => updateCapitalGainsTaxInfo({ isNonbusiness: e.target.checked })}
                  className="accent-red-500"
                />
                <div>
                  <span className="text-sm text-red-300">비사업용 토지 중과</span>
                  <span className="text-xs text-slate-500 ml-2">(+10%p 추가세율, 장기보유특별공제 불가)</span>
                </div>
              </label>
            </div>
          )}

          {/* 양도소득세 계산 결과 */}
          <div className="p-4 bg-gradient-to-br from-blue-950/50 to-slate-900 border border-blue-700/50 rounded-xl space-y-3">
            <h3 className="text-sm font-semibold text-blue-300 mb-3">🏠 양도소득세 계산 결과</h3>

            {cgtResult.specialNote && (
              <div className="p-2.5 bg-blue-900/30 border border-blue-600/40 rounded-lg text-xs text-blue-300">
                📌 {cgtResult.specialNote}
              </div>
            )}

            <div className="space-y-2">
              <CostSummaryRow label="양도차익" amount={cgtProfit} />
              {cgtResult.longTermDeductionAmount > 0 && (
                <CostSummaryRow
                  label={`장기보유특별공제 (${cgtResult.longTermDeductionRate}%)`}
                  amount={cgtResult.longTermDeductionAmount}
                />
              )}
              <CostSummaryRow label="기본공제" amount={cgtResult.basicDeduction} />
              <CostSummaryRow label="과세표준" amount={cgtResult.taxBase} isTotal />
            </div>

            <div className="pt-3 border-t border-slate-700 space-y-2">
              <div className="p-2 bg-slate-800 rounded-lg text-xs text-slate-400">
                적용 세율: <strong className="text-blue-300">{cgtResult.taxRate.toFixed(1)}%</strong>
                {cgtResult.taxBase === 0 && <span className="text-emerald-400 ml-2">✅ 비과세</span>}
              </div>
              <CostSummaryRow label="양도소득세" amount={cgtResult.tax} />
              <CostSummaryRow label="지방소득세 (10%)" amount={cgtResult.localTax} />
              <CostSummaryRow label="세금 합계" amount={cgtResult.totalTax} isTotal />
              <div className="pt-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">세후 순수익</span>
                  <span className={`font-mono font-bold text-sm ${grossProfit - cgtResult.totalTax >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrencyKorean(grossProfit - cgtResult.totalTax)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================
          법인세 탭
      ============================== */}
      {activeTab === 'corporation' && (
        <div className="space-y-5">
          {/* 안내 배너 */}
          <div className="p-3 bg-purple-900/20 border border-purple-600/40 rounded-xl text-xs text-purple-300">
            📌 법인이 부동산을 양도할 때 과세됩니다. 주택 취득 법인은 추가 20% 세율이 적용됩니다.
          </div>

          {/* 매매차익 */}
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">법인 양도차익</span>
              <span className={`font-mono font-bold ${grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrencyKorean(grossProfit)}
              </span>
            </div>
          </div>

          {/* 법인 구분 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">🏢 법인 구분</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'general', label: '일반법인', desc: '9%~24% (누진)' },
                { value: 'small_medium', label: '중소기업', desc: '동일 (특례 별도)' },
              ].map((corp) => (
                <button
                  key={corp.value}
                  type="button"
                  onClick={() => updateCapitalGainsTaxInfo({ corporationType: corp.value as 'general' | 'small_medium' })}
                  className={`p-3 rounded-xl border text-left text-sm transition-all
                    ${safeCgtInfo.corporationType === corp.value
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                >
                  <div className="font-semibold">{corp.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{corp.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 기존 법인 과세표준 */}
          <MoneyInput
            label="기존 법인 과세표준 소득 (다른 사업 소득 등)"
            value={safeCgtInfo.corporateTaxBaseIncome}
            onChange={(v) => updateCapitalGainsTaxInfo({ corporateTaxBaseIncome: v })}
            hint="법인세 누진 계산 시 합산됩니다"
          />

          {/* 법인세 세율 안내 */}
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <h4 className="text-xs font-semibold text-slate-400 mb-3">📋 법인세율 (2024)</h4>
            <div className="space-y-2 text-xs">
              {[
                { range: '2억원 이하', rate: '9%' },
                { range: '2억 ~ 200억', rate: '19%' },
                { range: '200억 ~ 3,000억', rate: '21%' },
                { range: '3,000억 초과', rate: '24%' },
              ].map((bracket) => (
                <div key={bracket.range} className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">{bracket.range}</span>
                  <span className="text-purple-300 font-semibold">{bracket.rate}</span>
                </div>
              ))}
            </div>
            {['apartment', 'villa', 'house', 'officetel'].includes(propertyInfo.propertyType) && (
              <div className="mt-3 p-2.5 bg-red-900/20 border border-red-600/40 rounded-lg text-xs text-red-300">
                ⚠️ 주택 취득 법인: 법인세 + 추가 20%p 세율 적용
              </div>
            )}
          </div>

          {/* 법인세 계산 결과 */}
          <div className="p-4 bg-gradient-to-br from-purple-950/50 to-slate-900 border border-purple-700/50 rounded-xl space-y-3">
            <h3 className="text-sm font-semibold text-purple-300 mb-3">🏢 법인세 계산 결과</h3>

            <div className="space-y-2">
              <CostSummaryRow label="법인 양도차익" amount={grossProfit} />
              <CostSummaryRow label="법인세 (누진)" amount={corpResult.corporateTax} />
              <CostSummaryRow label="지방소득세 (10%)" amount={corpResult.localTax} />
              {corpResult.housingSpecialTax > 0 && (
                <CostSummaryRow label="주택 추가세 (20%)" amount={corpResult.housingSpecialTax} />
              )}
              <CostSummaryRow label="세금 합계" amount={corpResult.totalTax} isTotal />
            </div>

            <div className="pt-3 border-t border-slate-700 space-y-2">
              <div className="p-2 bg-slate-800 rounded-lg text-xs text-slate-400">
                실효세율: <strong className="text-purple-300">{corpResult.effectiveRate.toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">세후 순수익</span>
                <span className={`font-mono font-bold text-sm ${grossProfit - corpResult.totalTax >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrencyKorean(grossProfit - corpResult.totalTax)}
                </span>
              </div>
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
