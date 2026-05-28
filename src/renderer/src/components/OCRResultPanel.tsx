import React, { useState } from 'react';
import { IconScreenSnip, IconAddToTranslator, IconTranslateNow, IconAnalyze, IconCopy, IconClear } from './Icons';

interface OCRResultPanelProps {
  text: string;
  isVisible: boolean;
  onTextChange: (value: string) => void;
  onAddToTranslator: () => void;
  onTranslateNow: () => void;
  onAnalyze: () => void;
  onCopy: () => void;
  onClear: () => void;
}

/**
 * Persistent OCR Result Panel in Main App.
 * Why: OCR text must not live only inside the ephemeral floating popup.
 * This panel stores recognized text, allows editing, and provides
 * actions to push text into the translator or analyze POS.
 */
export const OCRResultPanel: React.FC<OCRResultPanelProps> = ({
  text,
  isVisible,
  onTextChange,
  onAddToTranslator,
  onTranslateNow,
  onAnalyze,
  onCopy,
  onClear
}) => {
  const [copied, setCopied] = useState(false);

  if (!isVisible || !text) return null;

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 space-y-3 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconScreenSnip className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <span className="text-sm font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
            Screen Snip Result
          </span>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 text-xs font-semibold transition"
        >
          <IconClear className="w-3.5 h-3.5" /> Clear
        </button>
      </div>

      {/* Editable textarea — user can correct OCR errors before translating */}
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        className="w-full min-h-[80px] max-h-[150px] p-3 text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/40 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-700 select-text leading-relaxed"
        placeholder="OCR recognized text..."
      />

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onAddToTranslator}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          title="Insert this text into the translator input (won't auto-translate)"
        >
          <IconAddToTranslator className="w-3.5 h-3.5" /> Add to Translator
        </button>
        <button
          onClick={onTranslateNow}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition shadow-sm"
          title="Insert and translate immediately"
        >
          <IconTranslateNow className="w-3.5 h-3.5" /> Translate Now
        </button>
        <button
          onClick={onAnalyze}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 transition"
          title="Analyze English Parts of Speech"
        >
          <IconAnalyze className="w-3.5 h-3.5" /> Analyze
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
        >
          {copied ? <><span>✓</span> Copied</> : <><IconCopy className="w-3.5 h-3.5" /> Copy</>}
        </button>
      </div>
    </div>
  );
};
