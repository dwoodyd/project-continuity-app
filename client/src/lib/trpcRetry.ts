const RETRY_BASE_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 30_000;
const RETRY_AFTER_MAX_MS = 5 * 60_000;
const MAX_QUERY_RETRIES = 3;
const MAX_RATE_LIMIT_MUTATION_RETRIES = 2;

type HeadersLike = {
  get?: (name: string) => string | null;
} | Record<string, string | string[] | undefined>;

type TrpcResponseLike = {
  status?: number;
  headers?: HeadersLike;
};

type TrpcErrorLike = {
  data?: { httpStatus?: number; code?: string };
  meta?: { response?: TrpcResponseLike };
};

type HeaderRecord = Record<string, string | string[] | undefined>;

function responseFor(error: unknown): TrpcResponseLike | undefined {
  if (!error || typeof error !== "object") return undefined;
  return (error as TrpcErrorLike).meta?.response;
}

function retryAfterHeader(error: unknown): string | undefined {
  const headers = responseFor(error)?.headers;
  if (!headers) return undefined;
  if (typeof headers.get === "function") return headers.get("Retry-After") ?? undefined;
  const value = (headers as HeaderRecord)["retry-after"] ?? (headers as HeaderRecord)["Retry-After"];
  return Array.isArray(value) ? value[0] : value;
}

/** Returns true for a tRPC response that was throttled by the server. */
export function isRateLimitedTrpcError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as TrpcErrorLike;
  return candidate.data?.httpStatus === 429
    || candidate.data?.code === "TOO_MANY_REQUESTS"
    || responseFor(error)?.status === 429;
}

/**
 * Returns a valid Retry-After delay in milliseconds. Both delta-seconds and HTTP
 * date forms are supported, and malformed or excessive values are ignored.
 */
export function getRetryAfterMs(error: unknown, now = Date.now()): number | undefined {
  const raw = retryAfterHeader(error)?.trim();
  if (!raw) return undefined;

  if (/^\d+$/.test(raw)) {
    const delay = Number(raw) * 1_000;
    return Number.isFinite(delay) && delay <= RETRY_AFTER_MAX_MS ? delay : undefined;
  }

  const retryAt = Date.parse(raw);
  if (Number.isNaN(retryAt)) return undefined;
  const delay = Math.max(0, retryAt - now);
  return delay <= RETRY_AFTER_MAX_MS ? delay : undefined;
}

/** Applies server Retry-After first, otherwise uses bounded exponential backoff. */
export function getTrpcRetryDelay(attempt: number, error: unknown): number {
  const exponentialDelay = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  return Math.max(getRetryAfterMs(error) ?? 0, exponentialDelay);
}

/** Queries retain bounded retries, and always back off rather than hammering a 429. */
export function shouldRetryTrpcQuery(failureCount: number, error: unknown): boolean {
  if (isRateLimitedTrpcError(error)) return failureCount < MAX_QUERY_RETRIES;
  return failureCount < MAX_QUERY_RETRIES;
}

/** Mutations normally never retry; a known 429 is safe to retry a bounded number of times. */
export function shouldRetryTrpcMutation(failureCount: number, error: unknown): boolean {
  return isRateLimitedTrpcError(error) && failureCount < MAX_RATE_LIMIT_MUTATION_RETRIES;
}

export const TRPC_RETRY_LIMITS = {
  query: MAX_QUERY_RETRIES,
  rateLimitedMutation: MAX_RATE_LIMIT_MUTATION_RETRIES,
} as const;
