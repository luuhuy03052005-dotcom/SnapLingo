import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TesseractProvider } from './TesseractProvider';

// 1. Mock Electron module
vi.mock('electron', () => {
  return {
    app: {
      isPackaged: false,
      getAppPath: () => 'C:\\mock-app-path',
      getPath: (name: string) => `C:\\mock-user-data\\${name}`,
    },
  };
});

// 2. Mock fs module
let mockExists = true;
vi.mock('fs', () => {
  return {
    existsSync: vi.fn().mockImplementation(() => mockExists),
  };
});

// 3. Mock tesseract.js with inline objects to avoid hoisting issues
vi.mock('tesseract.js', () => {
  return {
    createWorker: vi.fn().mockResolvedValue({
      recognize: vi.fn().mockResolvedValue({
        data: {
          text: 'Hello World OCR text',
          confidence: 89.5,
        },
      }),
      terminate: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

describe('TesseractProvider Unit Tests', () => {
  let provider: TesseractProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExists = true;
    provider = new TesseractProvider();
  });

  it('should successfully recognize text when local traineddata is present', async () => {
    const result = await provider.recognize({
      imagePath: 'C:\\test-image.png',
      language: 'eng',
    });

    expect(result.text).toBe('Hello World OCR text');
    expect(result.confidence).toBe(89.5);
  });

  it('should throw an error when requested traineddata pack is not found locally', async () => {
    // Simulate missing language traineddata file
    mockExists = false;

    await expect(
      provider.recognize({
        imagePath: 'C:\\test-image.png',
        language: 'vie',
      })
    ).rejects.toThrow("OCR language pack 'vie' is not installed locally");
  });
});
