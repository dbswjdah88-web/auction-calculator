'use client';

import React from 'react';
import { useCalculatorStore } from '@/store/calculatorStore';
import { MoneyInput, RateInput, SectionHeader, InfoCard } from '@/components/ui/inputs';
import { formatCurrencyKorean, formatPercent } from '@/lib/calculator';

export default function Step2BidInfo() {
  const { propertyInfo, bidInfo, setBidPrice, setBidRateToAppraisal } =
    useCalculatorStore();

  const handleBidPriceChange = (price: number) => {
    setBidPrice(price);
  };

  const handleRateChange = (rate: number) => {
    setBidRateToAppraisal(rate);
  };

  const handleMinimumRateChange = (rate: number) => {
    const price = Math.round(propertyInfo.minimumBidPrice * (rate / 100));
    setBidPrice(price);
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title="입찰가 설정"
        description="희망 입찰가를 직접 입력하거나 낙찰가율로 자동 계산합니다."
        icon="💰"
      />

      {/* 현재 기준 정보 */}
      <div className="grid grid-cols-2 gap-3">
        <InfoCard
          label="감정가"
          value={formatCurrencyKorean(propertyInfo.appraisalValue)}
          variant="default"
        />
        <InfoCard
          label="최저입찰가"
          value={formatCurrencyKorean(propertyInfo.minimumBidPrice)}
          sub={`감정가의 ${((propertyInfo.minimumBidPrice / propertyInfo.appraisalValue) * 100).toFixed(1)}%`}
          variant="default"
        />
      </div>

      {/* 입찰가 직접 입력 */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <MoneyInput
          label="입찰 희망가 (직접 입력)"
          value={bidInfo.bidPrice}
          onChange={handleBidPriceChange}
          quickButtons
        />
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-slate-500 text-sm">또는</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      {/* 낙찰가율로 계산 */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-4">
        <RateInput
          label="감정가 대비 낙찰가율 (%)"
          value={parseFloat(bidInfo.bidRateToAppraisal.toFixed(1))}
          onChange={handleRateChange}
          min={40}
          max={120}
          step={1}
        />
        <div className="flex gap-2 flex-wrap">
          {[60, 65, 70, 75, 80, 85, 90, 95, 100].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => handleRateChange(rate)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all
                ${
                  Math.abs(bidInfo.bidRateToAppraisal - rate) < 0.5
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
            >
              {rate}%
            </button>
          ))}
        </div>

        <div className="h-px bg-slate-700" />

        <RateInput
          label="최저가 대비 입찰가 비율 (%)"
          value={parseFloat(bidInfo.bidRateToMinimum.toFixed(1))}
          onChange={handleMinimumRateChange}
          min={100}
          max={200}
          step={1}
        />
      </div>

      {/* 결과 요약 카드들 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InfoCard
          label="설정된 입찰가"
          value={formatCurrencyKorean(bidInfo.bidPrice)}
          variant="gold"
        />
        <InfoCard
          label="감정가 대비"
          value={formatPercent(bidInfo.bidRateToAppraisal)}
          sub={`감정가: ${formatCurrencyKorean(propertyInfo.appraisalValue)}`}
          variant={bidInfo.bidRateToAppraisal <= 80 ? 'positive' : 'warning'}
        />
        <InfoCard
          label="최저가 대비"
          value={formatPercent(bidInfo.bidRateToMinimum)}
          sub={`최저가: ${formatCurrencyKorean(propertyInfo.minimumBidPrice)}`}
          variant={bidInfo.bidRateToMinimum <= 110 ? 'positive' : 'warning'}
        />
      </div>

      {/* 경쟁분석 힌트 */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <h3 className="text-sm font-medium text-slate-300 mb-3">📊 입찰가 분석</h3>
        <div className="space-y-2">
          {bidInfo.bidPrice < propertyInfo.minimumBidPrice && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <span>⚠️</span>
              <span>입찰가가 최저입찰가보다 낮습니다.</span>
            </div>
          )}
          {bidInfo.bidRateToAppraisal < 60 && (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <span>💡</span>
              <span>낙찰가율 60% 이하: 경쟁 낮을 가능성, 물건 리스크 검토 필요</span>
            </div>
          )}
          {bidInfo.bidRateToAppraisal >= 60 && bidInfo.bidRateToAppraisal < 80 && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <span>✅</span>
              <span>낙찰가율 60~80%: 비교적 안전한 수익 구간</span>
            </div>
          )}
          {bidInfo.bidRateToAppraisal >= 80 && bidInfo.bidRateToAppraisal < 95 && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <span>⚠️</span>
              <span>낙찰가율 80~95%: 수익률 점검 필요</span>
            </div>
          )}
          {bidInfo.bidRateToAppraisal >= 95 && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <span>🔴</span>
              <span>낙찰가율 95% 이상: 고가 낙찰 위험, 수익성 재검토 권장</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-blue-400 text-sm">
            <span>💰</span>
            <span>
              입찰보증금 (10%): {formatCurrencyKorean(bidInfo.bidPrice * 0.1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
