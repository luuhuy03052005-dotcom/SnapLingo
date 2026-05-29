import React, { useState } from 'react';
import { IconScreenSnip, IconAddToTranslator, IconTranslateNow, IconAnalyze, IconCopy } from './Icons';

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
 * OCR Recognized Text Panel — Teal/secondary theme, right column.
 * Why: The mockup shows this as a distinct panel with secondary (teal)
 * accent to visually separate OCR results from the translation workspace.
 * Editable textarea allows user to correct OCR errors before translating.
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
    <div className="bg-surface-container-lowest rounded-xl border border-secondary/30 shadow-rest flex flex-col h-full">
      {/* Header — teal tinted */}
      <div className="px-4 py-2 border-b border-outline-variant/20 bg-secondary-container/10 flex justify-between items-center shrink-0 rounded-t-xl">
        <h2 className="text-[14px] font-semibold text-on-surface flex items-center gap-1.5">
          <IconScreenSnip className="w-[18px] h-[18px] text-secondary" />
          Recognized Text
        </h2>
        <span className="text-[12px] text-secondary">Snipping Tool</span>
      </div>

      {/* Editable textarea */}
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        className="flex-1 w-full p-4 bg-transparent border-none resize-none focus:ring-0 text-[16px] text-on-surface leading-relaxed"
        spellCheck={false}
        placeholder="OCR recognized text..."
      />

      {/* Action buttons footer */}
      <div className="px-4 py-2 bg-surface/50 border-t border-outline-variant/20 flex flex-wrap gap-2 justify-end shrink-0">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-highest text-on-surface hover:bg-surface-variant transition-colors text-[12px] font-bold"
        >
          <IconCopy className="w-4 h-4" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={onAnalyze}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-highest text-on-surface hover:bg-surface-variant transition-colors text-[12px] font-bold"
        >
          <IconAnalyze className="w-4 h-4" />
          Analyze
        </button>
        <button
          onClick={onAddToTranslator}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-highest text-on-surface hover:bg-surface-variant transition-colors text-[12px] font-bold"
        >
          <IconAddToTranslator className="w-4 h-4" />
          Add to Translator
        </button>
        <button
          onClick={onTranslateNow}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-secondary text-white hover:bg-secondary/90 transition-colors text-[12px] font-bold"
        >
          Translate Now
        </button>
      </div>
    </div>
  );
};
