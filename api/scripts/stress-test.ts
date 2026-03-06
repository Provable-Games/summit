import WebSocket from "ws";

type CounterMap = Record<string, number>;

interface Config {
  baseUrl: string;
  wsUrl: string;
  durationSec: number;
  httpConcurrency: number;
  wsConnections: number;
  requestTimeoutMs: number;
  httpPauseMs: number;
  reportEverySec: number;
  wsPingIntervalMs: number;
  weightedEndpoints: WeightedEndpoint[];
}

interface HttpMetrics {
  total: number;
  success: number;
  failed: number;
  timedOut: number;
  latencyTotalMs: number;
  latencyMinMs: number;
  latencyMaxMs: number;
  statuses: CounterMap;
}

interface WsMetrics {
  opened: number;
  closed: number;
  active: number;
  errors: number;
  messages: number;
  reconnects: number;
}

interface WeightedEndpoint {
  endpoint: string;
  weight: number;
}

const DEFAULT_ENDPOINTS = [
  "/health",
  "/beasts/stats/counts",
  "/beasts/stats/top?limit=25&offset=0",
  "/leaderboard",
  "/logs?limit=50&offset=0",
  "/quest-rewards/total",
];

const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const raw = arg.slice(2);
    if (!raw) continue;
    const eq = raw.indexOf("=");
    if (eq === -1) {
      out[raw] = "true";
      continue;
    }
    out[raw.slice(0, eq)] = raw.slice(eq + 1);
  }
  return out;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function splitList(raw: string): string[] {
  const delimiter = raw.includes(";") ? ";" : ",";
  return raw.split(delimiter).map((x) => x.trim()).filter(Boolean);
}

function hasScheme(url: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(url);
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "http://localhost:3001";
  if (hasScheme(trimmed)) return trimmed;

  if (LOCAL_HOST_RE.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

function normalizeWsUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "ws://localhost:3001/ws";
  if (hasScheme(trimmed)) return trimmed;

  return `${LOCAL_HOST_RE.test(trimmed) ? "ws" : "wss"}://${trimmed}`;
}

function parseWeightedEndpoints(raw: string): WeightedEndpoint[] {
  const items = splitList(raw);
  const parsed: WeightedEndpoint[] = [];

  for (const item of items) {
    const sepIdx = item.lastIndexOf("::");
    if (sepIdx <= 0) {
      throw new Error(
        `Invalid weighted endpoint entry "${item}". Use "<endpoint>::<weight>" and separate entries with ";" or ",".`
      );
    }

    const endpoint = item.slice(0, sepIdx).trim();
    const weightStr = item.slice(sepIdx + 2).trim();
    const weight = Math.floor(Number(weightStr));

    if (!endpoint) {
      throw new Error(`Invalid weighted endpoint entry "${item}": endpoint is empty.`);
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error(`Invalid weighted endpoint entry "${item}": weight must be a positive integer.`);
    }

    parsed.push({ endpoint, weight });
  }

  if (parsed.length === 0) {
    throw new Error("No valid weighted endpoints provided.");
  }

  return parsed;
}

function parseConfig(): Config {
  const args = parseArgs(process.argv.slice(2));
  const baseUrlRaw = args["base-url"] || process.env.STRESS_BASE_URL || "http://localhost:3001";
  const baseUrl = normalizeBaseUrl(baseUrlRaw);

  const wsUrlRaw = args["ws-url"] || process.env.STRESS_WS_URL || toWsUrl(baseUrl);
  const wsUrl = normalizeWsUrl(wsUrlRaw);

  const endpointWeightsRaw = args["endpoint-weights"] || process.env.STRESS_ENDPOINT_WEIGHTS;
  const endpointsRaw = args.endpoints || process.env.STRESS_ENDPOINTS || DEFAULT_ENDPOINTS.join(",");
  const endpoints = splitList(endpointsRaw);
  if (endpoints.length === 0 && !endpointWeightsRaw) {
    throw new Error("No endpoints configured. Use --endpoints or --endpoint-weights.");
  }

  const weightedEndpoints = endpointWeightsRaw
    ? parseWeightedEndpoints(endpointWeightsRaw)
    : endpoints.map((endpoint) => ({ endpoint, weight: 1 }));

  return {
    baseUrl,
    wsUrl,
    durationSec: Math.max(5, parseNumber(args["duration-sec"] || process.env.STRESS_DURATION_SEC, 60)),
    httpConcurrency: Math.max(
      1,
      Math.floor(parseNumber(args["http-concurrency"] || process.env.STRESS_HTTP_CONCURRENCY, 10))
    ),
    wsConnections: Math.max(
      0,
      Math.floor(parseNumber(args["ws-connections"] || process.env.STRESS_WS_CONNECTIONS, 25))
    ),
    requestTimeoutMs: Math.max(
      250,
      Math.floor(parseNumber(args["request-timeout-ms"] || process.env.STRESS_REQUEST_TIMEOUT_MS, 4000))
    ),
    httpPauseMs: Math.max(
      0,
      Math.floor(parseNumber(args["http-pause-ms"] || process.env.STRESS_HTTP_PAUSE_MS, 0))
    ),
    reportEverySec: Math.max(
      1,
      Math.floor(parseNumber(args["report-every-sec"] || process.env.STRESS_REPORT_EVERY_SEC, 5))
    ),
    wsPingIntervalMs: Math.max(
      1000,
      Math.floor(parseNumber(args["ws-ping-interval-ms"] || process.env.STRESS_WS_PING_INTERVAL_MS, 10000))
    ),
    weightedEndpoints,
  };
}

function toWsUrl(baseUrl: string): string {
  if (baseUrl.startsWith("https://")) return `${baseUrl.replace(/^https:\/\//, "wss://")}/ws`;
  if (baseUrl.startsWith("http://")) return `${baseUrl.replace(/^http:\/\//, "ws://")}/ws`;
  return `${baseUrl}/ws`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickWeightedEndpoint(items: WeightedEndpoint[]): string {
  const totalWeight = items.reduce((acc, item) => acc + item.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const item of items) {
    cursor -= item.weight;
    if (cursor < 0) {
      return item.endpoint;
    }
  }

  return items[items.length - 1].endpoint;
}

function toHttpUrl(baseUrl: string, endpoint: string): string {
  if (hasScheme(endpoint)) return endpoint;
  const normalizedPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return new URL(normalizedPath, `${baseUrl}/`).toString();
}

function recordHttpResult(
  metrics: HttpMetrics,
  elapsedMs: number,
  statusKey: string,
  ok: boolean,
  timedOut = false
): void {
  metrics.total += 1;
  metrics.latencyTotalMs += elapsedMs;
  metrics.latencyMinMs = Math.min(metrics.latencyMinMs, elapsedMs);
  metrics.latencyMaxMs = Math.max(metrics.latencyMaxMs, elapsedMs);
  metrics.statuses[statusKey] = (metrics.statuses[statusKey] || 0) + 1;

  if (ok) {
    metrics.success += 1;
    return;
  }

  metrics.failed += 1;
  if (timedOut) {
    metrics.timedOut += 1;
  }
}

function printUsage(): void {
  console.log("Usage:");
  console.log("  npm run stress:test -- --base-url=https://your-api --duration-sec=60");
  console.log("");
  console.log("Options:");
  console.log("  --base-url=http://localhost:3001");
  console.log("  --ws-url=ws://localhost:3001/ws");
  console.log("  --duration-sec=60");
  console.log("  --http-concurrency=10");
  console.log("  --ws-connections=25");
  console.log("  --request-timeout-ms=4000");
  console.log("  --http-pause-ms=0");
  console.log("  --report-every-sec=5");
  console.log("  --ws-ping-interval-ms=10000");
  console.log("  --endpoints=/health,/leaderboard,/logs?limit=20&offset=0");
  console.log("  --endpoint-weights=/leaderboard::6;/diplomacy?prefix=64&suffix=18::4;/beasts/stats/counts::2");
}

async function run(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const config = parseConfig();
  const startedAt = Date.now();
  const endsAt = startedAt + config.durationSec * 1000;
  const isRunning = (): boolean => !stopping && Date.now() < endsAt;

  const http: HttpMetrics = {
    total: 0,
    success: 0,
    failed: 0,
    timedOut: 0,
    latencyTotalMs: 0,
    latencyMinMs: Number.POSITIVE_INFINITY,
    latencyMaxMs: 0,
    statuses: {},
  };

  const ws: WsMetrics = {
    opened: 0,
    closed: 0,
    active: 0,
    errors: 0,
    messages: 0,
    reconnects: 0,
  };

  let stopping = false;
  const stop = () => {
    stopping = true;
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  const socketState = new Map<
    number,
    {
      socket: WebSocket;
      pingTimer?: ReturnType<typeof setInterval>;
      reconnectTimer?: ReturnType<typeof setTimeout>;
    }
  >();

  const reporter = setInterval(() => {
    const elapsedSec = (Date.now() - startedAt) / 1000;
    const reqRate = elapsedSec > 0 ? http.total / elapsedSec : 0;
    const avgLatency = http.total > 0 ? http.latencyTotalMs / http.total : 0;

    console.log(
      `[report ${elapsedSec.toFixed(1)}s] http total=${http.total} ok=${http.success} fail=${http.failed}` +
        ` timeout=${http.timedOut} rps=${reqRate.toFixed(1)} lat(avg/min/max)=${avgLatency.toFixed(1)}` +
        `/${Number.isFinite(http.latencyMinMs) ? http.latencyMinMs.toFixed(1) : "0.0"}/${http.latencyMaxMs.toFixed(1)}ms` +
        ` ws active=${ws.active} opened=${ws.opened} closed=${ws.closed} msg=${ws.messages} err=${ws.errors}`
    );
  }, config.reportEverySec * 1000);

  const openWs = (id: number): void => {
    if (!isRunning()) return;

    const socket = new WebSocket(config.wsUrl);
    const state: {
      socket: WebSocket;
      pingTimer?: ReturnType<typeof setInterval>;
      reconnectTimer?: ReturnType<typeof setTimeout>;
    } = { socket };
    socketState.set(id, state);

    socket.on("open", () => {
      ws.opened += 1;
      ws.active += 1;

      socket.send(
        JSON.stringify({
          type: "subscribe",
          channels: ["summit", "event"],
        })
      );

      const timer = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "ping" }));
        }
      }, config.wsPingIntervalMs);

      state.pingTimer = timer;
    });

    socket.on("message", () => {
      ws.messages += 1;
    });

    socket.on("error", () => {
      ws.errors += 1;
    });

    socket.on("close", () => {
      ws.closed += 1;
      ws.active = Math.max(0, ws.active - 1);
      if (state.pingTimer) {
        clearInterval(state.pingTimer);
        state.pingTimer = undefined;
      }

      if (isRunning()) {
        ws.reconnects += 1;
        state.reconnectTimer = setTimeout(() => openWs(id), 500);
      }
    });
  };

  for (let i = 0; i < config.wsConnections; i++) {
    openWs(i);
  }

  async function httpWorker(): Promise<void> {
    while (isRunning()) {
      const endpoint = pickWeightedEndpoint(config.weightedEndpoints);
      const url = toHttpUrl(config.baseUrl, endpoint);
      const requestStarted = Date.now();

      try {
        const response = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(config.requestTimeoutMs),
          headers: {
            "accept": "application/json",
          },
        });

        // Consume body so connections are released promptly.
        await response.arrayBuffer();
        const elapsed = Date.now() - requestStarted;
        recordHttpResult(http, elapsed, String(response.status), response.ok);
      } catch (error) {
        const elapsed = Date.now() - requestStarted;
        const name = error instanceof Error ? error.name : "UnknownError";
        const isTimeout = name === "AbortError" || name === "TimeoutError";
        recordHttpResult(http, elapsed, isTimeout ? "timeout" : name, false, isTimeout);
      }

      if (config.httpPauseMs > 0) {
        await sleep(config.httpPauseMs);
      }
    }
  }

  console.log("Starting API stress test with config:");
  console.log(JSON.stringify(config, null, 2));

  const workers = Array.from({ length: config.httpConcurrency }, () => httpWorker());
  await Promise.all(workers);

  stopping = true;
  clearInterval(reporter);
  process.off("SIGINT", stop);
  process.off("SIGTERM", stop);

  for (const state of socketState.values()) {
    if (state.pingTimer) {
      clearInterval(state.pingTimer);
    }
    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
    }
    try {
      state.socket.close();
    } catch {
      // Ignore close errors.
    }
  }
  socketState.clear();

  const elapsedSec = (Date.now() - startedAt) / 1000;
  const avgLatency = http.total > 0 ? http.latencyTotalMs / http.total : 0;
  const reqRate = elapsedSec > 0 ? http.total / elapsedSec : 0;

  console.log("\n--- Stress Test Summary ---");
  console.log(`Elapsed: ${elapsedSec.toFixed(2)}s`);
  console.log(`HTTP requests: ${http.total}`);
  console.log(`HTTP success: ${http.success}`);
  console.log(`HTTP failed: ${http.failed}`);
  console.log(`HTTP timeouts: ${http.timedOut}`);
  console.log(`HTTP throughput: ${reqRate.toFixed(2)} req/s`);
  console.log(
    `HTTP latency avg/min/max: ${avgLatency.toFixed(2)}/${Number.isFinite(http.latencyMinMs) ? http.latencyMinMs.toFixed(2) : "0.00"}/${http.latencyMaxMs.toFixed(2)} ms`
  );
  console.log(`WS opened: ${ws.opened}`);
  console.log(`WS closed: ${ws.closed}`);
  console.log(`WS active (final): ${ws.active}`);
  console.log(`WS reconnects: ${ws.reconnects}`);
  console.log(`WS messages: ${ws.messages}`);
  console.log(`WS errors: ${ws.errors}`);
  console.log(`HTTP status/error counts: ${JSON.stringify(http.statuses)}`);
}

run().catch((error) => {
  console.error("Stress test crashed:", error);
  process.exit(1);
});
