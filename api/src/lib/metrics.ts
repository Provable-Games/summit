// NOTE: Keep this file byte-for-byte in sync between:
// api/src/lib/metrics.ts and indexer/src/lib/metrics.ts
// Verify with: node scripts/check-metrics-sync.mjs
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";

type MetricPrimitive = string | number | boolean | null;
type MetricRecord = Record<string, MetricPrimitive>;

export interface ResourceMetricsOptions {
  service: string;
  environment?: string;
  intervalMs?: number;
  dbProbeIntervalMs?: number;
  dbPoolStats?: () => { total: number; idle: number; waiting: number } | null;
  dbProbe?: () => Promise<Record<string, number | null>>;
  getExtraMetrics?: () => MetricRecord;
  log?: (line: string) => void;
}

interface CgroupPaths {
  memCurrent?: string;
  memMax?: string;
  cpuStat?: string;
  cpuUsageNs?: string;
}

const cgroupPaths: CgroupPaths = detectCgroupPaths();

export function isMetricsEnabled(): boolean {
  const raw = process.env.METRICS_ENABLED?.trim().toLowerCase();
  if (!raw) return process.env.NODE_ENV === "production";
  return !(raw === "0" || raw === "false" || raw === "off" || raw === "no");
}

function safeInterval(envValue: string | undefined, optionValue: number | undefined, fallback: number): number {
  const raw = Number(envValue || optionValue || fallback);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function startResourceMetrics(options: ResourceMetricsOptions): { stop: () => void } {
  const intervalMs = safeInterval(process.env.METRICS_INTERVAL_MS, options.intervalMs, 30_000);
  const dbProbeIntervalMs = safeInterval(process.env.DB_METRICS_INTERVAL_MS, options.dbProbeIntervalMs, 60_000);
  const log = options.log ?? console.log;

  let inFlight = false;
  let expectedTick = Date.now() + intervalMs;
  let previousCpu = process.cpuUsage();
  let previousWallNs = process.hrtime.bigint();
  let nextDbProbeAt = Date.now();
  let lastDbMetrics: Record<string, number | null> = {};

  const timer = setInterval(async () => {
    if (inFlight) return;
    inFlight = true;

    try {
      const now = Date.now();
      const loopLagMs = Math.max(0, now - expectedTick);
      expectedTick = now + intervalMs;

      const currentWallNs = process.hrtime.bigint();
      const elapsedNs = Number(currentWallNs - previousWallNs);
      previousWallNs = currentWallNs;

      const currentCpu = process.cpuUsage();
      const cpuUsage = {
        user: currentCpu.user - previousCpu.user,
        system: currentCpu.system - previousCpu.system,
      };
      previousCpu = currentCpu;
      const cpuMicros = cpuUsage.user + cpuUsage.system;
      const cpuPct = elapsedNs > 0 ? (cpuMicros / (elapsedNs / 1_000)) * 100 : null;

      if (options.dbProbe && now >= nextDbProbeAt) {
        nextDbProbeAt = now + dbProbeIntervalMs;
        try {
          lastDbMetrics = await options.dbProbe();
        } catch {
          lastDbMetrics = {
            ...lastDbMetrics,
            db_probe_error: 1,
          };
        }
      }

      const memory = process.memoryUsage();
      const cgroup = readCgroupStats();
      const poolStats = options.dbPoolStats?.() ?? null;

      const payload: MetricRecord = {
        schema: "resource_metric_v1",
        service: options.service,
        environment:
          options.environment ??
          process.env.RAILWAY_ENVIRONMENT_NAME ??
          process.env.NODE_ENV ??
          "unknown",
        timestamp: new Date().toISOString(),
        uptime_s: Math.round(process.uptime()),
        cpu_cores: os.cpus().length,
        process_cpu_pct: cpuPct === null ? null : round(cpuPct, 2),
        event_loop_lag_ms: round(loopLagMs, 2),
        rss_bytes: memory.rss,
        heap_used_bytes: memory.heapUsed,
        heap_total_bytes: memory.heapTotal,
        external_bytes: memory.external,
        array_buffers_bytes: memory.arrayBuffers,
        cgroup_mem_current_bytes: cgroup.memCurrent,
        cgroup_mem_max_bytes: cgroup.memMax,
        cgroup_cpu_usage_usec: cgroup.cpuUsageUsec,
        cgroup_cpu_throttled_usec: cgroup.cpuThrottledUsec,
        db_pool_total: poolStats?.total ?? null,
        db_pool_idle: poolStats?.idle ?? null,
        db_pool_waiting: poolStats?.waiting ?? null,
      };

      for (const [key, value] of Object.entries(lastDbMetrics)) {
        payload[key] = value;
      }

      if (options.getExtraMetrics) {
        const extras = options.getExtraMetrics();
        for (const [key, value] of Object.entries(extras)) {
          if (
            value === null ||
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
          ) {
            payload[key] = value;
          }
        }
      }

      log(`METRIC resource_metric_v1 ${JSON.stringify(payload)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`METRIC resource_metric_v1 ${JSON.stringify({ schema: "resource_metric_v1", service: options.service, metric_error: message, timestamp: new Date().toISOString() })}`);
    } finally {
      inFlight = false;
    }
  }, intervalMs);

  timer.unref?.();

  return {
    stop: () => clearInterval(timer),
  };
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function detectCgroupPaths(): CgroupPaths {
  const paths: CgroupPaths = {};

  if (existsSync("/sys/fs/cgroup/memory.current")) {
    paths.memCurrent = "/sys/fs/cgroup/memory.current";
  } else if (existsSync("/sys/fs/cgroup/memory/memory.usage_in_bytes")) {
    paths.memCurrent = "/sys/fs/cgroup/memory/memory.usage_in_bytes";
  }

  if (existsSync("/sys/fs/cgroup/memory.max")) {
    paths.memMax = "/sys/fs/cgroup/memory.max";
  } else if (existsSync("/sys/fs/cgroup/memory/memory.limit_in_bytes")) {
    paths.memMax = "/sys/fs/cgroup/memory/memory.limit_in_bytes";
  }

  if (existsSync("/sys/fs/cgroup/cpu.stat")) {
    paths.cpuStat = "/sys/fs/cgroup/cpu.stat";
  } else if (existsSync("/sys/fs/cgroup/cpu/cpu.stat")) {
    paths.cpuStat = "/sys/fs/cgroup/cpu/cpu.stat";
  }

  if (existsSync("/sys/fs/cgroup/cpuacct.usage")) {
    paths.cpuUsageNs = "/sys/fs/cgroup/cpuacct.usage";
  }

  return paths;
}

function readCgroupStats(): {
  memCurrent: number | null;
  memMax: number | null;
  cpuUsageUsec: number | null;
  cpuThrottledUsec: number | null;
} {
  const memCurrent = readNumber(cgroupPaths.memCurrent);
  const memMax = readNumber(cgroupPaths.memMax);

  let cpuUsageUsec: number | null = null;
  let cpuThrottledUsec: number | null = null;

  if (cgroupPaths.cpuStat) {
    const stat = parseCpuStat(cgroupPaths.cpuStat);
    cpuUsageUsec = stat.usageUsec;
    cpuThrottledUsec = stat.throttledUsec;
  } else if (cgroupPaths.cpuUsageNs) {
    const usageNs = readNumber(cgroupPaths.cpuUsageNs);
    cpuUsageUsec = usageNs === null ? null : Math.round(usageNs / 1_000);
  }

  return {
    memCurrent,
    memMax,
    cpuUsageUsec,
    cpuThrottledUsec,
  };
}

function parseCpuStat(path: string): { usageUsec: number | null; throttledUsec: number | null } {
  try {
    const content = readFileSync(path, "utf8");
    const lines = content.split(/\r?\n/);
    let usageUsec: number | null = null;
    let throttledUsec: number | null = null;

    for (const line of lines) {
      const [key, rawValue] = line.trim().split(/\s+/);
      if (!key || !rawValue) continue;
      const value = Number(rawValue);
      if (!Number.isFinite(value)) continue;

      if (key === "usage_usec") usageUsec = value;
      if (key === "throttled_usec") throttledUsec = value;
      if (key === "throttled_time") throttledUsec = Math.round(value / 1_000);
    }

    return { usageUsec, throttledUsec };
  } catch {
    return { usageUsec: null, throttledUsec: null };
  }
}

function readNumber(path?: string): number | null {
  if (!path) return null;
  try {
    const value = readFileSync(path, "utf8").trim();
    if (!value || value === "max") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
