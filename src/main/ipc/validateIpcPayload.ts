import { z } from 'zod';
import { LoggingService } from '../../infra/logging/LoggingService';
import { errorResult, AppResult } from '../../shared/result';

/**
 * Validates a payload against a Zod schema and returns a structured AppResult.
 * Why: Secures the Main process from invalid data inputs sent by Preload/Renderer.
 */
export function validateIpcPayload<T>(
  schema: z.ZodSchema<T>,
  payload: unknown,
  channelName: string
): { success: true; data: T } | { success: false; result: AppResult<never> } {
  const parseResult = schema.safeParse(payload);

  if (parseResult.success) {
    return { success: true, data: parseResult.data };
  }

  // Log strict validation errors on Main for diagnostics, returning safe user-facing envelopes
  const errorDetails = parseResult.error.format();
  LoggingService.warn(`IPC Validation failed on channel [${channelName}]. Input: ${JSON.stringify(payload)}. Details:`, errorDetails);

  return {
    success: false,
    result: errorResult(
      'INVALID_PAYLOAD',
      `Invalid parameter payload provided on channel ${channelName}`,
      errorDetails
    )
  };
}
