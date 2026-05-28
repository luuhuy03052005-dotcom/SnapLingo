import { describe, it, expect } from 'vitest';
import { CompromiseNLPProvider } from './CompromiseNLPProvider';

describe('CompromiseNLPProvider Unit Tests', () => {
  it('should identify basic English parts of speech', async () => {
    const provider = new CompromiseNLPProvider();
    const tokens = await provider.analyze('The quick brown fox jumps over the lazy dog.');

    // Find specific words and assert POS
    const foxToken = tokens.find(t => t.text === 'fox');
    const jumpsToken = tokens.find(t => t.text === 'jumps');

    expect(foxToken).toBeDefined();
    expect(foxToken?.category).toBe('noun');

    expect(jumpsToken).toBeDefined();
    expect(jumpsToken?.category).toBe('verb');
  });

  it('should preserve 100% of formatting, spacing, and punctuation', async () => {
    const provider = new CompromiseNLPProvider();
    const originalText = 'Hello,   world!\nThis is a test.';
    const tokens = await provider.analyze(originalText);

    // Reconstruct string
    const reconstructedText = tokens.map(t => t.text).join('');
    expect(reconstructedText).toBe(originalText);
  });
});
