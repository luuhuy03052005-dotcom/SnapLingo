import React from 'react';
import { IconCopy } from './Icons';

/**
 * POS Legend with colored dots — matches DESIGN.md POS Analysis panel header.
 * Why: Compact colored dot indicators are less noisy than full chip blocks
 * while still conveying the color-to-category mapping at a glance.
 */

const LEGEND_ITEMS = [
  { label: 'Noun', bg: 'bg-pos-noun-bg', border: 'border-pos-noun-text/20' },
  { label: 'Verb', bg: 'bg-pos-verb-bg', border: 'border-pos-verb-text/20' },
  { label: 'Adjective', bg: 'bg-pos-adj-bg', border: 'border-pos-adj-text/20' },
  { label: 'Adverb', bg: 'bg-pos-adv-bg', border: 'border-pos-adv-text/20' },
];

// Keep POS_COLORS export for backward compatibility
export const POS_COLORS = {
  noun: { bg: 'bg-pos-noun-bg', text: 'text-pos-noun-text', border: 'border-pos-noun-text/10', label: 'Noun' },
  verb: { bg: 'bg-pos-verb-bg', text: 'text-pos-verb-text', border: 'border-pos-verb-text/10', label: 'Verb' },
  adjective: { bg: 'bg-pos-adj-bg', text: 'text-pos-adj-text', border: 'border-pos-adj-text/10', label: 'Adjective' },
  adverb: { bg: 'bg-pos-adv-bg', text: 'text-pos-adv-text', border: 'border-pos-adv-text/10', label: 'Adverb' },
  other: { bg: 'bg-pos-other-bg', text: 'text-pos-other-text', border: 'border-pos-other-text/10', label: 'Other' }
};

interface POSLegendProps {
  onCopyAnalysis?: () => void;
}

export const POSLegend: React.FC<POSLegendProps> = ({ onCopyAnalysis }) => {
  return (
    <div className="px-4 py-2 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between rounded-t-xl">
      <h3 className="text-[14px] font-semibold text-on-surface">Part of Speech Analysis</h3>
      <div className="flex items-center gap-3 flex-wrap">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded-full ${item.bg} border ${item.border}`} />
            <span className="text-[12px] text-on-surface-variant">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
