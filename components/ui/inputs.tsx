'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency, formatCurrencyKorean } from '@/lib/calculator';
// ====================================
// 금액 입력 컴포넌트
// ====================================
interface MoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  hint?: string;
  quickButtons?: boolean;
  suffix?: string;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  label,
  placeholder = '0',
  className = '',
  disabled = false,
  hint,
  quickButtons = false,
  suffix,
}) => {
  const [inputValue, setInputValue] = useState(value > 0 ? formatCurrency(value) : '');

  useEffect(() => {
    setInputValue(value > 0 ? formatCurrency(value) : '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    setInputValue(raw ? formatCurrency(Number(raw)) : '');
    onChange(raw ? Number(raw) : 0);
  };

  const handleQuickAdd = (amount: number) => {
    const newValue = value + amount;
    onChange(newValue);
    setInputValue(formatCurrency(newValue));
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-300">{label}</label>
      )}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white font-mono text-right
            focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-500
            transition-colors text-sm`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            {suffix}
          </span>
        )}
      </div>
      {value > 0 && (
        <p className="text-xs text-amber-400 font-medium">{formatCurrencyKorean(value)}</p>
      )}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {quickButtons && (
        <div className="flex gap-1 flex-wrap">
          {[1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => handleQuickAdd(amount)}
              className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded border border-slate-600 transition-colors"
            >
              +{amount >= 100_000_000 ? `${amount / 100_000_000}억` : `${amount / 10_000}만`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ====================================
// 비율 입력 컴포넌트
// ====================================
interface RateInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  suffix?: string;
}

export const RateInput: React.FC<RateInputProps> = ({
  value,
  onChange,
  label,
  min = 0,
  max = 100,
  step = 0.1,
  className = '',
  suffix = '%',
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-300">{label}</label>
      )}
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white font-mono text-right
            focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
            transition-colors text-sm pr-8"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
          {suffix}
        </span>
      </div>
    </div>
  );
};

// ====================================
// 커스텀 항목 목록 컴포넌트
// ====================================
interface CustomItemListProps {
  items: Array<{ id: string; name: string; amount: number; included?: boolean }>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: { name?: string; amount?: number; included?: boolean }) => void;
  showIncluded?: boolean;
  addLabel?: string;
}

export const CustomItemList: React.FC<CustomItemListProps> = ({
  items,
  onAdd,
  onRemove,
  onUpdate,
  showIncluded = false,
  addLabel = '+ 항목 추가',
}) => {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex gap-2 items-center p-2 bg-slate-800/50 rounded-lg border border-slate-700"
        >
          {showIncluded && (
            <input
              type="checkbox"
              checked={item.included !== false}
              onChange={(e) => onUpdate(item.id, { included: e.target.checked })}
              className="w-4 h-4 accent-amber-500 flex-shrink-0"
            />
          )}
          <input
            type="text"
            value={item.name}
            onChange={(e) => onUpdate(item.id, { name: e.target.value })}
            placeholder="항목명"
            className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm
              focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-slate-500"
          />
          <input
            type="text"
            value={item.amount > 0 ? formatCurrency(item.amount) : ''}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, '');
              onUpdate(item.id, { amount: raw ? Number(raw) : 0 });
            }}
            placeholder="금액"
            className="w-36 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white font-mono text-right text-sm
              focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-slate-500"
          />
          <span className="text-slate-400 text-sm flex-shrink-0">원</span>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="text-red-400 hover:text-red-300 flex-shrink-0 transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-slate-400
          hover:border-amber-500 hover:text-amber-400 transition-colors text-sm"
      >
        {addLabel}
      </button>
    </div>
  );
};

// ====================================
// 정보 카드 컴포넌트
// ====================================
interface InfoCardProps {
  label: string;
  value: string;
  sub?: string;
  variant?: 'default' | 'positive' | 'negative' | 'warning' | 'gold';
  className?: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  label,
  value,
  sub,
  variant = 'default',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-slate-800 border-slate-700',
    positive: 'bg-emerald-900/30 border-emerald-700',
    negative: 'bg-red-900/30 border-red-700',
    warning: 'bg-amber-900/30 border-amber-700',
    gold: 'bg-gradient-to-br from-amber-900/40 to-yellow-900/20 border-amber-600',
  };

  const valueStyles = {
    default: 'text-white',
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    warning: 'text-amber-400',
    gold: 'text-amber-300',
  };

  return (
    <div className={`p-4 rounded-xl border ${variantStyles[variant]} ${className}`}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${valueStyles[variant]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
};

// ====================================
// 섹션 헤더 컴포넌트
// ====================================
interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description, icon }) => {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        {icon && <span className="text-amber-400">{icon}</span>}
        {title}
      </h2>
      {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
    </div>
  );
};

// ====================================
// 토글 스위치
// ====================================
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label }) => {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-amber-500' : 'bg-slate-600'
        }`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
      {label && <span className="text-sm text-slate-300">{label}</span>}
    </label>
  );
};

// ====================================
// 프로그레스 바
// ====================================
interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
}) => {
  return (
    <div className="w-full">
      {/* 스텝 인디케이터 */}
      <div className="flex items-center justify-between mb-2">
        {stepLabels.map((label, index) => {
          const step = index + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${
                      isCompleted
                        ? 'bg-amber-500 text-slate-900'
                        : isCurrent
                        ? 'bg-amber-500 text-slate-900 ring-4 ring-amber-500/30'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                >
                  {isCompleted ? '✓' : step}
                </div>
                <span
                  className={`text-xs mt-1 hidden sm:block ${
                    isCurrent ? 'text-amber-400 font-medium' : 'text-slate-500'
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < totalSteps - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-all ${
                    step < currentStep ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ====================================
// 하단 고정 요약 바
// ====================================
interface BottomSummaryBarProps {
  netProfit: number;
  profitRate: number;
  totalInvestment: number;
}

export const BottomSummaryBar: React.FC<BottomSummaryBarProps> = ({
  netProfit,
  profitRate,
  totalInvestment,
}) => {
  const isPositive = netProfit >= 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-slate-400 text-sm hidden sm:block">예상 순수익</span>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end">
          <div className="text-right">
            <span
              className={`text-lg font-bold font-mono ${
                isPositive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isPositive ? '+' : ''}
              {formatCurrencyKorean(netProfit)}
            </span>
            <span
              className={`ml-2 text-sm font-mono ${
                isPositive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              ({isPositive ? '+' : ''}
              {profitRate.toFixed(1)}%)
            </span>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs text-slate-500">실투자금</p>
            <p className="text-sm text-slate-300 font-mono">
              {formatCurrencyKorean(totalInvestment)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================================
// 체크박스 컴포넌트
// ====================================
interface CheckboxItemProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  sublabel?: string;
  amount?: number;
}

export const CheckboxItem: React.FC<CheckboxItemProps> = ({
  checked,
  onChange,
  label,
  sublabel,
  amount,
}) => {
  return (
    <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
      ${checked ? 'bg-amber-900/20 border border-amber-700/50' : 'bg-slate-800/50 border border-slate-700/50'}
      hover:bg-slate-700/50`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-amber-500 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${checked ? 'text-white' : 'text-slate-400'}`}>{label}</span>
        {sublabel && <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>}
      </div>
      {amount !== undefined && (
        <span className={`text-sm font-mono flex-shrink-0 ${checked ? 'text-amber-300' : 'text-slate-500'}`}>
          {formatCurrencyKorean(amount)}
        </span>
      )}
    </label>
  );
};

// ====================================
// 구분선 + 합계 행
// ====================================
interface CostSummaryRowProps {
  label: string;
  amount: number;
  isTotal?: boolean;
  className?: string;
}

export const CostSummaryRow: React.FC<CostSummaryRowProps> = ({
  label,
  amount,
  isTotal = false,
  className = '',
}) => {
  return (
    <div
      className={`flex justify-between items-center py-2 ${
        isTotal
          ? 'border-t border-slate-600 mt-2 pt-3 font-bold'
          : 'border-b border-slate-800'
      } ${className}`}
    >
      <span className={`text-sm ${isTotal ? 'text-white' : 'text-slate-400'}`}>{label}</span>
      <span className={`font-mono text-sm ${isTotal ? 'text-amber-400 text-base' : 'text-slate-300'}`}>
        {formatCurrencyKorean(amount)}
      </span>
    </div>
  );
};
