import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SelectionTranslatorProps {
  /** The container element ref to monitor for text selection */
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Inline selection translator tooltip.
 * Why: When user highlights/selects text in the POS analysis panel,
 * this component detects the selection, translates it to Vietnamese via
 * the existing translation API, and shows a floating tooltip right next
 * to the selection. Disappears when selection is cleared.
 *
 * Data flow: mouseup → getSelection() → trim → debounce →
 *   window.snaplingo.translation.translate() → show tooltip near selection rect.
 */
export const SelectionTranslator: React.FC<SelectionTranslatorProps> = ({ containerRef }) => {
  const [selectedText, setSelectedText] = useState('');
  const [translation, setTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track current translation request to cancel stale ones
  const requestId = useRef(0);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      // No selection or selection cleared → hide tooltip
      setSelectedText('');
      setTranslation('');
      setTooltipPos(null);
      return;
    }

    // Ensure selection is within our container
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const text = selection.toString().trim();
    // Ignore very short selections (single char or less)
    if (text.length < 2 || text.length > 500) {
      setSelectedText('');
      setTranslation('');
      setTooltipPos(null);
      return;
    }

    // Get position for tooltip — place it below the selection
    const rect = range.getBoundingClientRect();
    setTooltipPos({
      x: Math.max(8, rect.left + rect.width / 2),
      y: rect.bottom + 8
    });
    setSelectedText(text);
  }, [containerRef]);

  // Translate when selectedText changes (debounced)
  useEffect(() => {
    if (!selectedText) return;

    // Debounce: wait 300ms after user stops selecting
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      if (!window.snaplingo) return;

      const currentId = ++requestId.current;
      setIsTranslating(true);
      setTranslation('');

      try {
        const result = await window.snaplingo.translation.translate({
          text: selectedText,
          targetLanguage: 'vi',
          sourceType: 'text'
        });
        // Only update if this is still the latest request
        if (currentId === requestId.current && result?.translatedText) {
          setTranslation(result.translatedText);
        }
      } catch {
        // Silent fail — translation is optional
        if (currentId === requestId.current) {
          setTranslation('');
        }
      } finally {
        if (currentId === requestId.current) {
          setIsTranslating(false);
        }
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [selectedText]);

  // Listen for mouseup and selectionchange events
  useEffect(() => {
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Nothing to show
  if (!tooltipPos || (!isTranslating && !translation && !selectedText)) return null;

  // Clamp position to viewport
  const tooltipX = Math.min(tooltipPos.x, window.innerWidth - 200);
  const tooltipY = Math.min(tooltipPos.y, window.innerHeight - 80);

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[9998] max-w-[300px] bg-slate-900 text-white rounded-lg shadow-2xl px-3 py-2 pointer-events-none select-none"
      style={{
        left: `${tooltipX}px`,
        top: `${tooltipY}px`,
        transform: 'translateX(-50%)',
        animation: 'fadeInUp 0.12s ease-out'
      }}
    >
      {/* Small arrow pointing up */}
      <div
        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45"
      />

      {isTranslating ? (
        <div className="flex items-center gap-2 text-xs">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent flex-shrink-0" />
          <span className="text-slate-300">Đang dịch...</span>
        </div>
      ) : translation ? (
        <div className="space-y-1">
          <p className="text-xs font-medium leading-relaxed">{translation}</p>
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            🇻🇳 Vietnamese
          </p>
        </div>
      ) : (
        <span className="text-xs text-slate-400 italic">Chọn văn bản để dịch</span>
      )}
    </div>
  );
};
