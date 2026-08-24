import { z } from 'zod';

export const ApiErrorCode = z.enum([
  'validation',
  'unauthorized',
  'forbidden',
  'not_found',
  'version_conflict',
  'too_large',
  'rate_limited',
  'unknown',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

export const ApiErrorBody = z.object({
  error: z.object({
    code: ApiErrorCode,
    message: z.string(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

export const ERROR_STATUS: Record<ApiErrorCode, number> = {
  validation: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  version_conflict: 409,
  too_large: 413,
  rate_limited: 429,
  unknown: 500,
};
