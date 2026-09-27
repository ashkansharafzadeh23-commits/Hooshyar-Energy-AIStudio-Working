/**
 * External Error Log Redaction (PH-4)
 * Sanitizes external error objects and response payloads before logging.
 * Strictly prevents dumping raw upstream response bodies, authorization headers,
 * internal provider keys, or verbose JSON payloads into production logs.
 */

export interface SafeExternalErrorMetadata {
  provider: string;
  httpStatus?: number;
  requestId?: string;
  errorCategory: 
    | 'TIMEOUT' 
    | 'CIRCUIT_OPEN' 
    | 'NETWORK_ERROR' 
    | 'RATE_LIMITED' 
    | 'AUTHENTICATION_ERROR' 
    | 'BAD_REQUEST' 
    | 'NOT_FOUND' 
    | 'SERVER_ERROR' 
    | 'UNAVAILABLE'
    | 'DATA_UNAVAILABLE'
    | 'UNKNOWN';
  isTransient: boolean;
  safeSummary: string;
}

export function extractSafeExternalErrorMetadata(
  provider: string,
  error: any,
  requestId?: string
): SafeExternalErrorMetadata {
  if (!error) {
    return {
      provider,
      requestId,
      errorCategory: 'UNKNOWN',
      isTransient: false,
      safeSummary: `${provider} operation failed with unknown error`,
    };
  }

  // Extract HTTP status code if available
  let httpStatus: number | undefined;
  if (typeof error.status === 'number') {
    httpStatus = error.status;
  } else if (typeof error.statusCode === 'number') {
    httpStatus = error.statusCode;
  } else if (error.response && typeof error.response.status === 'number') {
    httpStatus = error.response.status;
  } else if (typeof error.message === 'string') {
    const statusMatch = error.message.match(/status\s*(?:code\s*)?[:=]?\s*(\d{3})/i) ||
                        error.message.match(/HTTP\s+(\d{3})/i) ||
                        error.message.match(/"code":\s*(\d{3})/);
    if (statusMatch) {
      httpStatus = parseInt(statusMatch[1], 10);
    }
  }

  // Determine category and transient status
  let errorCategory: SafeExternalErrorMetadata['errorCategory'] = 'UNKNOWN';
  let isTransient = false;

  const msg = String(error.message || '').toLowerCase();
  const errCode = String(error.code || '').toUpperCase();
  const errName = String(error.name || '');

  if (errCode === 'EXTERNAL_SERVICE_TIMEOUT' || errCode === 'ETIMEDOUT' || errName === 'AbortError' || msg.includes('timeout')) {
    errorCategory = 'TIMEOUT';
    isTransient = true;
  } else if (errName.includes('CircuitBreakerOpen') || msg.includes('circuit breaker is open') || msg.includes('circuit open')) {
    errorCategory = 'CIRCUIT_OPEN';
    isTransient = true;
  } else if (['ECONNRESET', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENOTFOUND', 'EPIPE'].includes(errCode) || msg.includes('fetch failed') || msg.includes('network error')) {
    errorCategory = 'NETWORK_ERROR';
    isTransient = true;
  } else if (httpStatus === 429 || msg.includes('quota') || msg.includes('rate limit')) {
    errorCategory = 'RATE_LIMITED';
    isTransient = true;
  } else if (httpStatus === 401 || httpStatus === 403 || msg.includes('unauthorized') || msg.includes('forbidden')) {
    errorCategory = 'AUTHENTICATION_ERROR';
    isTransient = false;
  } else if (httpStatus === 404 || msg.includes('not found')) {
    errorCategory = 'NOT_FOUND';
    isTransient = false;
  } else if (httpStatus === 400 || msg.includes('bad request')) {
    errorCategory = 'BAD_REQUEST';
    isTransient = false;
  } else if (httpStatus && httpStatus >= 500) {
    errorCategory = 'SERVER_ERROR';
    isTransient = [502, 503, 504].includes(httpStatus);
  } else if (errCode === 'EXTERNAL_SERVICE_UNAVAILABLE' || msg.includes('unavailable')) {
    errorCategory = 'UNAVAILABLE';
    isTransient = true;
  }

  const statusPart = httpStatus ? ` (HTTP ${httpStatus})` : '';
  const safeSummary = `${provider} request failed: category=${errorCategory}${statusPart}`;

  return {
    provider,
    httpStatus,
    requestId,
    errorCategory,
    isTransient,
    safeSummary
  };
}
