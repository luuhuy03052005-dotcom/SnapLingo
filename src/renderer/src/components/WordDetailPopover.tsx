import React, { useEffect, useRef, useCallback, useState } from 'react';
import { POSToken } from '../../../shared/vocabularyTypes';

interface WordDetailPopoverProps {
  token: POSToken;
  anchorRect: DOMRect;
  onClose: () => void;
}

// POS badge styles — uppercase small colored tags
const POS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  noun: { bg: 'bg-pos-noun-bg', text: 'text-pos-noun-text', label: 'NOUN' },
  verb: { bg: 'bg-pos-verb-bg', text: 'text-pos-verb-text', label: 'VERB' },
  adjective: { bg: 'bg-pos-adj-bg', text: 'text-pos-adj-text', label: 'ADJECTIVE' },
  adverb: { bg: 'bg-pos-adv-bg', text: 'text-pos-adv-text', label: 'ADVERB' },
  other: { bg: 'bg-pos-other-bg', text: 'text-pos-other-text', label: 'OTHER' }
};

/**
 * Word detail popover — positioned ABOVE the clicked word, white bg, with arrow.
 * Why: The mockup shows the popover appearing above the word chip with a small
 * downward-pointing arrow, white surface background, and clean shadow.
 * Includes Vietnamese translation via the existing translation API.
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

  // Fetch Vietnamese meaning
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
        if (!cancelled) setViMeaning('');
      } finally {
        if (!cancelled) setIsTranslating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token.text, token.category]);

  const badge = POS_BADGE[token.category] || POS_BADGE.other;

  // Position: ABOVE the anchor word, centered horizontally
  const popoverWidth = 220;
  const left = Math.max(8, Math.min(
    anchorRect.left + anchorRect.width / 2 - popoverWidth / 2,
    window.innerWidth - popoverWidth - 8
  ));
  const bottom = window.innerHeight - anchorRect.top + 8;

  return (
    <div
      ref={popoverRef}
      className="fixed z-[9999] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-fab overflow-visible"
      style={{
        width: `${popoverWidth}px`,
        left: `${left}px`,
        bottom: `${bottom}px`,
        animation: 'popoverFadeIn 0.2s ease-out'
      }}
    >
      {/* Arrow pointing down */}
      <div
        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-surface-container-lowest border-b border-r border-outline-variant rotate-45"
      />

      {/* Content */}
      <div className="relative z-10 p-4 flex flex-col gap-1">
        {/* Word + POS badge */}
        <div className="flex justify-between items-start">
          <span className="text-[14px] font-bold text-on-surface">{token.text}</span>
          <span className={`inline-flex items-center px-1 py-[2px] rounded-sm ${badge.bg} ${badge.text} text-[10px] font-bold uppercase tracking-wider`}>
            {badge.label}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-outline-variant/30 my-1" />

        {/* Vietnamese meaning */}
        {isTranslating ? (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-[12px] text-on-surface-variant">Đang dịch...</span>
          </div>
        ) : viMeaning ? (
          <p className="text-[12px] text-on-surface-variant">{viMeaning}</p>
        ) : (
          <p className="text-[12px] text-on-surface-variant italic">Definition will appear here</p>
        )}
      </div>
    </div>
  );
};
