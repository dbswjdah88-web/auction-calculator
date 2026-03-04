'use client';

import React from 'react';
import { useCalculatorStore } from '@/store/calculatorStore';
import { MoneyInput, SectionHeader } from '@/components/ui/inputs';
import { calcMinimumBidPrice, isVatSubject } from '@/lib/calculator';
import type { PropertyType, OccupancyStatus } from '@/types';

// 시/도 목록
const SI_DO_LIST = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시',
  '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원도',
  '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '제주특별자치도',
];

const PROPERTY_TYPES: { value: PropertyType; label: string; icon: string }[] = [
  { value: 'apartment', label: '아파트', icon: '🏢' },
  { value: 'officetel', label: '오피스텔', icon: '🏬' },
  { value: 'villa', label: '다세대/빌라', icon: '🏘️' },
  { value: 'house', label: '단독주택', icon: '🏠' },
  { value: 'commercial', label: '상가', icon: '🏪' },
  { value: 'land', label: '토지', icon: '🌍' },
  { value: 'neighborhood', label: '근린생활시설', icon: '🏣' },
  { value: 'factory', label: '공장', icon: '🏭' },
];

const OCCUPANCY_OPTIONS: { value: OccupancyStatus; label: string; icon: string }[] = [
  { value: 'vacant', label: '공실', icon: '🔓' },
  { value: 'tenant', label: '임차인 있음', icon: '👥' },
  { value: 'owner', label: '소유자 점유', icon: '🏠' },
];

export default function Step1PropertyInfo() {
  const { propertyInfo, updatePropertyInfo } = useCalculatorStore();

  const handleFailedBidChange = (count: number) => {
    const newMinPrice = calcMinimumBidPrice(
      propertyInfo.appraisalValue,
      count,
      propertyInfo.depreciationRate
    );
    updatePropertyInfo({
      failedBidCount: count,
      minimumBidPrice: newMinPrice,
    });
  };

  const handleAppraisalChange = (value: number) => {
    const newMinPrice = calcMinimumBidPrice(
      value,
      propertyInfo.failedBidCount,
      propertyInfo.depreciationRate
    );
    updatePropertyInfo({ appraisalValue: value, minimumBidPrice: newMinPrice });
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title="물건 기본 정보"
        description="경매 물건의 기본 정보를 입력해주세요."
        icon="🏠"
      />

      {/* 물건 종류 */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">물건 종류</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PROPERTY_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => updatePropertyInfo({ propertyType: type.value })}
              className={`p-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-2
                ${
                  propertyInfo.propertyType === type.value
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
            >
              <span>{type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 소재지 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">시/도</label>
          <select
            value={propertyInfo.siDo}
            onChange={(e) => updatePropertyInfo({ siDo: e.target.value })}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm
              focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            {SI_DO_LIST.map((sido) => (
              <option key={sido} value={sido}>
                {sido}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">시/군/구</label>
          <input
            type="text"
            value={propertyInfo.siGunGu}
            onChange={(e) => updatePropertyInfo({ siGunGu: e.target.value })}
            placeholder="예: 강남구"
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm
              focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder-slate-500"
          />
        </div>
      </div>

      {/* 전용면적 + VAT 배지 */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          전용면적 (취득세·부가세 산정용)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="number"
              value={propertyInfo.areaM2 || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                updatePropertyInfo({
                  areaM2: val,
                  areaType: val <= 85 ? 'under85' : 'over85',
                });
              }}
              placeholder="전용면적 입력"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm
                focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder-slate-500 pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              ㎡
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updatePropertyInfo({ areaType: 'under85' })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all
                ${
                  propertyInfo.areaType === 'under85'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
            >
              85㎡ 이하
            </button>
            <button
              type="button"
              onClick={() => updatePropertyInfo({ areaType: 'over85' })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all
                ${
                  propertyInfo.areaType === 'over85'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
            >
              85㎡ 초과
            </button>
          </div>
        </div>

        {/* VAT 과세 배지 */}
        {(() => {
          const vatApplicable = isVatSubject(propertyInfo.propertyType, propertyInfo.areaType);
          const isLand = propertyInfo.propertyType === 'land';
          const isCommercial = ['commercial', 'neighborhood', 'factory'].includes(propertyInfo.propertyType);
          return (
            <div className="mt-2">
              {isLand ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-700/50 border border-slate-600 text-xs font-medium text-slate-400">
                  <span>🌍</span>
                  <span>토지 — 부가가치세 전액 면세</span>
                </div>
              ) : vatApplicable ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-900/30 border border-red-600/50 text-xs font-medium text-red-300 animate-pulse">
                  <span>⚠️</span>
                  <span>
                    부가가치세 과세 대상
                    {isCommercial ? ' (상가·근생·공장: 면적 무관 과세)' : ' (85㎡ 초과 주거용)'}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-900/30 border border-emerald-600/50 text-xs font-medium text-emerald-300">
                  <span>✅</span>
                  <span>부가가치세 면세 (85㎡ 이하 주거용)</span>
                </div>
              )}
            </div>
          );
        })()}

        <p className="text-xs text-slate-500 mt-1">
          ※ 85㎡ 이하: 농어촌특별세 면제 | 85㎡ 초과: 농어촌특별세 0.2% 추가
        </p>
      </div>

      {/* 감정가 / 최저입찰가 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MoneyInput
          label="감정가"
          value={propertyInfo.appraisalValue}
          onChange={handleAppraisalChange}
          quickButtons
        />
        <div>
          <MoneyInput
            label="최저입찰가"
            value={propertyInfo.minimumBidPrice}
            onChange={(v) => updatePropertyInfo({ minimumBidPrice: v })}
          />
          {propertyInfo.appraisalValue > 0 && (
            <p className="text-xs text-amber-400 mt-1">
              감정가 대비{' '}
              {((propertyInfo.minimumBidPrice / propertyInfo.appraisalValue) * 100).toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {/* 유찰 횟수 */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          유찰 횟수 (최저가 자동계산)
        </label>
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => handleFailedBidChange(count)}
                className={`w-10 h-10 rounded-lg text-sm font-bold border transition-all
                  ${
                    propertyInfo.failedBidCount === count
                      ? 'bg-amber-500 border-amber-500 text-slate-900'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
              >
                {count}
              </button>
            ))}
          </div>
          {/* 체감율 선택 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">체감율:</span>
            {[20, 30].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => {
                  const newMinPrice = calcMinimumBidPrice(
                    propertyInfo.appraisalValue,
                    propertyInfo.failedBidCount,
                    rate
                  );
                  updatePropertyInfo({ depreciationRate: rate, minimumBidPrice: newMinPrice });
                }}
                className={`px-3 py-1 rounded text-sm border transition-all
                  ${
                    propertyInfo.depreciationRate === rate
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
              >
                매회 {rate}%↓
              </button>
            ))}
          </div>
          {propertyInfo.failedBidCount > 0 && (
            <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
              <p className="text-sm text-blue-300">
                📊 {propertyInfo.failedBidCount}회 유찰 후 최저가:{' '}
                <span className="font-bold font-mono">
                  {(
                    (propertyInfo.minimumBidPrice / propertyInfo.appraisalValue) *
                    100
                  ).toFixed(1)}
                  %
                </span>{' '}
                (감정가 대비)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 점유 상태 */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">점유 상태</label>
        <div className="grid grid-cols-3 gap-2">
          {OCCUPANCY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updatePropertyInfo({ occupancyStatus: opt.value })}
              className={`p-3 rounded-xl border text-sm font-medium transition-all text-center
                ${
                  propertyInfo.occupancyStatus === opt.value
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
            >
              <div className="text-2xl mb-1">{opt.icon}</div>
              {opt.label}
            </button>
          ))}
        </div>

        {propertyInfo.occupancyStatus === 'tenant' && (
          <div className="mt-3">
            <MoneyInput
              label="임차인 보증금"
              value={propertyInfo.tenantDeposit}
              onChange={(v) => updatePropertyInfo({ tenantDeposit: v })}
              hint="명도 시 반환해야 하는 임차인 보증금"
            />
          </div>
        )}
      </div>

      {/* 선순위 권리분석 */}
      <MoneyInput
        label="선순위 권리분석 금액 (인수해야 할 보증금 등)"
        value={propertyInfo.priorRightAmount}
        onChange={(v) => updatePropertyInfo({ priorRightAmount: v })}
        hint="낙찰 후 인수해야 하는 선순위 보증금 등"
      />
    </div>
  );
}
