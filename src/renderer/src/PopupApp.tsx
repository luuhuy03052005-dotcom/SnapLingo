import { useEffect, useState } from 'react';
import { TranslationResult, OCRTextPayload } from '../../shared/types';
import { POSToken } from '../../shared/vocabularyTypes';
import { IconTranslate, IconCopy, IconAnalyze } from './components/Icons';
import { WordTokenHighlighter } from './components/WordTokenHighlighter';
import { POSLegend } from './components/POSLegend';

/**
 * Utility to strip Electron IPC error wrappers and standard "Error:" prefixes
 * from error messages before presenting them to the user.
 */
function cleanIpcError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  let cleaned = msg.replace(/^Error:\s*/, '');
  cleaned = cleaned.replace(/^Error invoking remote method\s+'.*?':\s*/, '');
  if (cleaned.startsWith('Error: ')) {
    cleaned = cleaned.substring(7);
  }
  return cleaned;
}

/**
 * Floating Translation Popup — Fluent Design.
 * Why: Displays translated snippets at cursor position with Copy, Pin, Close, and detected language info.
 */
export default function PopupApp() {
  const [originalText, setOriginalText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [detectedLang, setDetectedLang] = useState<string>('');
  const [targetLang, setTargetLang] = useState<string>('');
  const [provider, setProvider] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(true);
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);

  // POS Analysis state — inline learning note
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeTokens, setAnalyzeTokens] = useState<POSToken[]>([]);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const textQuery = urlParams.get('text') || '';
    setOriginalText(decodeURIComponent(textQuery));

    // ESC closes popup
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.close();
      // Ctrl+C copies result when popup is focused
      if (e.ctrlKey && e.key === 'c' && translatedText) {
        handleCopy();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Detect code scan mode from the text prefix
  const isCodeScan = originalText.startsWith('__CODE_SCAN__:');
  const codeText = isCodeScan ? originalText.replace('__CODE_SCAN__:', '') : '';

  useEffect(() => {
    if (!originalText) return;

    // Code scan: no translation needed, just display the code
    if (isCodeScan) {
      setIsLoading(false);
      return;
    }

    if (originalText === '__OCR_EMPTY__') {
      setErrorMsg('No readable text found. Try selecting a clearer or larger area.');
      setIsLoading(false);
      return;
    }
    if (originalText.startsWith('__OCR_ERROR__:')) {
      setErrorMsg(cleanIpcError(originalText.replace('__OCR_ERROR__:', '')));
      setIsLoading(false);
      return;
    }

    async function performTranslation() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        if (!window.snaplingo) throw new Error('IPC Bridge disconnected');

        const tl = await window.snaplingo.settings.get('targetLanguage') || 'vi';
        const pm = await window.snaplingo.settings.get('privacyMode');
        setTargetLang(tl.toUpperCase());
        setPrivacyMode(pm === 'true');

        const result: TranslationResult = await window.snaplingo.translation.translate({
          text: originalText,
          targetLanguage: tl,
          sourceType: 'ocr'
        });

        setTranslatedText(result.translatedText);
        setDetectedLang((result.detectedLanguage || 'auto').toUpperCase());
        setProvider(result.provider || '');
      } catch (error: unknown) {
        setErrorMsg(cleanIpcError(error));
      } finally {
        setIsLoading(false);
      }
    }
    performTranslation();
  }, [originalText]);

  const handleCopy = async () => {
    const textToCopy = isCodeScan ? codeText : translatedText;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) { console.error('Copy failed:', err); }
  };

  const handleOpenFull = () => {
    // Show main window with the original text
    window.snaplingo?.window.setMode('expanded');
    window.close();
  };

  /**
   * Send OCR text to main translator panel.
   * Why: User wants to review/edit OCR text before translating, or translate immediately.
   */
  const sendToMain = async (autoTranslate: boolean) => {
    if (!originalText || !window.snaplingo) return;
    const payload: OCRTextPayload = {
      text: isCodeScan ? codeText : originalText,
      source: 'screen-snip',
      mode: isCodeScan ? 'code' : 'document',
      createdAt: new Date().toISOString()
    };
    try {
      // Send typed payload, then encode autoTranslate flag in the payload text
      // The main window will handle auto-translate based on a separate signal
      if (autoTranslate) {
        (payload as any).autoTranslate = true;
      }
      await window.snaplingo.ocr.sendTextToMain(payload);
      // Bring main window to focus and close popup
      window.close();
    } catch (err) {
      console.error('Failed to send text to main:', err);
    }
  };

  /**
   * Run POS analysis on the original English text.
   * Why: Users learning English want to see word categories right in the popup
   * without opening the main app — like a pocket grammar note.
   */
  const handleAnalyze = async () => {
    if (!originalText || !window.snaplingo) return;
    const textToAnalyze = isCodeScan ? '' : originalText;
    if (!textToAnalyze.trim()) return;

    setShowAnalysis(true);
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeTokens([]);

    try {
      const tokens = await window.snaplingo.vocabulary.analyze(textToAnalyze);
      setAnalyzeTokens(tokens);
    } catch (e: unknown) {
      setAnalyzeError(cleanIpcError(e));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Code scan lines with line numbers for professional display
  const codeLines = codeText.split('\n');

  return (
    <div className={`flex h-screen flex-col select-none overflow-hidden font-sans ${isCodeScan ? 'bg-gray-900 text-gray-100' : 'bg-surface rounded-xl shadow-float border border-outline-variant/30'}`}>
      {/* ─── Header: Draggable ─── */}
      <div
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        className={`flex items-center justify-between px-4 py-2 border-b cursor-move select-none shrink-0
          ${isCodeScan ? 'bg-gray-900 border-gray-700' : 'bg-surface-container-low border-outline-variant/20'}`}
      >
        <div className="flex items-center gap-2">
          <IconTranslate className="w-[18px] h-[18px] text-primary" />
          <span className="text-[12px] font-bold text-on-surface">SnapLingo</span>
        </div>
        <div
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex items-center gap-1"
        >
          <button
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? 'Pinned on top' : 'Click to Pin'}
            className={`p-[2px] rounded transition-colors
              ${isPinned
                ? 'text-primary hover:bg-surface-variant'
                : isCodeScan ? 'text-gray-500 hover:text-gray-300' : 'text-on-surface-variant hover:text-primary hover:bg-surface-variant'
              }`}
          >
            <svg className="w-4 h-4" fill={isPinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M16 4h2a2 2 0 012 2v2M8 4H6a2 2 0 00-2 2v2m0 4v6a2 2 0 002 2h12a2 2 0 002-2v-6M4 12h16" />
            </svg>
          </button>
          <button
            className={`p-[2px] rounded transition-colors ${isCodeScan ? 'text-gray-500 hover:text-gray-300' : 'text-on-surface-variant hover:bg-surface-variant'}`}
            title="Collapse"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M20 12H4" /></svg>
          </button>
          <button
            onClick={() => window.close()}
            className={`p-[2px] rounded transition-colors ${isCodeScan ? 'text-gray-500 hover:text-red-400' : 'text-on-surface-variant hover:bg-error-container hover:text-error'}`}
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {isCodeScan ? (
        /* ─── CODE SCAN DISPLAY ─── */
        <div className="flex-1 overflow-auto rounded-lg bg-gray-950 border border-gray-800 font-mono text-[11px] leading-relaxed select-text m-3">
          <table className="w-full border-collapse">
            <tbody>
              {codeLines.map((line, i) => (
                <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                  <td className="text-right pr-3 pl-2 py-0 text-gray-600 select-none border-r border-gray-800 w-[1%] whitespace-nowrap">{i + 1}</td>
                  <td className="pl-3 pr-2 py-0 whitespace-pre text-emerald-300">{line || '\u00A0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ─── DOCUMENT TRANSLATION DISPLAY ─── */
        <div className="flex flex-col p-4 gap-2 bg-surface flex-1">
          {/* Source text */}
          <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/10">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[12px] text-outline">English</span>
            </div>
            <p className="text-[14px] text-on-surface-variant line-clamp-2 select-text">
              {originalText || 'No text detected...'}
            </p>
          </div>
          {/* Translation result — teal accent */}
          <div className="bg-secondary-container/10 p-2 rounded border border-secondary/20 flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[12px] text-secondary">Vietnamese</span>
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
                <span className="text-[12px] text-on-surface-variant">Translating...</span>
              </div>
            ) : errorMsg ? (
              <p className="text-error text-[14px]">{errorMsg}</p>
            ) : (
              <p className="text-[16px] text-on-surface font-semibold leading-relaxed select-text">
                {translatedText || <span className="text-on-surface-variant italic font-normal">Translation empty...</span>}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── POS Analysis Panel — Learning Note ─── */}
      {showAnalysis && !isCodeScan && (
        <div className="border-t border-outline-variant/20 bg-surface-container-lowest">
          {/* Mini header */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-surface-container-low/50">
            <span className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
              <IconAnalyze className="w-3.5 h-3.5" /> Vocabulary Analysis
            </span>
            <button
              onClick={() => setShowAnalysis(false)}
              className="text-[11px] text-on-surface-variant hover:text-on-surface px-1"
            >✕</button>
          </div>
          {/* Analysis content */}
          <div className="px-3 py-2 max-h-[200px] overflow-y-auto">
            {isAnalyzing ? (
              <div className="flex items-center gap-2 py-2">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-[11px] text-on-surface-variant">Analyzing...</span>
              </div>
            ) : analyzeError ? (
              <p className="text-error text-[11px]">{analyzeError}</p>
            ) : analyzeTokens.length > 0 ? (
              <WordTokenHighlighter tokens={analyzeTokens} compact />
            ) : null}
          </div>
          {/* Mini legend */}
          {analyzeTokens.length > 0 && !isAnalyzing && (
            <div className="px-3 pb-1.5 flex items-center gap-3 text-[10px] text-on-surface-variant">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pos-noun-bg border border-pos-noun-text/20" />Noun</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pos-verb-bg border border-pos-verb-text/20" />Verb</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pos-adj-bg border border-pos-adj-text/20" />Adj</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pos-adv-bg border border-pos-adv-text/20" />Adv</span>
            </div>
          )}
        </div>
      )}

      {/* ─── Footer Actions ─── */}
      <div className={`flex items-center justify-between px-4 py-2 border-t shrink-0
        ${isCodeScan ? 'bg-gray-900 border-gray-700' : 'bg-surface-container-lowest border-outline-variant/20'}`}>
        <div className="flex items-center gap-2">
          {copied && <span className="text-[10px] text-secondary font-bold animate-pulse">Copied!</span>}
          <button
            disabled={isLoading || !!errorMsg || (!translatedText && !codeText)}
            onClick={handleCopy}
            className="flex items-center gap-1 text-on-surface-variant hover:text-secondary transition-colors px-2 py-1 rounded hover:bg-surface-variant/50 disabled:opacity-30"
          >
            <IconCopy className="w-[18px] h-[18px]" />
            <span className="text-[12px] font-bold">Copy</span>
          </button>
          {!isCodeScan && !isLoading && !errorMsg && originalText && (
            <button
              onClick={handleAnalyze}
              className={`flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-surface-variant/50
                ${showAnalysis ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
            >
              <IconAnalyze className="w-[18px] h-[18px]" />
              <span className="text-[12px] font-bold">Analyze</span>
            </button>
          )}
        </div>
        {/* Open in Main App button */}
        <button
          onClick={handleOpenFull}
          className="flex items-center justify-center p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
          title="Open in Main App"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
