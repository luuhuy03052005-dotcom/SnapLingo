import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Fullscreen transparent overlay for screen region selection.
 *
 * Why: Renders a dark semi-transparent layer over the primary display.
 * The user clicks and drags to define a crop rectangle. On mouse release,
 * the CSS-pixel coordinates are sent to Main process via preload IPC.
 * Renderer never accesses desktopCapturer, fs, or OCR directly.
 *
 * ESC instantly closes the overlay without triggering any capture.
 */
export default function OverlayApp() {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Calculate selection rectangle from start and current positions
  const getSelectionRect = useCallback(() => {
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    return { x, y, width, height };
  }, [startPos, currentPos]);

  // ESC key handler: cancel overlay immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (window.snaplingo) {
          window.snaplingo.ocr.cancelScreenSelection();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
    setIsDrawing(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    setCurrentPos({ x: e.clientX, y: e.clientY });
  }, [isDrawing]);

  const handleMouseUp = useCallback(async () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const rect = getSelectionRect();

    // Ignore selections too small (likely accidental clicks)
    if (rect.width < 10 || rect.height < 10) {
      return;
    }

    // Send CSS-pixel coordinates to Main process. Main will apply DPI scaling.
    if (window.snaplingo) {
      await window.snaplingo.ocr.submitSelection(rect);
    }
  }, [isDrawing, getSelectionRect]);

  const selectionRect = getSelectionRect();

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 select-none"
      style={{ cursor: isDrawing ? 'crosshair' : 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Dark semi-transparent background */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Instruction hint (top center, fades when drawing) */}
      <div className={`absolute top-8 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-200 ${isDrawing ? 'opacity-0' : 'opacity-100'}`}>
        <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-5 py-2.5 text-center shadow-xl">
          <p className="text-slate-200 text-sm font-semibold">
            Click and drag to select a region for OCR
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600 font-mono text-[10px]">ESC</kbd> to cancel
          </p>
        </div>
      </div>

      {/* Selection rectangle — clear cut-out with border */}
      {isDrawing && selectionRect.width > 0 && selectionRect.height > 0 && (
        <>
          {/* Clear area (the selected region) */}
          <div
            className="absolute border-2 border-brand-400 bg-transparent z-20"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)'
            }}
          />
          {/* Dimension label */}
          <div
            className="absolute z-30 text-[10px] text-white bg-slate-900/80 px-1.5 py-0.5 rounded font-mono"
            style={{
              left: selectionRect.x,
              top: selectionRect.y + selectionRect.height + 4
            }}
          >
            {selectionRect.width} × {selectionRect.height}
          </div>
        </>
      )}
    </div>
  );
}
