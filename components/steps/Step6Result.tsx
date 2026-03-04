'use client';

import React, { useState } from 'react';
import { useCalculatorStore } from '@/store/calculatorStore';
import { InfoCard, SectionHeader, CostSummaryRow } from '@/components/ui/inputs';
import { MoneyInput, RateInput } from '@/components/ui/inputs';
import {
  formatCurrencyKorean,
  formatPercent,
  calcLeverageAnalysis,
  calcTaxComparison,
} from '@/lib/calculator';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

export default function Step6Result() {
  const store = useCalculatorStore();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [activeAdvanced, setActiveAdvanced] = useState<string>('scenario');

  // 결과 계산
  const result = store.getResult();

  // 레버리지 분석
  const leverageData = calcLeverageAnalysis(
    store.propertyInfo,
    store.bidInfo,
    store.saleInfo,
    store.acquisitionCosts,
    store.holdingCosts,
    store.saleCosts,
    store.taxInfo,
    store.vatInfo ?? {
      isVatApplicable: false,
      allocMethod: 'standard' as const,
      landStandardPrice: 0,
      buildingStandardPrice: 0,
      landUnitPrice: 0,
      landAreaM2: 0,
      landAppraisalPrice: 0,
      buildingAppraisalPrice: 0,
      buildingDirectAmount: 0,
      landDirectAmount: 0,
      buildingRatio: 0.5,
      landRatio: 0.5,
      buildingSaleAmount: 0,
      landSaleAmount: 0,
      vatInclusionType: 'exclusive' as const,
      outputVat: 0,
      buildingSupplyAmount: 0,
      purchaseVatType: 'none' as const,
      inputVatFromPurchase: 0,
      inputVatInterior: 0,
      inputVatLegalScrivener: 0,
      inputVatAgentCommission: 0,
      customInputVatItems: [],
      totalInputVat: 0,
      vatPayable: 0,
    }
  );

  // 세금 비교
  const taxComp = calcTaxComparison(
    result.grossProfit,
    store.saleInfo.holdingMonths,
    store.taxInfo,
    store.bidInfo.bidPrice,
    store.saleInfo.expectedSalePrice,
    store.acquisitionCosts,
    store.holdingCosts,
    store.saleCosts
  );

  // 파이차트 데이터
  const pieData = [
    { name: '취득 비용', value: result.acquisitionCostTotal, color: '#3B82F6' },
    { name: '보유 비용', value: result.holdingCostTotal, color: '#8B5CF6' },
    { name: '매도 비용', value: result.saleCostTotal, color: '#10B981' },
    { name: '세금', value: result.taxTotal, color: '#EF4444' },
    ...(result.vatPayable > 0 ? [{ name: '부가세 납부', value: result.vatPayable, color: '#F97316' }] : []),
  ].filter((d) => d.value > 0);

  // 시나리오 차트 데이터
  const scenarioChartData = result.scenarios.map((s) => ({
    rate: `${s.bidRatePercent}%`,
    netProfit: s.netProfit / 10000,    // 만원 단위
    profitRate: s.profitRate,
    bidPrice: s.bidPrice,
  }));

  // 손익분기점 찾기 (변수 사용 준비)

  // 저장
  const handleSave = () => {
    if (saveName.trim()) {
      store.saveCalculation(saveName.trim());
      setShowSaveModal(false);
      setSaveName('');
    }
  };

  // PDF 내보내기 (간단 구현)
  const handleExport = () => {
    window.print();
  };

  const advancedTabs = [
    { id: 'scenario', label: '시나리오 차트' },
    { id: 'leverage', label: '레버리지 분석' },
    { id: 'tax', label: '세금 비교' },
    { id: 'reverse', label: '역산 기능' },
    { id: 'stats', label: '지역 통계' },
  ];

  return (
    <div className="space-y-8 pb-4">
      <SectionHeader
        title="최종 결과 대시보드"
        description="입력한 정보를 바탕으로 예상 수익을 분석합니다."
        icon="🎯"
      />

      {/* ========== 핵심 결과 카드 ========== */}
      <div className="grid grid-cols-2 gap-3">
        <InfoCard
          label="순수익 (세후)"
          value={formatCurrencyKorean(result.netProfit)}
          sub={`수익률 ${formatPercent(result.profitRate)}`}
          variant={result.netProfit >= 0 ? 'positive' : 'negative'}
          className="col-span-2"
        />
        <InfoCard
          label="총 투자금 (실투자금)"
          value={formatCurrencyKorean(result.totalInvestment)}
          sub="낙찰가 + 모든비용 - 대출금"
          variant="default"
        />
        <InfoCard
          label="총 비용 합계"
          value={formatCurrencyKorean(result.totalCosts)}
          sub="취득+보유+매도+세금"
          variant="warning"
        />
        <InfoCard
          label="연환산 수익률"
          value={formatPercent(result.annualProfitRate)}
          sub={`보유 ${store.saleInfo.holdingMonths}개월`}
          variant={result.annualProfitRate >= 10 ? 'positive' : result.annualProfitRate >= 0 ? 'warning' : 'negative'}
        />
        <InfoCard
          label="월평균 수익"
          value={formatCurrencyKorean(result.monthlyProfit)}
          variant={result.monthlyProfit >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* ========== 비용 브레이크다운 ========== */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">💸 비용 상세 내역</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 파이차트 */}
          {pieData.length > 0 && (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) => [formatCurrencyKorean(value ?? 0), '']}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1 text-xs text-slate-400">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* 수치 내역 */}
          <div className="space-y-1">
            <CostSummaryRow label="취득 비용" amount={result.acquisitionCostTotal} />
            <CostSummaryRow label="보유 비용" amount={result.holdingCostTotal} />
            <CostSummaryRow label="매도 비용" amount={result.saleCostTotal} />
            <CostSummaryRow label="세금 합계" amount={result.taxTotal} />
            {result.isVatApplicable && (
              <CostSummaryRow
                label={`부가세 ${result.vatPayable >= 0 ? '납부' : '환급'}`}
                amount={result.vatPayable}
              />
            )}
            <CostSummaryRow label="총 비용" amount={result.totalCosts + (result.isVatApplicable ? result.vatPayable : 0)} isTotal />
          </div>
        </div>
      </div>

      {/* ========== 손익분기점 ========== */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">📍 손익분기점 분석</h3>
        <div className="grid grid-cols-2 gap-3">
          <InfoCard
            label="최소 매도가 (본전)"
            value={formatCurrencyKorean(result.breakEvenPrice)}
            sub="이 이상 매도해야 손익 0"
            variant="warning"
          />
          <InfoCard
            label="감정가 대비"
            value={formatPercent(result.breakEvenRateToAppraisal)}
            sub={`현재 예상 매도가: ${formatPercent(
              store.propertyInfo.appraisalValue > 0
                ? (store.saleInfo.expectedSalePrice / store.propertyInfo.appraisalValue) * 100
                : 0
            )}`}
            variant="warning"
          />
        </div>
      </div>

      {/* ========== 고급 기능 탭 ========== */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">🔬 고급 분석</h3>
        <div className="flex gap-2 flex-wrap mb-4">
          {advancedTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveAdvanced(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                ${
                  activeAdvanced === tab.id
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ---- 시나리오 차트 ---- */}
        {activeAdvanced === 'scenario' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              감정가 대비 낙찰가율(X축)에 따른 예상 순수익(Y축) 변화
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={scenarioChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="rate"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickFormatter={(v) => `${v}만`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value: number | undefined, name: string | undefined) => [
                    name === 'netProfit' ? `${(value ?? 0).toFixed(0)}만원` : `${(value ?? 0).toFixed(1)}%`,
                    name === 'netProfit' ? '순수익' : '수익률',
                  ]}
                />
                <ReferenceLine
                  y={0}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  label={{ value: '손익분기', fill: '#EF4444', fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="netProfit"
                  stroke="#D4A843"
                  strokeWidth={2}
                  dot={{ fill: '#D4A843', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* 시나리오 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-2 text-slate-400">낙찰가율</th>
                    <th className="text-right py-2 px-2 text-slate-400">입찰가</th>
                    <th className="text-right py-2 px-2 text-slate-400">순수익</th>
                    <th className="text-right py-2 px-2 text-slate-400">수익률</th>
                    <th className="text-right py-2 px-2 text-slate-400">연환산</th>
                  </tr>
                </thead>
                <tbody>
                  {result.scenarios.map((row) => {
                    const isCurrentBid =
                      Math.abs(row.bidRatePercent - store.bidInfo.bidRateToAppraisal) < 2.5;
                    return (
                      <tr
                        key={row.bidRatePercent}
                        className={`border-b border-slate-800 ${
                          isCurrentBid ? 'bg-amber-900/20' : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <td className={`py-2 px-2 font-medium ${isCurrentBid ? 'text-amber-300' : 'text-slate-300'}`}>
                          {row.bidRatePercent}%
                          {isCurrentBid && <span className="ml-1 text-xs bg-amber-500 text-black px-1 rounded">현재</span>}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-300">
                          {formatCurrencyKorean(row.bidPrice)}
                        </td>
                        <td className={`py-2 px-2 text-right font-mono font-bold ${row.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrencyKorean(row.netProfit)}
                        </td>
                        <td className={`py-2 px-2 text-right font-mono ${row.profitRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {row.profitRate.toFixed(1)}%
                        </td>
                        <td className={`py-2 px-2 text-right font-mono ${row.annualProfitRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {row.annualProfitRate.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {result.isVatApplicable && (
                <div className="mt-2 p-2 bg-orange-900/20 border border-orange-700/30 rounded-lg text-xs text-orange-300">
                  ⚠️ 부가세 과세 대상 물건 — 시나리오별 납부 부가세가 순수익에 반영되어 있습니다.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- 레버리지 분석 ---- */}
        {activeAdvanced === 'leverage' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              LTV 비율별 자기자본 수익률(ROE) 비교 분석
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={leverageData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="ltvRatio"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => `LTV${v}%`}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  formatter={(v: number | undefined, name: string | undefined) => [
                    `${(v ?? 0).toFixed(1)}%`,
                    name === 'roe' ? 'ROE(자기자본수익률)' : '전체 수익률',
                  ]}
                />
                <Legend
                  formatter={(v) => (v === 'roe' ? 'ROE' : '전체 수익률')}
                  wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                />
                <Bar dataKey="roe" fill="#D4A843" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalProfitRate" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-2 text-slate-400">LTV</th>
                    <th className="text-right py-2 px-2 text-slate-400">대출금</th>
                    <th className="text-right py-2 px-2 text-slate-400">자기자본</th>
                    <th className="text-right py-2 px-2 text-slate-400">순수익</th>
                    <th className="text-right py-2 px-2 text-slate-400">ROE</th>
                  </tr>
                </thead>
                <tbody>
                  {leverageData.map((row) => (
                    <tr key={row.ltvRatio} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2 px-2 font-medium text-amber-300">LTV {row.ltvRatio}%</td>
                      <td className="py-2 px-2 text-right font-mono text-slate-300">
                        {formatCurrencyKorean(row.loanAmount)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-300">
                        {formatCurrencyKorean(row.ownCapital)}
                      </td>
                      <td className={`py-2 px-2 text-right font-mono font-bold ${row.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrencyKorean(row.netProfit)}
                      </td>
                      <td className={`py-2 px-2 text-right font-mono font-bold ${row.roe >= 0 ? 'text-amber-300' : 'text-red-400'}`}>
                        {row.roe.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---- 세금 비교 ---- */}
        {activeAdvanced === 'tax' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border-2 ${
              taxComp.advantageous === 'business'
                ? 'bg-emerald-900/20 border-emerald-600'
                : 'bg-blue-900/20 border-blue-600'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{taxComp.advantageous === 'business' ? '🏢' : '👤'}</span>
                <div>
                  <p className="font-bold text-white text-sm">
                    {taxComp.advantageous === 'business' ? '매매사업자' : '개인 양도세'}가 유리합니다
                  </p>
                  <p className="text-xs text-slate-400">
                    차이: {formatCurrencyKorean(taxComp.difference)} 절세 가능
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-400 mb-2">🏢 매매사업자 (종합소득세)</p>
                <CostSummaryRow label="세금" amount={taxComp.businessTax} />
                <CostSummaryRow label="세후 순수익" amount={taxComp.businessNetProfit} isTotal />
              </div>
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-400 mb-2">👤 개인 (양도소득세)</p>
                <CostSummaryRow label="세금" amount={taxComp.individualTax} />
                <CostSummaryRow label="세후 순수익" amount={taxComp.individualNetProfit} isTotal />
              </div>
            </div>

            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 text-xs text-slate-400 space-y-1">
              <p>📌 개인 양도세 기준:</p>
              <p>• 보유 {store.saleInfo.holdingMonths}개월 ({store.saleInfo.holdingMonths < 12 ? '단기 70%' : store.saleInfo.holdingMonths < 24 ? '1년이상 60%' : '2년이상 일반과세'})</p>
              <p>• 취득 관련 비용 일부 공제 후 과세</p>
              <p>• 매매사업자는 보유기간 무관, 종합소득세 과세</p>
            </div>
          </div>
        )}

        {/* ---- 역산 기능 ---- */}
        {activeAdvanced === 'reverse' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
              <h4 className="text-sm font-medium text-slate-200">🎯 목표 순수익으로 최대 입찰가 역산</h4>
              <MoneyInput
                label="목표 순수익"
                value={store.targetProfit}
                onChange={store.setTargetProfit}
                quickButtons
              />
              {result.maxBidForTargetProfit > 0 && (
                <div className="p-3 bg-emerald-900/20 border border-emerald-700/50 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">최대 입찰가 (목표 달성)</p>
                  <p className="text-lg font-bold text-emerald-400 font-mono">
                    {formatCurrencyKorean(result.maxBidForTargetProfit)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    감정가 대비:{' '}
                    {store.propertyInfo.appraisalValue > 0
                      ? ((result.maxBidForTargetProfit / store.propertyInfo.appraisalValue) * 100).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
              <h4 className="text-sm font-medium text-slate-200">📈 목표 수익률로 최대 입찰가 역산</h4>
              <RateInput
                label="목표 수익률 (%)"
                value={store.targetProfitRate}
                onChange={store.setTargetProfitRate}
              />
              {result.maxBidForTargetRate > 0 && (
                <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">최대 입찰가 (목표 달성)</p>
                  <p className="text-lg font-bold text-blue-400 font-mono">
                    {formatCurrencyKorean(result.maxBidForTargetRate)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    감정가 대비:{' '}
                    {store.propertyInfo.appraisalValue > 0
                      ? ((result.maxBidForTargetRate / store.propertyInfo.appraisalValue) * 100).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- 지역 통계 ---- */}
        {activeAdvanced === 'stats' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
              <h4 className="text-sm font-medium text-slate-200">📊 지역 평균 낙찰가율 참고</h4>
              <RateInput
                label={`${store.propertyInfo.siDo} ${store.propertyInfo.siGunGu} 지역 평균 낙찰가율`}
                value={store.areaAvgBidRate}
                onChange={store.setAreaAvgBidRate}
                min={40}
                max={120}
              />
              {store.propertyInfo.appraisalValue > 0 && store.bidInfo.bidRateToAppraisal > 0 && (
                <div className="p-3 bg-slate-800 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">지역 평균 낙찰가율</span>
                    <span className="text-slate-200 font-mono">{store.areaAvgBidRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">내 입찰가율</span>
                    <span className="text-amber-300 font-mono">{store.bidInfo.bidRateToAppraisal.toFixed(1)}%</span>
                  </div>
                  <div className="h-px bg-slate-700" />
                  <div className="text-sm">
                    {store.bidInfo.bidRateToAppraisal < store.areaAvgBidRate ? (
                      <p className="text-green-400">
                        ✅ 지역 평균보다{' '}
                        <strong>{(store.areaAvgBidRate - store.bidInfo.bidRateToAppraisal).toFixed(1)}%p</strong> 낮게 입찰 중
                        → 낙찰 경쟁력 우수
                      </p>
                    ) : store.bidInfo.bidRateToAppraisal === store.areaAvgBidRate ? (
                      <p className="text-yellow-400">⚠️ 지역 평균과 동일한 입찰가율</p>
                    ) : (
                      <p className="text-red-400">
                        🔴 지역 평균보다{' '}
                        <strong>{(store.bidInfo.bidRateToAppraisal - store.areaAvgBidRate).toFixed(1)}%p</strong> 높게 입찰 중
                        → 수익성 재검토 권장
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========== 저장 / 내보내기 버튼 ========== */}
      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setShowSaveModal(true)}
          className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-colors text-sm"
        >
          💾 계산 저장
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm"
        >
          📄 PDF 내보내기
        </button>
      </div>

      {/* 저장 모달 */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4">계산 저장</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="저장 이름 (예: 강남구 아파트 경매)"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
              className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm mb-4
                focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-amber-500 text-slate-900 font-bold rounded-lg hover:bg-amber-400 transition-colors"
              >
                저장
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
