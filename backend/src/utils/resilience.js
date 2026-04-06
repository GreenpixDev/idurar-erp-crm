'use strict';

const CircuitBreaker = require('opossum');
const { client: prom, register } = require('../metrics');

// ── Prometheus metrics ────────────────────────────────────────────────────────

const retryTotal = new prom.Counter({
  name: 'resilience_retry_total',
  help: 'Total number of retry attempts per operation',
  labelNames: ['label', 'attempt'],
  registers: [register],
});

const cbState = new prom.Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state: 0=closed, 1=open, 2=half-open',
  labelNames: ['name'],
  registers: [register],
});

const cbRequestsTotal = new prom.Counter({
  name: 'circuit_breaker_requests_total',
  help: 'Total circuit breaker requests by outcome',
  labelNames: ['name', 'outcome'],
  registers: [register],
});

// ── Breaker registry ──────────────────────────────────────────────────────────

const breakers = new Map();

// ── TimeoutError ──────────────────────────────────────────────────────────────

class TimeoutError extends Error {
  constructor(label, ms) {
    super(`[resilience] ${label} timed out after ${ms}ms`);
    this.name = 'TimeoutError';
    this.code = 'ETIMEDOUT';
  }
}

// ── withTimeout ───────────────────────────────────────────────────────────────

/**
 * Runs `fn()` and rejects with TimeoutError if it takes longer than `ms`.
 * @param {() => Promise<any>} fn
 * @param {number} ms
 * @param {string} label
 */
async function withTimeout(fn, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// ── withRetry ─────────────────────────────────────────────────────────────────

const TRANSIENT_CODES = new Set(['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'EPIPE']);

function defaultRetryOn(err) {
  // Never retry open-circuit rejections or client errors
  if (err.code === 'EOPENBREAKER') return false;
  if (err.response && err.response.status < 500) return false;
  // Retry on transient network/timeout errors
  if (TRANSIENT_CODES.has(err.code)) return true;
  // Retry on rate-limit or server unavailable
  if (err.response && (err.response.status === 429 || err.response.status === 503)) return true;
  return false;
}

/**
 * Retries `fn()` with exponential backoff + jitter.
 * @param {() => Promise<any>} fn
 * @param {{ attempts?: number, baseDelayMs?: number, maxDelayMs?: number, label?: string, retryOn?: (err: Error) => boolean }} opts
 */
async function withRetry(fn, opts = {}) {
  const {
    attempts = 3,
    baseDelayMs = 200,
    maxDelayMs = 5_000,
    label = 'operation',
    retryOn = defaultRetryOn,
  } = opts;

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === attempts || !retryOn(err)) throw err;
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1) + Math.random() * 100, maxDelayMs);
      retryTotal.inc({ label, attempt: String(attempt) });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ── createBreaker ─────────────────────────────────────────────────────────────

/**
 * Creates an opossum circuit breaker wrapping `fn`, registers it in the
 * global registry, and wires Prometheus metrics to its lifecycle events.
 * @param {string} name
 * @param {(...args: any[]) => Promise<any>} fn
 * @param {{ errorThresholdPercentage?: number, resetTimeout?: number, volumeThreshold?: number }} opts
 */
function createBreaker(name, fn, opts = {}) {
  const breaker = new CircuitBreaker(fn, {
    timeout: false, // timeout handled externally via withTimeout
    errorThresholdPercentage: opts.errorThresholdPercentage ?? 50,
    resetTimeout: opts.resetTimeout ?? 30_000,
    volumeThreshold: opts.volumeThreshold ?? 5,
    name,
  });

  // Initialize state gauge to 0 (closed)
  cbState.set({ name }, 0);

  breaker.on('close',    () => cbState.set({ name }, 0));
  breaker.on('open',     () => cbState.set({ name }, 1));
  breaker.on('halfOpen', () => cbState.set({ name }, 2));

  breaker.on('success', () => cbRequestsTotal.inc({ name, outcome: 'success' }));
  breaker.on('failure', () => cbRequestsTotal.inc({ name, outcome: 'failure' }));
  breaker.on('reject',  () => cbRequestsTotal.inc({ name, outcome: 'rejected' }));
  breaker.on('timeout', () => cbRequestsTotal.inc({ name, outcome: 'timeout' }));

  breakers.set(name, breaker);
  return breaker;
}

// ── getBreakerStats ───────────────────────────────────────────────────────────

/**
 * Returns a snapshot of all registered circuit breakers' state and stats.
 * @returns {{ [name: string]: { state: string, stats: object } }}
 */
function getBreakerStats() {
  const result = {};
  for (const [name, breaker] of breakers) {
    result[name] = {
      state: breaker.opened ? 'open' : breaker.halfOpen ? 'half_open' : 'closed',
      stats: breaker.stats,
    };
  }
  return result;
}

module.exports = { withTimeout, withRetry, createBreaker, getBreakerStats, TimeoutError };
