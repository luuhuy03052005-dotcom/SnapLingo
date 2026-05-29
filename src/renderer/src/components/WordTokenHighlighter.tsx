import React, { useState, useRef, useCallback } from 'react';
import { POSToken } from '../../../shared/vocabularyTypes';
import { WordDetailPopover } from './WordDetailPopover';
import { SelectionTranslator } from './SelectionTranslator';

interface WordTokenHighlighterProps {
  tokens: POSToken[];
  /** Compact mode for popup — tighter spacing, no selection translator */
  compact?: boolean;
}

/**
 * POS Token Highlighter — inline-flow sentence with pastel-bg colored words.
 * Why: Words flow naturally like a sentence while content words (noun/verb/adj/adv)
 * get distinct pastel background chips. Function words (the, a, is) stay plain
 * to reduce visual noise while still being clickable for definitions.
 *
 * Click any word → detail popover with Vietnamese meaning appears above.
 * Select text → inline translation tooltip appears below selection.
 */

// Inline styles per POS category — bg always visible for content words
const POS_INLINE: Record<string, { bg: string; text: string; activeBg: string }> = {
  noun:      { bg: 'bg-pos-noun-bg/70',  text: 'text-pos-noun-text',  activeBg: 'bg-pos-noun-bg' },
  verb:      { bg: 'bg-pos-verb-bg/70',  text: 'text-pos-verb-text',  activeBg: 'bg-pos-verb-bg' },
  adjective: { bg: 'bg-pos-adj-bg/70',   text: 'text-pos-adj-text',   activeBg: 'bg-pos-adj-bg' },
  adverb:    { bg: 'bg-pos-adv-bg/70',   text: 'text-pos-adv-text',   activeBg: 'bg-pos-adv-bg' },
};

export const WordTokenHighlighter: React.FC<WordTokenHighlighterProps> = ({ tokens, compact = false }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWordClick = useCallback((index: number) => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim().length > 1) return;

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
      <div className="text-on-surface-variant italic text-sm py-4">
        No words analyzed. Please enter English text.
      </div>
    );
  }

  const fontSize = compact ? 'text-[13px]' : 'text-[15px]';
  const lineHeight = compact ? 'leading-[2]' : 'leading-[2.4]';

  return (
    <div className="relative select-text" ref={containerRef}>
      {/*
       * Inline-flow layout with pastel-bg chips for content words.
       * Words sit naturally like a sentence — no flex gaps breaking flow.
       * Content words get colored bg; function words stay plain text.
       */}
      <div className={`${lineHeight} ${fontSize}`}>
        {tokens.map((token, index) => {
          // 1. Whitespace
          if (token.category === 'whitespace') {
            return <span key={index}>{' '}</span>;
          }

          // 2. Punctuation — hugs previous word
          if (token.category === 'punctuation') {
            return <span key={index} className={`${fontSize} text-on-surface`}>{token.text} </span>;
          }

          const isActive = activeIndex === index;
          const posStyle = POS_INLINE[token.category];

          // 3. Function words (other: the, a, is, in, at, and, etc.)
          //    Plain text, no bg — keeps visual hierarchy clean
          if (!posStyle) {
            return (
              <span
                key={index}
                ref={(el) => { if (el) wordRefs.current.set(index, el); }}
                onClick={() => handleWordClick(index)}
                className={`inline cursor-pointer transition-colors
                  ${isActive
                    ? 'text-on-surface font-semibold bg-surface-container-high rounded px-0.5'
                    : 'text-on-surface/70 hover:text-on-surface'
                  }`}
              >{token.text} </span>
            );
          }

          // 4. Content words (noun/verb/adj/adv) — always show pastel bg chip
          return (
            <span
              key={index}
              ref={(el) => { if (el) wordRefs.current.set(index, el); }}
              onClick={() => handleWordClick(index)}
              className={`inline-block cursor-pointer rounded px-1 py-[1px] mx-[1px] transition-all
                ${posStyle.text}
                ${isActive
                  ? `${posStyle.activeBg} font-semibold ring-2 ring-offset-1 shadow-sm relative z-10`
                  : `${posStyle.bg} hover:shadow-sm`
                }`}
              style={isActive ? { ringColor: 'inherit' } : undefined}
            >{token.text} </span>
          );
        })}
      </div>

      {/* Popover — positioned ABOVE the active word */}
      {activeIndex !== null && anchorRect && tokens[activeIndex] && (
        <WordDetailPopover
          token={tokens[activeIndex]}
          anchorRect={anchorRect}
          onClose={handleClosePopover}
        />
      )}

      {/* Selection translator — only in full mode */}
      {!compact && (
        <SelectionTranslator containerRef={containerRef as React.RefObject<HTMLDivElement>} />
      )}
    </div>
  );
};
