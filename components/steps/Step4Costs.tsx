'use client';

import React, { useState } from 'react';
import { useCalculatorStore } from '@/store/calculatorStore';
import {
  MoneyInput,
  RateInput,
  SectionHeader,
  CustomItemList,
  CostSummaryRow,
} from '@/components/ui/inputs';
import {
  formatCurrencyKorean,
  calcAcquisitionCostTotal,
  calcHoldingCostTotal,
  calcSaleCostTotal,
  calcLoanInterest,
} from '@/lib/calculator';

type SubTab = 'acquisition' | 'holding' | 'sale';

export default function Step4Costs() {
  const [activeTab, setActiveTab] = useState<SubTab>('acquisition');
  const {
    bidInfo,
    saleInfo,
    acquisitionCosts,
    holdingCosts,
    saleCosts,
    updateAcquisitionCosts,
    updateHoldingCosts,
    updateSaleCosts,
    addCustomItem,
    removeCustomItem,
    updateCustomItem,
  } = useCalculatorStore();

  const acqTotal = calcAcquisitionCostTotal(acquisitionCosts);
  const holdTotal = calcHoldingCostTotal(holdingCosts, saleInfo.holdingMonths);
  const saleTotal = calcSaleCostTotal(saleCosts);

  const tabs: { id: SubTab; label: string; icon: string; amount: number }[] = [
    { id: 'acquisition', label: '취득 비용', icon: '🏷️', amount: acqTotal },
    { id: 'holding', label: '보유 비용', icon: '🔄', amount: holdTotal },
    { id: 'sale', label: '매도 비용', icon: '💼', amount: saleTotal },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="비용 입력"
        description="취득, 보유, 매도 시 발생하는 모든 비용을 입력해주세요."
        icon="💸"
      />

      {/* 탭 */}
      <div className="grid grid-cols-3 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`p-3 rounded-xl border text-left transition-all
              ${
                activeTab === tab.id
                  ? 'bg-amber-500/20 border-amber-500'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-500'
              }`}
          >
            <div className="text-lg mb-1">{tab.icon}</div>
            <div
              className={`text-xs font-medium ${
                activeTab === tab.id ? 'text-amber-300' : 'text-slate-300'
              }`}
            >
              {tab.label}
            </div>
            <div className="text-xs font-mono text-slate-400 mt-0.5">
              {formatCurrencyKorean(tab.amount)}
            </div>
          </button>
        ))}
      </div>

      {/* ============ 취득 비용 탭 ============ */}
      {activeTab === 'acquisition' && (
        <div className="space-y-6">
          {/* 자동 계산 항목 */}
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">자동계산</span>
              자동 산출 항목
            </h3>
            <CostSummaryRow label="취득세 (매매사업자 기준)" amount={acquisitionCosts.acquisitionTax} />
            <CostSummaryRow label="등록면허세 (낙찰가 × 0.2%)" amount={acquisitionCosts.registrationLicenseTax} />
            <CostSummaryRow label="지방교육세 (등록면허세 × 20%)" amount={acquisitionCosts.localEducationTax} />
            <CostSummaryRow label="인지대" amount={acquisitionCosts.stampDuty} />
            <CostSummaryRow label="대법원 수입인지" amount={acquisitionCosts.courtRevenuestamp} />
            <CostSummaryRow label="등기신청 수수료" amount={acquisitionCosts.registrationFee} />
            <CostSummaryRow label="입찰보증금 이자 손실" amount={acquisitionCosts.courtDepositInterestLoss} />
            <CostSummaryRow label="대출 이자" amount={acquisitionCosts.loanInterest} />
          </div>

          {/* 이자 손실 설정 */}
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">⚙️ 이자 손실 설정</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">보증금 묶이는 기간 (일)</label>
                <input
                  type="number"
                  value={acquisitionCosts.depositLockMonths}
                  onChange={(e) =>
                    updateAcquisitionCosts({
                      depositLockMonths: parseInt(e.target.value) || 30,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <RateInput
                label="연이율 (%)"
                value={acquisitionCosts.annualInterestRate}
                onChange={(v) => updateAcquisitionCosts({ annualInterestRate: v })}
                step={0.1}
              />
            </div>
            <p className="text-xs text-slate-500">
              보증금: {formatCurrencyKorean(bidInfo.bidPrice * 0.1)} × {acquisitionCosts.depositLockMonths}일 / 365 × {acquisitionCosts.annualInterestRate}%
            </p>
          </div>

          {/* 송달료 */}
          <MoneyInput
            label="송달료"
            value={acquisitionCosts.deliveryFee}
            onChange={(v) => updateAcquisitionCosts({ deliveryFee: v })}
            hint="통상 65,000원 내외"
          />

          {/* 법무사 비용 */}
          <MoneyInput
            label="법무사 비용"
            value={acquisitionCosts.legalScrivenerFee}
            onChange={(v) => updateAcquisitionCosts({ legalScrivenerFee: v })}
            hint="기본값 500,000원"
          />

          {/* 명도 비용 */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">🚛 명도 비용</h3>
            <div className="space-y-3">
              <MoneyInput
                label="이사비"
                value={acquisitionCosts.evictionCost.movingFee}
                onChange={(v) =>
                  updateAcquisitionCosts({
                    evictionCost: { ...acquisitionCosts.evictionCost, movingFee: v },
                  })
                }
              />
              <MoneyInput
                label="명도소송비"
                value={acquisitionCosts.evictionCost.litigationFee}
                onChange={(v) =>
                  updateAcquisitionCosts({
                    evictionCost: { ...acquisitionCosts.evictionCost, litigationFee: v },
                  })
                }
              />
              <MoneyInput
                label="강제집행비"
                value={acquisitionCosts.evictionCost.enforcementFee}
                onChange={(v) =>
                  updateAcquisitionCosts({
                    evictionCost: { ...acquisitionCosts.evictionCost, enforcementFee: v },
                  })
                }
              />
            </div>
          </div>

          {/* 미납 관리비 */}
          <MoneyInput
            label="미납 관리비"
            value={acquisitionCosts.unpaidManagementFee}
            onChange={(v) => updateAcquisitionCosts({ unpaidManagementFee: v })}
          />

          {/* 대출 설정 */}
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">🏦 대출 설정</h3>
            <MoneyInput
              label="대출 금액"
              value={acquisitionCosts.loanAmount}
              onChange={(v) => {
                const interest = calcLoanInterest(v, acquisitionCosts.loanRate, saleInfo.holdingMonths);
                updateAcquisitionCosts({ loanAmount: v, loanInterest: interest });
              }}
              hint={`LTV: ${bidInfo.bidPrice > 0 ? ((acquisitionCosts.loanAmount / bidInfo.bidPrice) * 100).toFixed(0) : 0}%`}
            />
            <div className="grid grid-cols-2 gap-3">
              <RateInput
                label="대출 금리 (연 %)"
                value={acquisitionCosts.loanRate}
                onChange={(v) => {
                  const interest = calcLoanInterest(acquisitionCosts.loanAmount, v, saleInfo.holdingMonths);
                  updateAcquisitionCosts({ loanRate: v, loanInterest: interest });
                }}
                step={0.1}
              />
              <div>
                <label className="block text-xs text-slate-400 mb-1">대출 기간 (개월)</label>
                <input
                  type="number"
                  value={acquisitionCosts.loanMonths}
                  onChange={(e) => {
                    const months = parseInt(e.target.value) || 1;
                    updateAcquisitionCosts({ loanMonths: months });
                  }}
                  min={1}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            {/* 이자 미리보기: 보유기간(holdingMonths) 기준으로 실시간 계산 */}
            <div className="p-3 bg-slate-800 rounded-lg space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">예상 이자 (보유기간 기준)</span>
                <span className="text-amber-300 font-mono font-bold text-sm">
                  {formatCurrencyKorean(
                    calcLoanInterest(acquisitionCosts.loanAmount, acquisitionCosts.loanRate, saleInfo.holdingMonths)
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {formatCurrencyKorean(acquisitionCosts.loanAmount)} × {acquisitionCosts.loanRate}% ÷ 12 × {saleInfo.holdingMonths}개월
              </p>
              {acquisitionCosts.loanAmount > 0 && acquisitionCosts.loanRate > 0 && (
                <p className="text-xs text-blue-400">
                  ※ 보유기간({saleInfo.holdingMonths}개월) 기준 계산 — Step3 보유기간 변경 시 자동 반영됩니다.
                </p>
              )}
            </div>
            <MoneyInput
              label="대출 설정비"
              value={acquisitionCosts.loanSetupFee}
              onChange={(v) => updateAcquisitionCosts({ loanSetupFee: v })}
              hint="근저당 설정 등록면허세 + 법무사비"
            />
          </div>

          {/* 기타 취득 비용 */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">기타 취득 비용</h3>
            <CustomItemList
              items={acquisitionCosts.customItems}
              onAdd={() =>
                addCustomItem('acquisition', { name: '', amount: 0, included: true })
              }
              onRemove={(id) => removeCustomItem('acquisition', id)}
              onUpdate={(id, updates) => updateCustomItem('acquisition', id, updates)}
              addLabel="+ 기타 취득 비용 추가"
            />
          </div>

          {/* 취득 비용 합계 */}
          <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-xl">
            <CostSummaryRow label="취득 비용 합계" amount={acqTotal} isTotal />
          </div>
        </div>
      )}

      {/* ============ 보유 비용 탭 ============ */}
      {activeTab === 'holding' && (
        <div className="space-y-6">
          {/* 재산세 */}
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700 space-y-2">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">자동계산</span>
              재산세 (보유기간 안분)
            </h3>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">
                보유 {saleInfo.holdingMonths}개월 기준 재산세
              </span>
              <span className="text-amber-300 font-mono text-sm font-bold">
                {formatCurrencyKorean(holdingCosts.propertyTax)}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              ※ 간략 추정값입니다. 실제 재산세는 공시가격 기준으로 달라질 수 있습니다.
            </p>
            <MoneyInput
              label="재산세 직접 입력 (수정 가능)"
              value={holdingCosts.propertyTax}
              onChange={(v) => updateHoldingCosts({ propertyTax: v })}
            />
          </div>

          {/* 종합부동산세 */}
          <MoneyInput
            label="종합부동산세"
            value={holdingCosts.comprehensiveRealEstateTax}
            onChange={(v) => updateHoldingCosts({ comprehensiveRealEstateTax: v })}
            hint="매매사업자는 대부분 비해당 (해당 시 입력)"
          />

          {/* 월 관리비 */}
          <div>
            <MoneyInput
              label="월 관리비 / 공과금"
              value={holdingCosts.maintenanceFeeMonthly}
              onChange={(v) => updateHoldingCosts({ maintenanceFeeMonthly: v })}
              hint={`보유 ${saleInfo.holdingMonths}개월 합계: ${formatCurrencyKorean(holdingCosts.maintenanceFeeMonthly * saleInfo.holdingMonths)}`}
            />
          </div>

          {/* 수리/인테리어 */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">🔨 수리/인테리어 비용</h3>
            <CustomItemList
              items={holdingCosts.repairCosts}
              onAdd={() => addCustomItem('repair', { name: '', amount: 0, included: true })}
              onRemove={(id) => removeCustomItem('repair', id)}
              onUpdate={(id, updates) => updateCustomItem('repair', id, updates)}
              addLabel="+ 수리/인테리어 항목 추가"
            />
          </div>

          {/* 보험료 */}
          <MoneyInput
            label="보험료 (화재보험 등)"
            value={holdingCosts.insuranceFee}
            onChange={(v) => updateHoldingCosts({ insuranceFee: v })}
          />

          {/* 기타 보유 비용 */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">기타 보유 비용</h3>
            <CustomItemList
              items={holdingCosts.customItems}
              onAdd={() => addCustomItem('holding', { name: '', amount: 0, included: true })}
              onRemove={(id) => removeCustomItem('holding', id)}
              onUpdate={(id, updates) => updateCustomItem('holding', id, updates)}
              addLabel="+ 기타 보유 비용 추가"
            />
          </div>

          {/* 보유 비용 합계 */}
          <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-xl">
            <CostSummaryRow
              label={`보유 비용 합계 (${saleInfo.holdingMonths}개월)`}
              amount={holdTotal}
              isTotal
            />
          </div>
        </div>
      )}

      {/* ============ 매도 비용 탭 ============ */}
      {activeTab === 'sale' && (
        <div className="space-y-6">
          {/* 중개보수 */}
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">자동계산</span>
              중개보수
            </h3>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">
                {saleInfo.saleMethod === 'direct' ? '직접매도 (0원)' : `요율 ${saleCosts.agentCommissionRate.toFixed(2)}%`}
              </span>
              <span className="text-amber-300 font-mono text-sm font-bold">
                {formatCurrencyKorean(saleCosts.agentCommission)}
              </span>
            </div>
            <MoneyInput
              label="중개보수 직접 수정"
              value={saleCosts.agentCommission}
              onChange={(v) => updateSaleCosts({ agentCommission: v })}
              hint="자동 계산된 값을 수동으로 수정 가능"
            />
            <div className="text-xs text-slate-500 space-y-0.5">
              <p>• 5천만원 미만: 0.6% (최대 25만원)</p>
              <p>• 5천만원~2억 미만: 0.5% (최대 80만원)</p>
              <p>• 2억~9억 미만: 0.4%</p>
              <p>• 9억~12억 미만: 0.5%</p>
              <p>• 12억~15억 미만: 0.6%</p>
              <p>• 15억 이상: 0.7%</p>
            </div>
          </div>

          {/* 말소 비용 */}
          <MoneyInput
            label="말소 비용 (대출 상환 시)"
            value={saleCosts.cancelRegistrationFee}
            onChange={(v) => updateSaleCosts({ cancelRegistrationFee: v })}
            hint="근저당 말소 등기 비용"
          />

          {/* 기타 매도 비용 */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">기타 매도 비용</h3>
            <CustomItemList
              items={saleCosts.customItems}
              onAdd={() => addCustomItem('sale', { name: '', amount: 0, included: true })}
              onRemove={(id) => removeCustomItem('sale', id)}
              onUpdate={(id, updates) => updateCustomItem('sale', id, updates)}
              addLabel="+ 기타 매도 비용 추가"
            />
          </div>

          {/* 매도 비용 합계 */}
          <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-xl">
            <CostSummaryRow label="매도 비용 합계" amount={saleTotal} isTotal />
          </div>
        </div>
      )}

      {/* 전체 합계 */}
      <div className="p-4 bg-gradient-to-br from-amber-900/30 to-yellow-900/10 border border-amber-700 rounded-xl">
        <h3 className="text-sm font-semibold text-amber-300 mb-3">💰 총 비용 합계</h3>
        <CostSummaryRow label="취득 비용" amount={acqTotal} />
        <CostSummaryRow label="보유 비용" amount={holdTotal} />
        <CostSummaryRow label="매도 비용" amount={saleTotal} />
        <CostSummaryRow label="총 비용 (세금 제외)" amount={acqTotal + holdTotal + saleTotal} isTotal />
      </div>
    </div>
  );
}
