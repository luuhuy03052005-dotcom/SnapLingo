/**
 * Normalized translation error codes.
 * Why: Ensures consistent, user-friendly error handling across all providers.
 */
export enum TranslationErrorCode {
  EMPTY_INPUT = 'EMPTY_INPUT',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNSUPPORTED_LANGUAGE = 'UNSUPPORTED_LANGUAGE',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN = 'UNKNOWN'
}

export class TranslationError extends Error {
  constructor(
    public code: TranslationErrorCode,
    message: string,
    public provider: string
  ) {
    super(message);
    this.name = 'TranslationError';
  }

  /** User-friendly error message */
  get userMessage(): string {
    switch (this.code) {
      case TranslationErrorCode.EMPTY_INPUT:
        return 'Please enter some text to translate.';
      case TranslationErrorCode.PROVIDER_UNAVAILABLE:
        return `Translation provider (${this.provider}) is currently unavailable. Check Settings > Provider.`;
      case TranslationErrorCode.NETWORK_ERROR:
        return 'Network connection failed. Please check your internet connection.';
      case TranslationErrorCode.UNSUPPORTED_LANGUAGE:
        return 'This language combination is not supported by the current provider.';
      case TranslationErrorCode.RATE_LIMITED:
        return 'Too many requests. Please wait a moment and try again.';
      default:
        return `Translation failed: ${this.message}`;
    }
  }
}
