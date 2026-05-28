import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import { SnapLingoAPI } from '../shared/types';

/**
 * Clean helper to intercept and unwrap standard AppResult envelopes.
 * Why: Keeps React Renderer 100% free of main-process handling details
 * while ensuring that validation errors are thrown back cleanly as native exceptions.
 */
function unwrapResult<T>(result: any): T {
  if (result && typeof result === 'object' && 'ok' in result) {
    if (result.ok) {
      return result.data;
    } else {
      const err = new Error(result.error.message);
      // Attach metadata for diagnostics
      (err as any).code = result.error.code;
      (err as any).details = result.error.details;
      throw err;
    }
  }
  return result;
}

// Concrete implementation of SnapLingo API wrapping results with unwrapResult
const snaplingoAPI: SnapLingoAPI = {
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_VERSION).then(unwrapResult)
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET, key).then(unwrapResult),
    set: (key: string, value: any) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.SET, { key, value }).then(unwrapResult),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET_ALL).then(unwrapResult)
  },
  database: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.DB.GET_STATUS).then(unwrapResult)
  },
  update: {
    check: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE.CHECK).then(unwrapResult)
  },
  window: {
    setMode: (mode: 'compact' | 'expanded') => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.SET_MODE, mode).then(unwrapResult),
    getMode: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.GET_MODE).then(unwrapResult)
  },
  translation: {
    translate: (input) => ipcRenderer.invoke(IPC_CHANNELS.TRANSLATION.TRANSLATE, input).then(unwrapResult)
  },
  history: {
    getRecent: (limit) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY.GET_RECENT, limit).then(unwrapResult),
    search: (query) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY.SEARCH, query).then(unwrapResult),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY.DELETE, id).then(unwrapResult),
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.HISTORY.CLEAR).then(unwrapResult)
  },
  ocr: {
    startScreenSelection: () => ipcRenderer.invoke(IPC_CHANNELS.OCR.START_SCREEN_SELECTION).then(unwrapResult),
    cancelScreenSelection: () => ipcRenderer.invoke(IPC_CHANNELS.OCR.CANCEL_SCREEN_SELECTION).then(unwrapResult),
    submitSelection: (rect) => ipcRenderer.invoke(IPC_CHANNELS.OCR.SUBMIT_SELECTION, rect).then(unwrapResult),
    importImage: () => ipcRenderer.invoke(IPC_CHANNELS.OCR.IMPORT_IMAGE).then(unwrapResult),
    recognizeImage: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.OCR.RECOGNIZE_IMAGE, filePath).then(unwrapResult),
    sendTextToMain: (payload) => ipcRenderer.invoke(IPC_CHANNELS.OCR.SEND_TEXT_TO_MAIN, payload).then(unwrapResult),
    onTextReceived: (callback) => {
      const handler = (_event: any, payload: any) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.OCR.TEXT_RECEIVED, handler);
      // Return cleanup function for React useEffect
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.OCR.TEXT_RECEIVED, handler); };
    }
  },
  glossary: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.GLOSSARY.GET_ALL).then(unwrapResult),
    add: (source, target) => ipcRenderer.invoke(IPC_CHANNELS.GLOSSARY.ADD, { source, target }).then(unwrapResult),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.GLOSSARY.DELETE, id).then(unwrapResult),
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.GLOSSARY.CLEAR).then(unwrapResult)
  },
  cache: {
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.CACHE.CLEAR).then(unwrapResult),
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.CACHE.GET_STATS).then(unwrapResult)
  },
  vocabulary: {
    analyze: (text: string) => ipcRenderer.invoke(IPC_CHANNELS.VOCABULARY.ANALYZE, text).then(unwrapResult)
  }
};

/**
 * Expose secure snaplingo bridge API into the DOM window scope.
 * Why: Restricts Renderer from accessing powerful electron or fs elements.
 */
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('snaplingo', snaplingoAPI);
  } catch (error) {
    console.error('Failed to expose snaplingo API in main world:', error);
  }
} else {
  // Fallback for non-isolated context (testing environments)
  // @ts-ignore
  window.snaplingo = snaplingoAPI;
}
