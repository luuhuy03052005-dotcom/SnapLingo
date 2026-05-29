import { useEffect, useState, useCallback, useRef } from 'react';
import { AppSettings, DbStatus, UpdateStatus, HistoryRecord, TranslationResult, ImageOCRResult, OCRTextPayload } from '../../shared/types';
import { SETTINGS_KEYS } from '../../shared/constants';
import Sidebar from './Sidebar';
import { POSLegend } from './components/POSLegend';
import { WordTokenHighlighter } from './components/WordTokenHighlighter';
import { OCRResultPanel } from './components/OCRResultPanel';
import { IconTranslate, IconScreenSnip, IconScan, IconHistory, IconSettings, IconPrivacy, IconAnalyze, IconCopy } from './components/Icons';
import { POSToken } from '../../shared/vocabularyTypes';

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

export default function App() {
  const [version, setVersion] = useState('...');
  const [dbStatus, setDbStatus] = useState<DbStatus>({ connected: false, path: '' });
  const [windowMode, setWindowMode] = useState<'compact' | 'expanded'>('expanded');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: 'idle', message: 'Ready.' });
  const [settings, setSettings] = useState<AppSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('translator');
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [translatedResult, setTranslatedResult] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [imageResult, setImageResult] = useState<ImageOCRResult | null>(null);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [copiedOcr, setCopiedOcr] = useState(false);
  const [copiedTranslation, setCopiedTranslation] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [glossaryItems, setGlossaryItems] = useState<Array<{ id: number; sourceTerm: string; targetTerm: string; createdAt: string }>>([]);
  const [newGlossarySource, setNewGlossarySource] = useState('');
  const [newGlossaryTarget, setNewGlossaryTarget] = useState('');
  const [cacheStats, setCacheStats] = useState<{ count: number }>({ count: 0 });

  // POS Highlighter State Variables
  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeTokens, setAnalyzeTokens] = useState<POSToken[]>([]);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Screen Snip OCR Result — persisted in Main App, not just popup
  const [ocrSnipText, setOcrSnipText] = useState<string>('');
  const [ocrSnipVisible, setOcrSnipVisible] = useState(false);

  // Listen for OCR text forwarded from floating popup via IPC
  useEffect(() => {
    if (!window.snaplingo) return;
    const cleanup = window.snaplingo.ocr.onTextReceived((payload: OCRTextPayload) => {
      if (!payload?.text) return;
      setOcrSnipText(payload.text);
      setOcrSnipVisible(true);
      setActiveTab('translator');

      // If autoTranslate flag is set, push text to source and translate
      if ((payload as any).autoTranslate) {
        setSourceText(payload.text);
        // Delay to allow state to settle, then trigger translate
        setTimeout(() => {
          handleTranslateRef.current();
        }, 100);
      }
    });
    return cleanup;
  }, []);

  useEffect(() => {
    (async () => {
      if (!window.snaplingo) { setIsLoading(false); return; }
      try {
        const [v, db, mode, all] = await Promise.all([
          window.snaplingo.app.getVersion(), window.snaplingo.database.getStatus(),
          window.snaplingo.window.getMode(), window.snaplingo.settings.getAll()
        ]);
        setVersion(v); setDbStatus(db); setWindowMode(mode); setSettings(all);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    })();
  }, []);

  const loadHistory = async () => {
    if (!window.snaplingo) return;
    try {
      const r = searchQuery.trim() ? await window.snaplingo.history.search(searchQuery) : await window.snaplingo.history.getRecent(50);
      setHistoryItems(r);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { if (activeTab === 'history') loadHistory(); }, [activeTab, searchQuery]);

  const loadGlossary = async () => {
    if (!window.snaplingo) return;
    try { setGlossaryItems(await window.snaplingo.glossary.getAll()); } catch (e) { console.error(e); }
  };
  const loadCacheStats = async () => {
    if (!window.snaplingo) return;
    try { setCacheStats(await window.snaplingo.cache.getStats()); } catch (e) { console.error(e); }
  };
  useEffect(() => { if (activeTab === 'settings') { loadGlossary(); loadCacheStats(); } }, [activeTab]);

  const handleAddGlossary = async () => {
    if (!newGlossarySource.trim() || !newGlossaryTarget.trim() || !window.snaplingo) return;
    await window.snaplingo.glossary.add(newGlossarySource.trim(), newGlossaryTarget.trim());
    setNewGlossarySource(''); setNewGlossaryTarget('');
    loadGlossary();
  };
  const handleDeleteGlossary = async (id: number) => {
    if (!window.snaplingo) return;
    await window.snaplingo.glossary.delete(id); loadGlossary();
  };
  const handleClearGlossary = async () => {
    if (!window.snaplingo) return;
    await window.snaplingo.glossary.clear(); loadGlossary();
  };
  const handleClearCache = async () => {
    if (!window.snaplingo) return;
    await window.snaplingo.cache.clear(); loadCacheStats();
  };

  const updateSetting = async (key: string, value: string) => {
    if (!window.snaplingo) return;
    await window.snaplingo.settings.set(key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  const handleWindowModeToggle = async (mode: 'compact' | 'expanded') => {
    if (!window.snaplingo) return;
    await window.snaplingo.window.setMode(mode);
    setWindowMode(mode);
  };
  const handleTranslate = async () => {
    if (!sourceText.trim()) { setTranslateError('Please enter text.'); return; }
    if (!window.snaplingo) return;
    setIsTranslating(true); setTranslateError(null);
    try {
      const r: TranslationResult = await window.snaplingo.translation.translate({
        text: sourceText, targetLanguage: settings[SETTINGS_KEYS.TARGET_LANGUAGE] || 'vi', sourceType: 'text'
      });
      setTranslatedResult(r.translatedText);
    } catch (e: unknown) { setTranslateError(cleanIpcError(e)); }
    finally { setIsTranslating(false); }
  };

  // Stable ref for handleTranslate so IPC listener can call the latest version
  const handleTranslateRef = useRef(handleTranslate);
  useEffect(() => { handleTranslateRef.current = handleTranslate; });
  const copyToClip = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text); setter(true); setTimeout(() => setter(false), 1500);
  };
  const handleBrowseImage = async () => {
    if (!window.snaplingo) return;
    setIsImageProcessing(true); setImageError(null); setImageResult(null); setImageFileName(null);
    try {
      const r = await window.snaplingo.ocr.importImage();
      if (!r) { setIsImageProcessing(false); return; }
      if (!r.ocrText?.trim()) setImageError('No readable text found.');
      else { setImageResult(r); setImageFileName('Selected image'); }
    } catch (e: unknown) { setImageError(cleanIpcError(e)); }
    finally { setIsImageProcessing(false); }
  };
  const handleDropImage = async (path: string, name: string) => {
    if (!window.snaplingo) return;
    setIsImageProcessing(true); setImageError(null); setImageResult(null); setImageFileName(name);
    try {
      const r = await window.snaplingo.ocr.recognizeImage(path);
      if (!r?.ocrText?.trim()) setImageError('No readable text found.');
      else setImageResult(r);
    } catch (e: unknown) { setImageError(cleanIpcError(e)); }
    finally { setIsImageProcessing(false); }
  };
  const handleCheckUpdates = async () => {
    if (!window.snaplingo) return;
    setUpdateStatus({ status: 'checking', message: 'Checking...' });
    try { setUpdateStatus(await window.snaplingo.update.check()); }
    catch (e: unknown) { setUpdateStatus({ status: 'error', message: cleanIpcError(e) }); }
  };

  const handleAnalyzeVocabulary = async (textToAnalyze: string) => {
    if (!textToAnalyze?.trim()) {
      setAnalyzeError('No text available for analysis.');
      setIsAnalyzeOpen(true);
      return;
    }

    setAnalyzeError(null);
    setAnalyzeTokens([]);
    setIsAnalyzing(true);
    setIsAnalyzeOpen(true);

    try {
      if (!window.snaplingo) {
        throw new Error('SnapLingo API is not available.');
      }
      const tokens = await window.snaplingo.vocabulary.analyze(textToAnalyze);
      setAnalyzeTokens(tokens);
    } catch (e: any) {
      console.error('POS Analysis failed:', e);
      setAnalyzeError(cleanIpcError(e));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const privacyMode = settings[SETTINGS_KEYS.PRIVACY_MODE] === 'true';
  const isCompact = windowMode === 'compact';

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-surface text-on-surface-variant">
      <div className="text-center"><div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary-container border-t-transparent mx-auto" /><p className="text-sm">Loading...</p></div>
    </div>
  );

  // ─── TRANSLATOR TAB — 2-column grid matching Dashboard mockup ───
  const renderTranslatorPanel = () => (
    <div className="flex flex-col h-full gap-6">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_minmax(300px,400px)] gap-6 h-full">
        {/* LEFT COLUMN — Source + Translation panels stacked */}
        <div className="flex flex-col gap-6 h-full">
          {/* ─── Source Text Panel ─── */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-rest flex flex-col focus-within:border-primary focus-within:shadow-hover transition-all flex-1 min-h-[200px]">
            {/* Header: language selector + char count */}
            <div className="px-4 py-2 border-b border-outline-variant/20 bg-surface/50 flex justify-between items-center shrink-0">
              <button className="flex items-center gap-1 text-primary text-[12px] font-bold hover:bg-surface-variant/50 px-2 py-1 rounded">
                Detect Language (English) <span className="text-[16px]">▾</span>
              </button>
              <span className="text-[12px] text-outline">{sourceText.length} / 5000</span>
            </div>
            {/* Textarea — no internal border, transparent bg */}
            <textarea
              value={sourceText}
              onChange={e => setSourceText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleTranslate()}
              placeholder="Enter text to translate..."
              className="flex-1 w-full p-4 bg-transparent border-none resize-none focus:ring-0 text-[16px] text-on-surface placeholder:text-outline select-text"
            />
            {/* Footer: Translate button (pill shape) */}
            <div className="px-4 py-2 border-t border-outline-variant/20 flex justify-end shrink-0">
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="px-8 py-2 rounded-full bg-primary text-white text-[12px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isTranslating ? 'Translating...' : 'Translate'}
              </button>
            </div>
          </div>

          {/* ─── Translation Result Panel ─── */}
          <div className="bg-surface-container-low rounded-xl border border-outline-variant/20 shadow-rest flex flex-col flex-1 min-h-[200px]">
            {/* Header: target language + action icons */}
            <div className="px-4 py-2 border-b border-outline-variant/20 bg-surface/50 flex justify-between items-center shrink-0">
              <select
                className="text-primary text-[12px] font-bold bg-transparent border-none focus:ring-0 cursor-pointer"
                value={settings[SETTINGS_KEYS.TARGET_LANGUAGE] || 'vi'}
                onChange={e => updateSetting(SETTINGS_KEYS.TARGET_LANGUAGE, e.target.value)}
              >
                <option value="vi">Vietnamese</option>
                <option value="en">English</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
                <option value="fr">French</option>
              </select>
              <div className="flex gap-1">
                <button
                  onClick={() => translatedResult && copyToClip(translatedResult, setCopiedText)}
                  className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded hover:bg-surface-variant/50 flex items-center justify-center"
                  title="Copy"
                >
                  {copiedText
                    ? <span className="text-secondary text-[12px] font-bold">✓</span>
                    : <IconCopy className="w-[18px] h-[18px]" />}
                </button>
                <button
                  className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded hover:bg-surface-variant/50 flex items-center justify-center"
                  title="Pin to Corner"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 2v10m0 0l4-4m-4 4l-4-4M5 14h14v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6z" /></svg>
                </button>
                {(translatedResult || sourceText) && (
                  <button
                    onClick={() => {
                      const isEn = settings[SETTINGS_KEYS.TARGET_LANGUAGE] === 'en';
                      handleAnalyzeVocabulary(isEn ? translatedResult : sourceText);
                    }}
                    className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded hover:bg-surface-variant/50 flex items-center justify-center"
                    title="Analyze POS"
                  >
                    <IconAnalyze className="w-[18px] h-[18px]" />
                  </button>
                )}
              </div>
            </div>
            {/* Body: translation result */}
            <div className="p-4 flex-1 overflow-y-auto select-text">
              {isTranslating ? (
                <div className="flex items-center justify-center h-full">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : translateError ? (
                <span className="text-error text-[14px]">{translateError}</span>
              ) : (
                <p className="text-[16px] text-on-surface">
                  {translatedResult || <span className="text-on-surface-variant italic">Translation will appear here.</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — OCR Recognized Text panel */}
        <div className="flex flex-col h-full">
          <OCRResultPanel
            text={ocrSnipText}
            isVisible={ocrSnipVisible}
            onTextChange={setOcrSnipText}
            onAddToTranslator={() => {
              setSourceText(ocrSnipText);
              setOcrSnipVisible(false);
            }}
            onTranslateNow={() => {
              setSourceText(ocrSnipText);
              setOcrSnipVisible(false);
              setTimeout(() => handleTranslateRef.current(), 100);
            }}
            onAnalyze={() => handleAnalyzeVocabulary(ocrSnipText)}
            onCopy={() => navigator.clipboard.writeText(ocrSnipText)}
            onClear={() => { setOcrSnipText(''); setOcrSnipVisible(false); }}
          />
          {/* Empty state when no OCR text */}
          {(!ocrSnipVisible || !ocrSnipText) && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-rest flex flex-col items-center justify-center h-full p-8 text-center">
              <IconScreenSnip className="w-12 h-12 text-outline-variant/40 mb-4" />
              <p className="text-[14px] font-semibold text-on-surface-variant">No Recognized Text</p>
              <p className="text-[12px] text-outline mt-1">Use Screen Snip or import an image to recognize text</p>
            </div>
          )}
        </div>
      </div>

      {/* POS Analysis Panel — shown below the grid */}
      {isAnalyzeOpen && (
        <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-rest overflow-visible">
          {/* Header + Legend */}
          <div className="flex items-center justify-between">
            <POSLegend />
            <button
              onClick={() => setIsAnalyzeOpen(false)}
              className="text-on-surface-variant hover:text-on-surface text-[12px] font-bold px-4 py-2 transition"
            >
              ✕
            </button>
          </div>
          {/* Content */}
          <div className="p-6 relative">
            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-[14px] text-on-surface-variant py-4">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Analyzing parts of speech...</span>
              </div>
            ) : analyzeError ? (
              <div className="text-error text-[14px]">{analyzeError}</div>
            ) : (
              <WordTokenHighlighter tokens={analyzeTokens} />
            )}
          </div>
          {/* Footer: Copy Analysis */}
          <div className="px-4 py-2 bg-surface-container/30 border-t border-outline-variant/10 flex justify-end">
            <button
              onClick={() => {
                const text = analyzeTokens.map(t => `${t.text} [${t.category}]`).join(' ');
                navigator.clipboard.writeText(text);
              }}
              className="text-[12px] text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
            >
              <IconCopy className="w-4 h-4" /> Copy Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── SCAN TAB (formerly Image OCR) ───
  const currentScanMode = settings[SETTINGS_KEYS.SCAN_MODE] || 'document';
  const isCodeMode = currentScanMode === 'code';

  const renderImagePanel = () => (
    <div className="flex flex-col h-full gap-4">
      {/* Scan Mode Toggle — Document vs Code */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-on-surface">Scan</h2>
        <div className="flex bg-surface-container-high rounded-fluent p-0.5 border border-outline-variant">
          <button
            onClick={() => updateSetting(SETTINGS_KEYS.SCAN_MODE, 'document')}
            className={`px-3 py-1.5 text-xs font-medium rounded-fluent transition-all ${!isCodeMode ? 'bg-primary-container text-white shadow-rest' : 'text-on-surface-variant hover:text-on-surface'}`}
          >📄 Document</button>
          <button
            onClick={() => updateSetting(SETTINGS_KEYS.SCAN_MODE, 'code')}
            className={`px-3 py-1.5 text-xs font-medium rounded-fluent transition-all ${isCodeMode ? 'bg-emerald-600 text-white shadow-rest' : 'text-on-surface-variant hover:text-on-surface'}`}
          >💻 Code</button>
        </div>
      </div>

      {/* Drop zone */}
      <div className={`fluent-card border-2 border-dashed p-8 text-center cursor-pointer transition-all ${isDragOver ? 'border-primary-container bg-primary-50' : 'border-outline-variant'}`}
        onClick={handleBrowseImage}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) { const p = (f as unknown as {path:string}).path; if(p) handleDropImage(p, f.name); } }}>
        {isImageProcessing ? <div className="flex flex-col items-center gap-2"><div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-container border-t-transparent" /><span className="text-sm text-on-surface-variant">Processing OCR...</span></div>
        : <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">{isCodeMode ? '💻' : '📷'}</span>
            <p className="text-sm font-medium text-on-surface">{isDragOver ? 'Drop image here' : isCodeMode ? 'Drop code screenshot or click to browse' : 'Click to browse or drag image here'}</p>
            <p className="text-xs text-on-surface-variant">PNG, JPG, BMP, WebP · Max 10MB{isCodeMode ? ' · Code mode: no translation' : ''}</p>
          </div>}
      </div>

      {imageError && <div className="bg-error-container border border-error/20 rounded-fluent p-3 text-error text-xs">⚠️ {imageError}</div>}

      {/* Results — renders differently based on scan mode */}
      {imageResult?.ocrText && (
        imageResult.scanMode === 'code' || isCodeMode ? (
          /* ─── CODE SCAN RESULT ─── */
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface-variant uppercase">Code Scan Result</span>
                <span className="text-[10px] text-on-surface-variant">Confidence: {imageResult.confidence.toFixed(0)}%</span>
              </div>
              <button onClick={() => copyToClip(imageResult.ocrText, setCopiedOcr)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-fluent transition flex items-center gap-1.5"
              >{copiedOcr ? '✓ Copied!' : '📋 Copy Code'}</button>
            </div>
            <div className="flex-1 overflow-auto rounded-lg bg-gray-950 border border-gray-800 font-mono text-[12px] leading-relaxed select-text min-h-[200px]">
              <table className="w-full border-collapse">
                <tbody>
                  {imageResult.ocrText.split('\n').map((line: string, i: number) => (
                    <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                      <td className="text-right pr-3 pl-3 py-0.5 text-gray-600 select-none border-r border-gray-800 w-[1%] whitespace-nowrap">{i + 1}</td>
                      <td className="pl-4 pr-3 py-0.5 whitespace-pre text-emerald-300">{line || '\u00A0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ─── DOCUMENT SCAN RESULT (original 2-column layout) ─── */
          <div className="flex flex-col gap-4 flex-1">
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-on-surface-variant uppercase">OCR Text</span>
                  <div className="flex items-center gap-2">
                    {imageResult.ocrText && (
                      <button
                        onClick={() => handleAnalyzeVocabulary(imageResult.ocrText)}
                        className="text-[10px] font-bold px-2 py-0.5 bg-primary-container/20 dark:bg-primary-container/40 text-primary hover:bg-primary-container/30 dark:hover:bg-primary-container/50 rounded-lg transition"
                        title="Analyze English POS"
                      >
                        ✨ Analyze
                      </button>
                    )}
                    <span className="text-[10px] text-on-surface-variant">{imageResult.confidence.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="fluent-input flex-1 p-3 text-sm text-on-surface select-text overflow-y-auto whitespace-pre-wrap min-h-[120px]">{imageResult.ocrText}</div>
                <button onClick={() => copyToClip(imageResult.ocrText, setCopiedOcr)} className="self-end text-xs text-primary font-medium hover:underline">{copiedOcr ? '✓ Copied' : 'Copy OCR Text'}</button>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-on-surface-variant uppercase">Translation</span></div>
                <div className="fluent-input flex-1 p-3 text-sm text-on-surface font-medium select-text overflow-y-auto whitespace-pre-wrap min-h-[120px] bg-surface-container-lowest">{imageResult.translatedText}</div>
                <button onClick={() => copyToClip(imageResult.translatedText, setCopiedTranslation)} className="self-end text-xs text-primary font-medium hover:underline">{copiedTranslation ? '✓ Copied' : 'Copy Translation'}</button>
              </div>
            </div>

            {/* POS Highlight Analysis Sub-Panel for OCR Scans */}
            {isAnalyzeOpen && (
              <div className="p-4 bg-surface-container rounded-fluent border border-outline/25 shadow-sm transition-all duration-300">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                    📊 English Part-of-Speech Analysis
                  </h3>
                  <button
                    onClick={() => setIsAnalyzeOpen(false)}
                    className="text-on-surface-variant hover:text-on-surface text-sm font-semibold"
                  >
                    ✕ Close
                  </button>
                </div>
                {isAnalyzing ? (
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant py-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Analyzing parts of speech...</span>
                  </div>
                ) : analyzeError ? (
                  <div className="text-error text-sm">⚠️ {analyzeError}</div>
                ) : (
                  <>
                    <POSLegend />
                    <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline/10 max-h-[180px] overflow-y-auto mt-2 select-text">
                      <WordTokenHighlighter tokens={analyzeTokens} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );

  // ─── HISTORY TAB ───
  const handleDeleteHistory = async (id: number) => {
    if (!window.snaplingo) return;
    await window.snaplingo.history.delete(id); loadHistory();
  };
  const handleClearHistory = async () => {
    if (!window.snaplingo) return;
    await window.snaplingo.history.clear(); loadHistory();
  };

  const renderHistoryPanel = () => (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-on-surface">Translation History</h2>
        {historyItems.length > 0 && <button onClick={handleClearHistory} className="text-xs text-error hover:underline">Clear All</button>}
      </div>
      <div className="fluent-input flex items-center gap-2 px-3 py-2">
        <span className="text-on-surface-variant">🔍</span>
        <input type="text" placeholder="Search past translations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-on-surface outline-none placeholder-on-surface-variant select-text" />
      </div>
      <div className="flex-1 overflow-y-auto space-y-3">
        {historyItems.length === 0 ? <div className="text-center py-10 text-on-surface-variant text-sm italic">No translations found.</div>
        : historyItems.map(item => (
          <div key={item.id} className="fluent-card p-4 relative group">
            <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-primary-container rounded-r" />
            <button onClick={() => handleDeleteHistory(item.id)} className="absolute right-3 top-3 text-error opacity-0 group-hover:opacity-100 transition text-xs" title="Delete">✕</button>
            <div className="pl-3">
              <div className="flex items-center gap-2 mb-2 text-xs">
                <span className="text-on-surface-variant">🕐 {new Date(item.createdAt).toLocaleString()}</span>
                <span>•</span>
                <span className="text-primary font-semibold">{(item.sourceLanguage || 'Auto').toUpperCase()}</span>
                <span className="text-on-surface-variant">→</span>
                <span className="text-primary font-semibold">{item.targetLanguage.toUpperCase()}</span>
              </div>
              <p className="text-sm text-on-surface-variant mb-1">{item.sourceText}</p>
              <p className="text-sm text-on-surface font-medium">{item.translatedText}</p>
            </div>
          </div>
        ))}
      </div>
      {historyItems.length > 0 && <div className="text-center text-xs text-teal flex items-center justify-center gap-1.5">🛡️ Your translation history is stored securely on this computer.</div>}
    </div>
  );

  // ─── SETTINGS TAB ───
  const devMode = settings[SETTINGS_KEYS.DEVELOPER_MODE] === 'true';
  const allowFallback = settings[SETTINGS_KEYS.ALLOW_PROVIDER_FALLBACK] === 'true';

  const renderSettingsPanel = () => (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h2 className="text-xl font-semibold text-on-surface">Settings</h2>
      {/* Language & Provider */}
      <div className="fluent-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-on-surface">Language & Provider</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">Target Language</span>
          <select className="fluent-input px-2 py-1 text-sm" value={settings[SETTINGS_KEYS.TARGET_LANGUAGE] || 'vi'} onChange={e => updateSetting(SETTINGS_KEYS.TARGET_LANGUAGE, e.target.value)}>
            <option value="vi">Vietnamese</option><option value="en">English</option><option value="ja">Japanese</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">Translation Provider</span>
          <select className="fluent-input px-2 py-1 text-sm" value={settings[SETTINGS_KEYS.TRANSLATION_PROVIDER] || 'google'} onChange={e => updateSetting(SETTINGS_KEYS.TRANSLATION_PROVIDER, e.target.value)}>
            <option value="google">Google Translate (Free)</option><option value="libretranslate">LibreTranslate</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-on-surface">Provider Fallback</p><p className="text-xs text-on-surface-variant">Auto-switch to backup provider on failure</p></div>
          <div className={`toggle-switch ${allowFallback ? 'active' : ''}`} onClick={() => updateSetting(SETTINGS_KEYS.ALLOW_PROVIDER_FALLBACK, allowFallback ? 'false' : 'true')} />
        </div>
      </div>
      {/* Developer Mode */}
      <div className="fluent-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-on-surface">Developer Mode</h3>
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-on-surface">Keep Technical Terms</p><p className="text-xs text-on-surface-variant">Preserve API, class, function, callback etc.</p></div>
          <div className={`toggle-switch ${devMode ? 'active' : ''}`} onClick={() => updateSetting(SETTINGS_KEYS.DEVELOPER_MODE, devMode ? 'false' : 'true')} />
        </div>
        {devMode && <p className="text-xs text-primary">✓ 25 technical terms will be preserved during translation.</p>}
      </div>
      {/* Glossary */}
      <div className="fluent-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface">Glossary ({glossaryItems.length} terms)</h3>
          {glossaryItems.length > 0 && <button onClick={handleClearGlossary} className="text-xs text-error hover:underline">Clear All</button>}
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder="Source term" value={newGlossarySource} onChange={e => setNewGlossarySource(e.target.value)}
            className="fluent-input flex-1 px-2 py-1 text-sm select-text" />
          <span className="text-on-surface-variant self-center">→</span>
          <input type="text" placeholder="Keep as" value={newGlossaryTarget} onChange={e => setNewGlossaryTarget(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddGlossary()}
            className="fluent-input flex-1 px-2 py-1 text-sm select-text" />
          <button onClick={handleAddGlossary} className="bg-primary-container text-white text-xs px-3 py-1 rounded-fluent hover:bg-primary transition">Add</button>
        </div>
        {glossaryItems.length > 0 && (
          <div className="max-h-[150px] overflow-y-auto space-y-1">
            {glossaryItems.map(g => (
              <div key={g.id} className="flex items-center justify-between bg-surface-container-low rounded px-2 py-1 text-xs">
                <span><span className="font-medium text-on-surface">{g.sourceTerm}</span> <span className="text-on-surface-variant">→</span> <span className="text-primary font-medium">{g.targetTerm}</span></span>
                <button onClick={() => handleDeleteGlossary(g.id)} className="text-error hover:underline ml-2">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Privacy & Security */}
      <div className="fluent-card p-4 space-y-4">
        <h3 className="text-sm font-bold text-on-surface">Privacy & Security</h3>
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-on-surface">Local-Only Mode</p><p className="text-xs text-on-surface-variant">Disable cloud processing for privacy</p></div>
          <div className={`toggle-switch ${privacyMode ? 'active-teal' : ''}`} onClick={() => updateSetting(SETTINGS_KEYS.PRIVACY_MODE, privacyMode ? 'false' : 'true')} />
        </div>
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-on-surface">Enable History</p><p className="text-xs text-on-surface-variant">Log translations locally</p></div>
          <div className={`toggle-switch ${settings[SETTINGS_KEYS.HISTORY_ENABLED] === 'true' ? 'active' : ''}`} onClick={() => updateSetting(SETTINGS_KEYS.HISTORY_ENABLED, settings[SETTINGS_KEYS.HISTORY_ENABLED] === 'true' ? 'false' : 'true')} />
        </div>
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-on-surface">Restore Clipboard</p><p className="text-xs text-on-surface-variant">Restore after simulated copy</p></div>
          <div className={`toggle-switch ${settings[SETTINGS_KEYS.RESTORE_CLIPBOARD] === 'true' ? 'active' : ''}`} onClick={() => updateSetting(SETTINGS_KEYS.RESTORE_CLIPBOARD, settings[SETTINGS_KEYS.RESTORE_CLIPBOARD] === 'true' ? 'false' : 'true')} />
        </div>
        {privacyMode && <div className="text-xs text-teal flex items-center gap-1">🛡️ Local-Only Mode is active. Cache and cloud engines are disabled.</div>}
      </div>
      {/* Cache & System */}
      <div className="fluent-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-on-surface">Cache & System</h3>
        <div className="flex items-center justify-between text-sm">
          <div><span className="text-on-surface-variant">Translation Cache</span><span className="text-xs text-on-surface-variant ml-2">({cacheStats.count} entries)</span></div>
          <button onClick={handleClearCache} className="text-xs text-error hover:underline">Clear Cache</button>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant">OCR Engine</span>
          <select className="fluent-input px-2 py-1 text-sm"><option>Tesseract OCR (Local)</option></select>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant">OCR Language</span>
          <select className="fluent-input px-2 py-1 text-sm" value={settings[SETTINGS_KEYS.OCR_LANGUAGE] || 'eng'} onChange={e => updateSetting(SETTINGS_KEYS.OCR_LANGUAGE, e.target.value)}>
            <option value="eng">English</option>
            <option value="vie">Vietnamese</option>
          </select>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant">Database</span>
          <span className={`font-medium ${dbStatus.connected ? 'text-teal' : 'text-error'}`}>{dbStatus.connected ? 'Connected' : 'Offline'}</span>
        </div>
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-on-surface-variant">Software Update</p><p className="text-xs text-on-surface-variant italic">{updateStatus.message}</p></div>
          <button onClick={handleCheckUpdates} disabled={updateStatus.status === 'checking'}
            className="text-xs text-primary font-medium hover:underline disabled:opacity-50">{updateStatus.status === 'checking' ? 'Checking...' : 'Check Updates'}</button>
        </div>
      </div>
      {/* Shortcuts */}
      <div className="fluent-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-on-surface">Keyboard Shortcuts</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between"><span className="text-on-surface-variant">Translate selected text</span><kbd className="bg-surface-container-low px-2 py-0.5 rounded text-xs font-mono border border-outline-variant">Ctrl+Shift+D</kbd></div>
          <div className="flex items-center justify-between"><span className="text-on-surface-variant">Screen Snip (OCR)</span><kbd className="bg-surface-container-low px-2 py-0.5 rounded text-xs font-mono border border-outline-variant">Ctrl+Shift+S</kbd></div>
          <div className="flex items-center justify-between"><span className="text-on-surface-variant">Show / Hide window</span><kbd className="bg-surface-container-low px-2 py-0.5 rounded text-xs font-mono border border-outline-variant">Ctrl+Shift+Space</kbd></div>
        </div>
      </div>
      {/* About */}
      <div className="fluent-card p-4 space-y-2">
        <h3 className="text-sm font-bold text-on-surface">About</h3>
        <div className="text-sm space-y-1">
          <div className="flex items-center justify-between"><span className="text-on-surface-variant">Version</span><span className="font-medium text-primary">{version}</span></div>
          <div className="flex items-center justify-between"><span className="text-on-surface-variant">Engine</span><span className="text-on-surface">Electron + React + SQLite</span></div>
          <div className="flex items-center justify-between"><span className="text-on-surface-variant">License</span><span className="text-on-surface">MIT</span></div>
        </div>
        <p className="text-xs text-on-surface-variant mt-2">SnapLingo — Fast, private desktop translation tool. Built with privacy-first principles.</p>
      </div>
    </div>
  );

  // ─── MINI HISTORY ───
  const renderMiniHistory = () => (
    <div className="flex flex-col h-full">
      <button onClick={() => setActiveTab('translator')} className="text-xs text-primary font-medium mb-2 self-start hover:underline">← Back to Translate</button>
      <h3 className="text-base font-semibold text-on-surface mb-3">Recent Translations</h3>
      <div className="flex-1 overflow-y-auto space-y-2">
        {historyItems.map(item => (
          <div key={item.id} className="border-l-[3px] border-primary-container pl-3 py-2">
            <div className="text-[10px] text-primary font-bold">{(item.sourceLanguage||'EN').toUpperCase()} → {item.targetLanguage.toUpperCase()}</div>
            <p className="text-xs text-on-surface mt-0.5">{item.sourceText}</p>
            <p className="text-xs text-on-surface-variant italic mt-0.5">{item.translatedText}</p>
          </div>
        ))}
      </div>
      <div className="text-center text-[10px] text-on-surface-variant mt-2">Showing last {historyItems.length} translations</div>
    </div>
  );

  // ─── MINI SETTINGS ───
  const renderMiniSettings = () => (
    <div className="flex flex-col h-full">
      <h3 className="text-base font-semibold text-on-surface mb-1">Quick Settings</h3>
      <p className="text-xs text-on-surface-variant mb-3">Manage core mini-window behaviors.</p>
      <div className="space-y-3">
        <div className="fluent-card p-3 flex items-center justify-between">
          <div><p className="text-xs font-semibold text-on-surface">Always on Top</p><p className="text-[10px] text-on-surface-variant">Keep mini window above other apps</p></div>
          <div className="toggle-switch active" />
        </div>
        <div className="fluent-card p-3 flex items-center justify-between">
          <div><p className="text-xs font-semibold text-on-surface flex items-center gap-1">🛡️ Local-Only Mode</p><p className="text-[10px] text-on-surface-variant">Disable cloud processing for privacy</p></div>
          <div className={`toggle-switch ${privacyMode ? 'active-teal' : ''}`} onClick={() => updateSetting(SETTINGS_KEYS.PRIVACY_MODE, privacyMode ? 'false' : 'true')} />
        </div>
        <div className="fluent-card p-3">
          <p className="text-xs font-semibold text-on-surface mb-2">OCR Engine</p>
          <select className="fluent-input w-full px-2 py-1 text-xs"><option>Tesseract OCR (Local, Default)</option></select>
          <p className="text-[10px] text-on-surface-variant mt-2">🛡️ Local-Only Mode is active. Cloud engines are currently disabled.</p>
        </div>
      </div>
    </div>
  );

  // ─── MINI TRANSLATOR ───
  const renderMiniTranslator = () => (
    <div className="flex flex-col h-full gap-1.5">
      <div className="flex items-center justify-between">
        <select className="fluent-input px-1.5 py-0.5 text-[11px] text-on-surface-variant rounded-full">
          <option>Detect Language</option><option>English</option><option>Vietnamese</option>
        </select>
        <button onClick={() => window.snaplingo?.ocr.startScreenSelection()} className="w-6 h-6 bg-primary-container rounded-full flex items-center justify-center text-white text-[10px] shadow-rest hover:bg-primary transition" title="Screen Snip">📐</button>
      </div>
      <textarea value={sourceText} onChange={e => setSourceText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleTranslate(); }}
        placeholder="Type text or use snipping tool..."
        className="fluent-input p-2 text-[12px] text-on-surface resize-none select-text h-[70px]" />
      <div className="flex items-center justify-between">
        <select className="fluent-input px-1.5 py-0.5 text-[11px] text-on-surface-variant rounded-full"
          value={settings[SETTINGS_KEYS.TARGET_LANGUAGE] || 'vi'} onChange={e => updateSetting(SETTINGS_KEYS.TARGET_LANGUAGE, e.target.value)}>
          <option value="en">English</option><option value="vi">Vietnamese</option><option value="ja">Japanese</option>
        </select>
        <div className="flex gap-1">
          <button onClick={() => translatedResult && copyToClip(translatedResult, setCopiedText)} className="text-on-surface-variant hover:text-primary text-xs">{copiedText ? '✓' : '📋'}</button>
          <button className="text-on-surface-variant hover:text-primary text-xs">🔊</button>
        </div>
      </div>
      <div className="fluent-input p-2 text-[12px] h-[70px] overflow-y-auto select-text bg-surface-container-lowest">
        {isTranslating ? <div className="flex items-center justify-center h-full"><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-container border-t-transparent" /></div>
         : <span className="text-on-surface">{translatedResult || <span className="text-on-surface-variant italic">Translation will appear here...</span>}</span>}
      </div>
    </div>
  );

  // ─── COMPACT (MINI) MODE ───
  if (isCompact) {
    const miniTabs = [
      { id: 'translator', icon: '文' },
      { id: 'image', icon: '📷' },
      { id: 'history', icon: '🕐' },
      { id: 'settings', icon: '⚙️' },
    ];

    const renderMiniContent = () => {
      switch (activeTab) {
        case 'translator': return renderMiniTranslator();
        case 'image': return renderImagePanel();
        case 'history': return renderMiniHistory();
        case 'settings': return renderMiniSettings();
        default: return renderMiniTranslator();
      }
    };

    return (
      <div className="flex h-screen bg-surface-container-lowest text-on-surface font-sans select-none overflow-hidden">
        <div className="w-[34px] flex flex-col items-center pt-2 pb-2 gap-0.5 border-r border-outline-variant">
          {miniTabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`w-[28px] h-[28px] flex items-center justify-center rounded text-[13px] transition relative
                ${activeTab === t.id ? 'bg-primary-fixed text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
              {activeTab === t.id && <span className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-primary-container rounded-r" />}
              {t.icon}
            </button>
          ))}
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center justify-between px-2.5 py-1.5 border-b border-outline-variant">
            <span className="text-[13px] font-semibold text-primary">SnapLingo Mini</span>
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <button onClick={() => handleWindowModeToggle('expanded')} className="text-[11px] hover:text-primary" title="Expand">—</button>
              <button className="text-[11px] hover:text-error" title="Close">✕</button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-2.5">{renderMiniContent()}</main>
        </div>
      </div>
    );
  }

  // ─── EXPANDED (FULL) MODE ───
  const renderTabContent = () => {
    switch (activeTab) {
      case 'translator': return renderTranslatorPanel();
      case 'image': return renderImagePanel();
      case 'history': return renderHistoryPanel();
      case 'settings': return renderSettingsPanel();
      default: return renderTranslatorPanel();
    }
  };

  // Quick action toolbar items
  const toolbarItems = [
    { id: 'text', icon: <IconTranslate className="w-5 h-5" />, label: 'Text', action: () => setActiveTab('translator') },
    { id: 'snip', icon: <IconScreenSnip className="w-5 h-5" />, label: 'Screen Snip', action: () => window.snaplingo?.ocr.startScreenSelection() },
    { id: 'import', icon: <IconScan className="w-5 h-5" />, label: 'Import', action: () => setActiveTab('image') },
    { id: 'history', icon: <IconHistory className="w-5 h-5" />, label: 'History', action: () => setActiveTab('history') },
  ];

  return (
    <div className="flex h-screen bg-surface-bright text-on-surface font-sans select-none overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} version={version} isCompact={sidebarCompact} privacyMode={privacyMode} onToggleCompact={() => setSidebarCompact(prev => !prev)} />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* ─── Desktop Header with Badges ─── */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant/20 bg-surface/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h1 className="text-[20px] font-semibold text-on-surface">Translate Workspace</h1>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary-container/30 text-on-secondary-container text-[12px] border border-secondary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> Local Processing Active
              </span>
              {privacyMode && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-container/30 text-primary text-[12px] border border-primary/20">
                  <IconPrivacy className="w-[14px] h-[14px]" /> Privacy Mode On
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('settings')}
              className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center"
            >
              <IconSettings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Quick Action Toolbar ─── */}
        {activeTab === 'translator' && (
          <div className="px-6 py-2 bg-surface-container-lowest border-b border-outline-variant/20 flex gap-2 shrink-0">
            {toolbarItems.map(item => (
              <button
                key={item.id}
                onClick={item.action}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors text-[14px]
                  ${item.id === 'snip'
                    ? 'bg-primary text-white shadow-fab hover:bg-primary/90'
                    : 'bg-surface-variant/50 text-on-surface hover:text-primary'
                  }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        )}

        {/* ─── Main Content Area ─── */}
        <div className="flex-1 p-6 overflow-y-auto">{renderTabContent()}</div>

        {/* ─── Status Bar ─── */}
        <footer className="h-8 bg-surface-container-high border-t border-outline-variant/20 px-4 flex items-center justify-between shrink-0">
          <span className="text-[12px] text-on-surface-variant flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary" /> Engine: Offline V3.1
          </span>
          <span className="text-[12px] text-on-surface-variant">
            Memory Usage: {Math.round(performance?.memory?.usedJSHeapSize / 1048576 || 0)}MB
          </span>
        </footer>
      </main>
    </div>
  );
}
