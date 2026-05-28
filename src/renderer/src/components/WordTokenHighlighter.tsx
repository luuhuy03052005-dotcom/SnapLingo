import React, { useState, useRef, useCallback } from 'react';
import { POSToken } from '../../../shared/vocabularyTypes';
import { WordDetailPopover } from './WordDetailPopover';
import { SelectionTranslator } from './SelectionTranslator';

interface WordTokenHighlighterProps {
  tokens: POSToken[];
}

/**
 * Clean, readable POS text highlighter using colored underlines instead of chips.
 * Why: Dense colored chips make text unreadable. Colored underlines + subtle text tinting
 * preserve natural reading flow while still conveying POS information at a glance.
 *
 * Features:
 * - Click any word → detail popover with Vietnamese meaning
 * - Select/highlight text → floating translation tooltip appears instantly
 */

// Underline color classes — only applied to meaningful POS categories
const UNDERLINE_STYLES: Record<string, { text: string; decoration: string }> = {
  noun: {
    text: 'text-rose-700 dark:text-rose-400',
    decoration: 'decoration-rose-400 dark:decoration-rose-500'
  },
  verb: {
    text: 'text-emerald-700 dark:text-emerald-400',
    decoration: 'decoration-emerald-400 dark:decoration-emerald-500'
  },
  adjective: {
    text: 'text-sky-700 dark:text-sky-400',
    decoration: 'decoration-sky-400 dark:decoration-sky-500'
  },
  adverb: {
    text: 'text-amber-700 dark:text-amber-400',
    decoration: 'decoration-amber-400 dark:decoration-amber-500'
  }
};

export const WordTokenHighlighter: React.FC<WordTokenHighlighterProps> = ({ tokens }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWordClick = useCallback((index: number) => {
    // Don't open popover if user is selecting text (has a non-collapsed selection)
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim().length > 1) {
      return;
    }

    const el = wordRefs.current.get(index);
    if (!el) return;
    if (activeIndex === index) {
      setActiveIndex(null);
      setAnchorRect(null);
    } else {
      setActiveIndex(index);
      setAnchorRect(el.getBoundingClientRect());
    }
  }, [activeIndex]);

  const handleClosePopover = useCallback(() => {
    setActiveIndex(null);
    setAnchorRect(null);
  }, []);

  if (!tokens || tokens.length === 0) {
    return (
      <div className="text-slate-400 italic text-sm py-4">
        No words analyzed. Please enter English text.
      </div>
    );
  }

  return (
    <div className="relative select-text text-[15px] leading-[2.2]" ref={containerRef}>
      <div className="flex flex-wrap items-baseline">
        {tokens.map((token, index) => {
          // 1. Whitespace — exact spacing
          if (token.category === 'whitespace') {
            return <span key={index} className="whitespace-pre-wrap">{token.text}</span>;
          }

          // 2. Punctuation — plain dark text
          if (token.category === 'punctuation') {
            return <span key={index} className="text-slate-700 dark:text-slate-300">{token.text}</span>;
          }

          // 3. "Other" words (the, a, is, of, to...) — completely plain, no decoration
          if (token.category === 'other') {
            return (
              <span
                key={index}
                ref={(el) => { if (el) wordRefs.current.set(index, el); }}
                onClick={() => handleWordClick(index)}
                className={`cursor-pointer text-slate-600 dark:text-slate-400 transition-colors duration-150 hover:text-slate-900 dark:hover:text-slate-100 ${activeIndex === index ? 'bg-slate-200/60 dark:bg-slate-700/40 rounded' : ''}`}
              >
                {token.text}
              </span>
            );
          }

          // 4. Main POS: Noun/Verb/Adjective/Adverb — colored text + colored underline
          const style = UNDERLINE_STYLES[token.category];
          const isActive = activeIndex === index;

          return (
            <span
              key={index}
              ref={(el) => { if (el) wordRefs.current.set(index, el); }}
              onClick={() => handleWordClick(index)}
              className={`cursor-pointer font-semibold underline underline-offset-4 decoration-2 transition-all duration-150 ${style?.text || 'text-slate-700'} ${style?.decoration || 'decoration-slate-300'} ${isActive ? 'bg-slate-100 dark:bg-slate-800 rounded px-0.5 decoration-[3px]' : 'hover:decoration-[3px]'}`}
            >
              {token.text}
            </span>
          );
        })}
      </div>

      {/* Smart popover — click a word to see details + Vietnamese meaning */}
      {activeIndex !== null && anchorRect && tokens[activeIndex] && (
        <WordDetailPopover
          token={tokens[activeIndex]}
          anchorRect={anchorRect}
          onClose={handleClosePopover}
        />
      )}

      {/* Selection translator — highlight text to see instant translation */}
      <SelectionTranslator containerRef={containerRef as React.RefObject<HTMLDivElement>} />
    </div>
  );
};
