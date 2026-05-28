import React, { useEffect, useRef, useCallback, useState } from 'react';
import { POSToken } from '../../../shared/vocabularyTypes';

interface WordDetailPopoverProps {
  token: POSToken;
  anchorRect: DOMRect;
  onClose: () => void;
}

// Category display labels with Vietnamese translation
const CATEGORY_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  noun: { label: 'Noun · Danh từ', emoji: '📗', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' },
  verb: { label: 'Verb · Động từ', emoji: '📕', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  adjective: { label: 'Adjective · Tính từ', emoji: '📘', color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800' },
  adverb: { label: 'Adverb · Trạng từ', emoji: '📙', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  other: { label: 'Other · Khác', emoji: '📄', color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700' }
};

/**
 * Smart click-to-open word detail popover with Vietnamese translation.
 * Why: Shows POS category, grammar tags, AND Vietnamese meaning by calling
 * the existing translation API for single-word lookup. Closes on ESC/click-outside.
 */
export const WordDetailPopover: React.FC<WordDetailPopoverProps> = ({ token, anchorRect, onClose }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [viMeaning, setViMeaning] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Close on click-outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  // Close on ESC
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown]);

  // Fetch Vietnamese meaning for the word via existing translation API
  useEffect(() => {
    if (!token.text || token.category === 'punctuation' || token.category === 'whitespace') return;
    if (!window.snaplingo) return;

    let cancelled = false;
    setIsTranslating(true);

    (async () => {
      try {
        const result = await window.snaplingo.translation.translate({
          text: token.text,
          targetLanguage: 'vi',
          sourceType: 'text'
        });
        if (!cancelled && result?.translatedText) {
          setViMeaning(result.translatedText);
        }
      } catch {
        // Silently fail — translation is optional enhancement
        if (!cancelled) setViMeaning('');
      } finally {
        if (!cancelled) setIsTranslating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token.text, token.category]);

  const info = CATEGORY_INFO[token.category] || CATEGORY_INFO.other;

  // Position: prefer below anchor, flip above if near viewport bottom
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - anchorRect.bottom;
  const showAbove = spaceBelow < 200;
  const top = showAbove ? anchorRect.top - 8 : anchorRect.bottom + 6;
  const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - 280));

  return (
    <div
      ref={popoverRef}
      className="fixed z-[9999] w-[260px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden"
      style={{
        top: showAbove ? undefined : `${top}px`,
        bottom: showAbove ? `${viewportHeight - top}px` : undefined,
        left: `${left}px`,
        animation: 'fadeInUp 0.15s ease-out'
      }}
    >
      {/* Header: word text */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {token.text}
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-base font-bold leading-none p-1"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5">
        {/* POS badge */}
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${info.color}`}>
          <span>{info.emoji}</span>
          <span>{info.label}</span>
        </div>

        {/* Tags */}
        {token.posDetails && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Tags: </span>
            {token.posDetails}
          </div>
        )}

        {/* Vietnamese meaning — fetched from translation API */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">🇻🇳 Nghĩa tiếng Việt</span>
          </div>
          {isTranslating ? (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
              <span className="text-xs text-slate-400">Đang dịch...</span>
            </div>
          ) : viMeaning ? (
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {viMeaning}
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic">Không tìm thấy nghĩa</p>
          )}
        </div>
      </div>
    </div>
  );
};
