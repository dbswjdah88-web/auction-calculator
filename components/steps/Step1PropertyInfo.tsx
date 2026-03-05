'use client';

import React from 'react';
import { useCalculatorStore } from '@/store/calculatorStore';
import { MoneyInput, SectionHeader } from '@/components/ui/inputs';
import { calcMinimumBidPrice, isVatSubject, isIndividualTraderEligible } from '@/lib/calculator';
import type { PropertyType, OccupancyStatus, RegulationZone, HousingCount, BidderType } from '@/types';

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

const REGULATION_ZONES: { value: RegulationZone; label: string; desc: string }[] = [
  { value: 'normal', label: '일반지역', desc: '양도세 중과 없음' },
  { value: 'speculation', label: '투기지역', desc: '+10%p 추가' },
  { value: 'overheated', label: '투기과열지구', desc: '다주택 중과' },
  { value: 'land_trade', label: '토지거래허가구역', desc: '토지거래 제한' },
];

const HOUSING_COUNT: { value: HousingCount; label: string }[] = [
  { value: 'one', label: '1주택' },
  { value: 'two', label: '2주택' },
  { value: 'three_plus', label: '3주택+' },
];

export default function Step1PropertyInfo() {
  const { propertyInfo, updatePropertyInfo } = useCalculatorStore();

  const isResidential = ['apartment', 'villa', 'house', 'officetel'].includes(propertyInfo.propertyType);

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
    <div className="space-y-6">
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

      {/* ────── 세금 계산 기준 설정 (주거용만 표시) ────── */}
      <div className="border-t border-slate-700/50 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⚖️</span>
          <h3 className="text-sm font-semibold text-slate-200">세금 계산 기준 설정</h3>
          <span className="text-xs text-slate-500">(양도세 중과세율 판단용)</span>
        </div>

        {/* 입찰자 구분 */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-400 mb-2">입찰자 구분</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'individual' as BidderType, label: '👤 개인', desc: '양도소득세 적용', always: true },
              { value: 'individual_trader' as BidderType, label: '🏠 개인\n매매사업자', desc: '주거용 한정\n종합소득세', residential: true },
              { value: 'corporation' as BidderType, label: '🏢 법인', desc: '법인세 + 주택 추가세', always: true },
            ].map((opt) => {
              const isTrader = opt.value === 'individual_trader';
              const isDisabled = isTrader && !isIndividualTraderEligible(propertyInfo.propertyType);
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && updatePropertyInfo({ bidderType: opt.value })}
                  className={`p-3 rounded-xl border text-xs font-medium transition-all text-left whitespace-pre-line
                    ${isDisabled ? 'opacity-40 cursor-not-allowed bg-slate-800/40 border-slate-700 text-slate-600' :
                      (propertyInfo.bidderType ?? 'individual') === opt.value
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                >
                  <div className="font-semibold text-sm">{opt.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{opt.desc}</div>
                  {isTrader && isDisabled && (
                    <div className="text-xs text-red-400/70 mt-1">⛔ 주거용 전용</div>
                  )}
                </button>
              );
            })}
          </div>
          {/* 개인 매매사업자 선택 시 안내 */}
          {(propertyInfo.bidderType ?? 'individual') === 'individual_trader' && (
            <div className="mt-2 p-2.5 bg-amber-900/20 border border-amber-700/40 rounded-lg">
              <p className="text-xs text-amber-300">
                💡 <strong>개인 매매사업자</strong>: 아파트·빌라·단독주택·오피스텔 등 주거용 물건에만 적용됩니다.
                상가·토지·공장 등은 개인 양도소득세가 자동 적용됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 규제지역 구분 */}
        {isResidential && (
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-400 mb-2">지역 구분 (주거용 양도세 중과 판단)</label>
            <div className="grid grid-cols-2 gap-2">
              {REGULATION_ZONES.map((zone) => (
                <button
                  key={zone.value}
                  type="button"
                  onClick={() => updatePropertyInfo({ regulationZone: zone.value })}
                  className={`p-2.5 rounded-lg border text-xs font-medium transition-all text-left
                    ${
                      (propertyInfo.regulationZone ?? 'normal') === zone.value
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                >
                  <div className="font-semibold">{zone.label}</div>
                  <div className="opacity-70 mt-0.5">{zone.desc}</div>
                </button>
              ))}
            </div>
            {(propertyInfo.regulationZone ?? 'normal') !== 'normal' && (
              <div className="mt-2 p-2.5 bg-yellow-900/20 border border-yellow-700/40 rounded-lg">
                <p className="text-xs text-yellow-300">
                  ⚠️ 규제지역 내 다주택자는 양도소득세 중과세율이 적용됩니다.
                  {propertyInfo.regulationZone === 'speculation' && ' 투기지역: +10%p'}
                  {propertyInfo.regulationZone === 'overheated' && ' 투기과열지구: 2주택 +20%p, 3주택+ +30%p'}
                  {propertyInfo.regulationZone === 'land_trade' && ' 토지거래허가구역: 실거주 의무'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 주택 보유 수 (주거용만) */}
        {isResidential && (
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-400 mb-2">주택 보유 수 (취득 후 기준)</label>
            <div className="flex gap-2">
              {HOUSING_COUNT.map((hc) => (
                <button
                  key={hc.value}
                  type="button"
                  onClick={() => updatePropertyInfo({ housingCount: hc.value })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all
                    ${
                      (propertyInfo.housingCount ?? 'one') === hc.value
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                >
                  {hc.label}
                </button>
              ))}
            </div>
            {(propertyInfo.housingCount ?? 'one') === 'one' && (
              <p className="text-xs text-emerald-400 mt-1.5">
                ✅ 1세대 1주택: 2년 보유+거주 시 비과세(12억 이하) 가능
              </p>
            )}
            {(propertyInfo.housingCount ?? 'one') === 'two' && (
              <p className="text-xs text-yellow-400 mt-1.5">
                ⚠️ 2주택: 규제지역 내 +20%p 중과세율 적용
              </p>
            )}
            {(propertyInfo.housingCount ?? 'one') === 'three_plus' && (
              <p className="text-xs text-red-400 mt-1.5">
                🔴 3주택+: 규제지역 내 +30%p 중과세율 적용
              </p>
            )}
          </div>
        )}

        {/* 세율 요약 박스 */}
        <div className="p-3 bg-slate-800/60 border border-slate-600/50 rounded-xl">
          <p className="text-xs font-medium text-slate-400 mb-2">📋 현재 설정 기준 양도세율 예상</p>
          <div className="space-y-1">
            {(() => {
              const zone = propertyInfo.regulationZone ?? 'normal';
              const count = propertyInfo.housingCount ?? 'one';
              const bidder = propertyInfo.bidderType ?? 'individual';
              const isRes = ['apartment', 'villa', 'house', 'officetel'].includes(propertyInfo.propertyType);

              if (bidder === 'corporation') {
                return (
                  <div className="text-xs text-slate-300">
                    <span className="text-blue-400">법인세</span>: 9%~24% (누진) 
                    {isRes && <span className="text-red-400"> + 주택 추가세 20%p</span>}
                  </div>
                );
              }
              if (bidder === 'individual_trader') {
                return (
                  <div className="text-xs text-amber-300">
                    <span className="text-amber-400">개인 매매사업자 종합소득세</span>: 6%~45% (누진)<br/>
                    <span className="text-slate-500 text-xs">※ 비용처리 후 남은 차익에 대해 과세 (양도세 합산 없음)</span>
                  </div>
                );
              }
              if (isResidential) {
                if (count === 'one' && zone === 'normal') {
                  return <div className="text-xs text-emerald-300">1세대 1주택: 비과세 가능 (2년 보유+거주, 12억 이하)</div>;
                }
                if (count === 'two' && zone !== 'normal') {
                  return <div className="text-xs text-yellow-300">다주택 중과: 기본세율 + 20%p</div>;
                }
                if (count === 'three_plus' && zone !== 'normal') {
                  return <div className="text-xs text-red-300">다주택 중과: 기본세율 + 30%p</div>;
                }
              }
              return <div className="text-xs text-slate-300">일반 누진세율 6%~45% (2년+ 보유 기준)</div>;
            })()}
            <div className="text-xs text-slate-500">* 보유기간·거주기간에 따라 실제 세율 달라짐</div>
          </div>
        </div>
      </div>
    </div>
  );
}
