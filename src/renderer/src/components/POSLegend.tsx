import React from 'react';

/**
 * Compact legend for POS underline colors.
 * Why: Tells user which underline color = which part of speech.
 * Uses clean inline text samples instead of heavy chips.
 */

const LEGEND_ITEMS = [
  { label: 'Noun', color: 'text-rose-600 dark:text-rose-400 decoration-rose-400' },
  { label: 'Verb', color: 'text-emerald-600 dark:text-emerald-400 decoration-emerald-400' },
  { label: 'Adjective', color: 'text-sky-600 dark:text-sky-400 decoration-sky-400' },
  { label: 'Adverb', color: 'text-amber-600 dark:text-amber-400 decoration-amber-400' },
  { label: 'Other', color: 'text-slate-500 dark:text-slate-400', plain: true }
];

// Keep POS_COLORS export for backward compatibility with other components
export const POS_COLORS = {
  noun: {
    bg: 'bg-rose-50/80 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800/50',
    text: 'text-rose-700 dark:text-rose-300',
    label: 'Noun'
  },
  verb: {
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    text: 'text-emerald-700 dark:text-emerald-300',
    label: 'Verb'
  },
  adjective: {
    bg: 'bg-sky-50/80 dark:bg-sky-950/30',
    border: 'border-sky-200 dark:border-sky-800/50',
    text: 'text-sky-700 dark:text-sky-300',
    label: 'Adjective'
  },
  adverb: {
    bg: 'bg-amber-50/80 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/50',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'Adverb'
  },
  other: {
    bg: 'bg-slate-100/80 dark:bg-slate-800/40',
    border: 'border-slate-200 dark:border-slate-700/50',
    text: 'text-slate-600 dark:text-slate-400',
    label: 'Other'
  }
};

export const POSLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap gap-4 items-center px-3 py-2 mb-2 bg-white/80 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-800 select-none">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        Legend:
      </span>
      {LEGEND_ITEMS.map((item) => (
        <span
          key={item.label}
          className={`text-xs font-semibold ${item.color} ${item.plain ? '' : 'underline underline-offset-4 decoration-2'}`}
        >
          {item.label}
        </span>
      ))}
      <span className="text-[10px] text-slate-400 ml-auto">
        Click any word for details
      </span>
    </div>
  );
};
