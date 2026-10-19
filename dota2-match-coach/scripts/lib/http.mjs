export class SourceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'SourceError';
    this.code = code;
    this.details = details;
  }
}

export async function requestJson(url, { fetchImpl = fetch, timeoutMs = 15_000, ...init } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok) {
      const code = response.status === 429 ? 'rate_limited'
        : response.status === 401 || response.status === 403 ? 'auth' : 'http';
      const details = { status: response.status };
      if (response.status === 429) details.retryAfter = response.headers.get('retry-after');
      throw new SourceError(code, `HTTP ${response.status}`, details);
    }
    if (!contentType.includes('json')) throw new SourceError('invalid_response', 'Expected JSON response');
    let data;
    try {
      data = await response.json();
    } catch {
      throw new SourceError('invalid_response', 'Invalid JSON response');
    }
    return { ok: true, status: response.status, data, headers: response.headers };
  } catch (error) {
    if (error instanceof SourceError) throw error;
    throw new SourceError(error?.name === 'AbortError' ? 'timeout' : 'network', 'Request failed');
  } finally {
    clearTimeout(timer);
  }
}

export function retryAfterMs(value, now = Date.now()) {
  if (typeof value !== 'string') return null;
  if (/^\d+$/.test(value)) return Number(value) * 1_000;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - now) : null;
}

// A failure worth one more attempt: the source is overloaded, rate-limited or
// briefly unreachable. A 4xx other than 429, a timeout and a malformed body are
// not retried: repeating them only spends the caller's deadline.
export function isTransient(error) {
  if (!(error instanceof SourceError)) return false;
  if (error.code === 'rate_limited' || error.code === 'network') return true;
  return error.code === 'http' && error.details?.status >= 500;
}

export const DEFAULT_RETRY_DELAYS_MS = [2_000, 8_000];

// Repeats a request after a transient failure. A Retry-After header wins over the
// default delay; neither may push the attempt past the caller's deadline.
export async function withRetry(attempt, {
  delaysMs = DEFAULT_RETRY_DELAYS_MS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => Date.now(),
  deadline = Infinity,
} = {}) {
  for (let index = 0; ; index += 1) {
    try {
      return await attempt();
    } catch (error) {
      if (!isTransient(error) || index >= delaysMs.length) throw error;
      const advised = error.code === 'rate_limited' ? retryAfterMs(error.details?.retryAfter, now()) : null;
      const delay = advised ?? delaysMs[index];
      if (!(delay >= 0) || now() + delay >= deadline) throw error;
      await sleep(delay);
    }
  }
}
