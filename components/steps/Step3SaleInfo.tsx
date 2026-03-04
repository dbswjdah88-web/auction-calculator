'use client';

import React from 'react';
import { useCalculatorStore } from '@/store/calculatorStore';
import { MoneyInput, SectionHeader, InfoCard } from '@/components/ui/inputs';
import { formatCurrencyKorean } from '@/lib/calculator';
import type { SaleMethod } from '@/types';

const SALE_METHODS: { value: SaleMethod; label: string; icon: string; desc: string }[] = [
  { value: 'agent', label: '중개 의뢰', icon: '🤝', desc: '공인중개사를 통한 매도 (중개보수 발생)' },
  { value: 'direct', label: '직접 매도', icon: '👤', desc: '직접 매수인을 찾아 매도 (중개보수 없음)' },
];

export default function Step3SaleInfo() {
  const { bidInfo, saleInfo, updateSaleInfo } = useCalculatorStore();

  const profitGross = saleInfo.expectedSalePrice - bidInfo.bidPrice;
  const profitRateGross =
    bidInfo.bidPrice > 0 ? (profitGross / bidInfo.bidPrice) * 100 : 0;

  return (
    <div className="space-y-8">
      <SectionHeader
        title="매도 예상가 설정"
        description="예상 매도가와 보유 기간을 입력해주세요."
        icon="📈"
      />

      {/* 매도 예상가 */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <MoneyInput
          label="예상 매도가"
          value={saleInfo.expectedSalePrice}
          onChange={(v) => updateSaleInfo({ expectedSalePrice: v })}
          quickButtons
          hint="목표 매도 희망가를 입력해주세요."
        />
        {saleInfo.expectedSalePrice > 0 && bidInfo.bidPrice > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <InfoCard
              label="세전 매매차익"
              value={formatCurrencyKorean(profitGross)}
              variant={profitGross >= 0 ? 'positive' : 'negative'}
            />
            <InfoCard
              label="단순 수익률"
              value={`${profitRateGross.toFixed(1)}%`}
              sub="(비용 제외 단순 계산)"
              variant={profitRateGross >= 0 ? 'positive' : 'negative'}
            />
          </div>
        )}
      </div>

      {/* 보유 기간 */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          예상 보유 기간
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={saleInfo.holdingMonths}
            onChange={(e) => updateSaleInfo({ holdingMonths: parseInt(e.target.value) || 1 })}
            min={1}
            max={120}
            className="w-24 px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-center font-mono
              focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <span className="text-slate-300 text-sm">개월</span>
          <span className="text-slate-500 text-sm">
            ({Math.floor(saleInfo.holdingMonths / 12)}년 {saleInfo.holdingMonths % 12}개월)
          </span>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {[3, 6, 9, 12, 18, 24, 36].map((months) => (
            <button
              key={months}
              type="button"
              onClick={() => updateSaleInfo({ holdingMonths: months })}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all
                ${
                  saleInfo.holdingMonths === months
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
            >
              {months}개월
            </button>
          ))}
        </div>
        <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <p className="text-xs text-slate-400 space-y-1">
            <span className="block">
              ⚠️ <strong className="text-amber-400">1년 미만 보유</strong>: 개인 양도세 70% 단기과세 (매매사업자는 해당 없음)
            </span>
            <span className="block">
              ✅ <strong className="text-amber-400">매매사업자</strong>: 보유 기간 무관, 종합소득세 과세
            </span>
          </p>
        </div>
      </div>

      {/* 매도 방식 */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">매도 방식</label>
        <div className="grid grid-cols-2 gap-3">
          {SALE_METHODS.map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => updateSaleInfo({ saleMethod: method.value })}
              className={`p-4 rounded-xl border text-left transition-all
                ${
                  saleInfo.saleMethod === method.value
                    ? 'bg-amber-500/20 border-amber-500'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                }`}
            >
              <div className="text-2xl mb-2">{method.icon}</div>
              <div
                className={`font-medium text-sm ${
                  saleInfo.saleMethod === method.value ? 'text-amber-300' : 'text-slate-300'
                }`}
              >
                {method.label}
              </div>
              <div className="text-xs text-slate-500 mt-1">{method.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 세금 관련 참고 안내 */}
      <div className="p-4 bg-blue-900/10 border border-blue-800/30 rounded-xl space-y-2">
        <h3 className="text-sm font-semibold text-blue-300">📋 매매사업자 세금 안내</h3>
        <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
          <li>
            매매사업자는 양도소득세 대신 <strong className="text-white">종합소득세</strong>가 과세됩니다.
          </li>
          <li>
            취득세, 법무사비, 명도비용 등 대부분의 비용을 <strong className="text-white">필요경비로 공제</strong> 가능합니다.
          </li>
          <li>
            보유 기간과 관계없이 동일 세율이 적용됩니다.
          </li>
          <li>
            기존 다른 소득(근로, 사업 등)과 합산하여 세율이 결정됩니다.
          </li>
        </ul>
      </div>
    </div>
  );
}
