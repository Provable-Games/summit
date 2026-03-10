import type { MiddlewareHandler } from "hono";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogMeta = Record<string, unknown>;

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL: LogLevel = process.env.NODE_ENV === "production"
  ? "info"
  : process.env.NODE_ENV === "test"
    ? "warn"
    : "debug";
const configuredLevel = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined) ?? DEFAULT_LEVEL;
const currentLevel = LEVEL_WEIGHT[configuredLevel] ? configuredLevel : DEFAULT_LEVEL;
const service = process.env.RAILWAY_SERVICE_NAME ?? "summit-api";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[currentLevel];
}

function toSerializable(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map(toSerializable);
  }

  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === "undefined") continue;
      out[key] = toSerializable(child);
    }
    return out;
  }

  return String(value);
}

function emit(level: LogLevel, msg: string, meta?: LogMeta): void {
  if (!shouldLog(level)) return;

  const payload = {
    ts: new Date().toISOString(),
    level,
    service,
    msg,
    ...(meta ? (toSerializable(meta) as LogMeta) : {}),
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const log = {
  debug: (msg: string, meta?: LogMeta) => emit("debug", msg, meta),
  info: (msg: string, meta?: LogMeta) => emit("info", msg, meta),
  warn: (msg: string, meta?: LogMeta) => emit("warn", msg, meta),
  error: (msg: string, meta?: LogMeta) => emit("error", msg, meta),
};

export function parsePositiveInt(input: string | undefined, fallback: number): number {
  if (!input) return fallback;
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function parseProbability(input: string | undefined, fallback: number): number {
  if (!input) return fallback;
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed <= 0) return 0;
  if (parsed >= 1) return 1;
  return parsed;
}

export function createRequestLogMiddleware(): MiddlewareHandler {
  const sampleRate = parseProbability(
    process.env.REQUEST_LOG_SAMPLE_RATE,
    process.env.NODE_ENV === "production" ? 0.01 : 1
  );
  const slowMs = parsePositiveInt(process.env.REQUEST_LOG_SLOW_MS, 1500);

  return async (c, next) => {
    const started = Date.now();
    await next();

    const durationMs = Date.now() - started;
    const status = c.res.status;
    const isServerError = status >= 500;
    const isClientError = status >= 400 && status < 500;
    const isSlow = durationMs >= slowMs;
    const sampled = Math.random() < sampleRate;

    if (!isServerError && !isClientError && !isSlow && !sampled) {
      return;
    }

    const level: LogLevel = isServerError ? "error" : isClientError ? "warn" : "info";
    emit(level, "http_request", {
      method: c.req.method,
      path: c.req.path,
      status,
      duration_ms: durationMs,
      request_id: c.req.header("x-request-id") ?? null,
    });
  };
}
