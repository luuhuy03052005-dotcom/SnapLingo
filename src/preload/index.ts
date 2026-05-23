import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import { SnapLingoAPI } from '../shared/types';

// Concrete implementation of SnapLingo API
const snaplingoAPI: SnapLingoAPI = {
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_VERSION)
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET, key),
    set: (key: string, value: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.SET, key, value),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET_ALL)
  },
  database: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.DB.GET_STATUS)
  },
  update: {
    check: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE.CHECK)
  },
  window: {
    setMode: (mode: 'compact' | 'expanded') => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.SET_MODE, mode),
    getMode: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.GET_MODE)
  },
  translation: {
    translate: (input) => ipcRenderer.invoke(IPC_CHANNELS.TRANSLATION.TRANSLATE, input)
  },
  history: {
    getRecent: (limit) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY.GET_RECENT, limit),
    search: (query) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY.SEARCH, query),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY.DELETE, id),
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.HISTORY.CLEAR)
  },
  ocr: {
    startScreenSelection: () => ipcRenderer.invoke(IPC_CHANNELS.OCR.START_SCREEN_SELECTION),
    cancelScreenSelection: () => ipcRenderer.invoke(IPC_CHANNELS.OCR.CANCEL_SCREEN_SELECTION),
    submitSelection: (rect) => ipcRenderer.invoke(IPC_CHANNELS.OCR.SUBMIT_SELECTION, rect),
    importImage: () => ipcRenderer.invoke(IPC_CHANNELS.OCR.IMPORT_IMAGE),
    recognizeImage: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.OCR.RECOGNIZE_IMAGE, filePath)
  },
  glossary: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.GLOSSARY.GET_ALL),
    add: (source, target) => ipcRenderer.invoke(IPC_CHANNELS.GLOSSARY.ADD, source, target),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.GLOSSARY.DELETE, id),
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.GLOSSARY.CLEAR)
  },
  cache: {
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.CACHE.CLEAR),
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.CACHE.GET_STATS)
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
