import { useEffect, useState } from 'react';
import { TranslationResult } from '../../shared/types';
import logoImg from './Logo.png';

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

  useEffect(() => {
    if (!originalText) return;

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
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) { console.error('Copy failed:', err); }
  };

  const handleOpenFull = () => {
    // Show main window with the original text
    window.snaplingo?.window.setMode('expanded');
    window.close();
  };

  return (
    <div className="flex h-screen flex-col bg-white/95 border border-gray-200 rounded-xl shadow-2xl p-3 text-gray-900 select-none overflow-hidden font-sans backdrop-blur-sm">
      {/* Title Bar - Draggable Region */}
      <div 
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        className="flex items-center justify-between pb-1.5 mb-2 border-b border-gray-100 cursor-move select-none"
      >
        <div className="flex items-center gap-1.5">
          <img src={logoImg} alt="Logo" className="w-3.5 h-3.5 object-contain" />
          <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">SnapLingo</span>
          {detectedLang && !isLoading && (
            <span className="text-[10px] text-blue-500 font-semibold ml-1">{detectedLang} → {targetLang}</span>
          )}
        </div>
        <div 
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex items-center gap-1"
        >
          {privacyMode && <span className="text-[9px] text-teal-500 font-medium">🛡️</span>}
          <button
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? 'Pinned on top' : 'Click to Pin'}
            className={`text-[10px] px-1.5 py-0.5 rounded transition ${isPinned ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-gray-600'}`}
          >📌</button>
          <button onClick={() => window.close()} className="text-xs text-gray-400 hover:text-red-500 px-1 rounded transition">✕</button>
        </div>
      </div>

      {/* Source text preview */}
      <div className="max-h-[50px] overflow-y-auto bg-gray-50 border border-gray-100 rounded-lg p-1.5 text-[11px] text-gray-500 italic break-words select-text mb-2">
        {originalText || 'No text detected...'}
      </div>

      {/* Translation result */}
      <div className="flex-1 overflow-y-auto bg-blue-50/50 border border-blue-100 rounded-lg p-2 flex flex-col justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span className="text-[10px] text-gray-400">Translating...</span>
          </div>
        ) : errorMsg ? (
          <div className="text-red-500 text-[11px] text-center p-1 font-medium break-words">⚠️ {errorMsg}</div>
        ) : (
          <div className="text-gray-900 text-xs font-medium leading-relaxed break-words select-text h-full overflow-y-auto">
            {translatedText || <span className="text-gray-400 italic">Translation empty...</span>}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-400">
            <kbd className="bg-gray-100 px-1 rounded border border-gray-200 font-mono text-[8px]">ESC</kbd> close
          </span>
          {provider && <span className="text-[8px] text-gray-300">via {provider}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {copied && <span className="text-[10px] text-emerald-500 font-semibold animate-pulse">Copied!</span>}
          <button onClick={handleOpenFull}
            className="text-gray-400 hover:text-blue-500 text-[10px] px-2 py-0.5 rounded transition border border-gray-200 hover:border-blue-200"
          >Open Full</button>
          <button disabled={isLoading || !!errorMsg || !translatedText} onClick={handleCopy}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-30 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition"
          >📋 Copy</button>
        </div>
      </div>
    </div>
  );
}
