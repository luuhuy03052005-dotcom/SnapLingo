/**
 * Standardized response envelope for all safe IPC channels.
 * Why: Guarantees that errors do not leak stack traces to the Renderer
 * and provides a unified interface for success/error handling in React.
 */
export type AppResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

/**
 * Creates a success result envelope.
 */
export function successResult<T>(data: T): AppResult<T> {
  return { ok: true, data };
}

/**
 * Creates an error result envelope.
 */
export function errorResult(
  code: string,
  message: string,
  details?: unknown
): AppResult<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      details
    }
  };
}
