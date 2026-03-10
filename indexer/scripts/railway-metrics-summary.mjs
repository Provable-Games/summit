#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const DEFAULT_MINUTES = 10;
const DEFAULT_LINES = 2000;

function parseArgs(argv) {
  const options = {
    environment: "production",
    minutes: DEFAULT_MINUTES,
    lines: DEFAULT_LINES,
    services: [],
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--environment" || arg === "-e") {
      options.environment = argv[++i] ?? options.environment;
    } else if (arg === "--minutes" || arg === "-m") {
      options.minutes = Number(argv[++i] ?? options.minutes);
    } else if (arg === "--lines" || arg === "-n") {
      options.lines = Number(argv[++i] ?? options.lines);
    } else if (arg === "--service" || arg === "-s") {
      options.services.push(argv[++i]);
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  options.services = options.services.filter(Boolean);
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/railway-metrics-summary.mjs [options]\n\nOptions:\n  -e, --environment <name>  Railway environment (default: production)\n  -m, --minutes <n>         Lookback window in minutes (default: 10)\n  -n, --lines <n>           Max log lines per service (default: 2000)\n  -s, --service <name>      Service to query (repeatable)\n      --json                Output JSON\n  -h, --help                Show help\n`);
}

function runRailway(args) {
  const result = spawnSync("railway", args, { encoding: "utf8" });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(detail || `railway ${args.join(" ")} failed`);
  }
  return result.stdout;
}

function getServices() {
  const statusRaw = runRailway(["status", "--json"]);
  const status = JSON.parse(statusRaw);
  const services = status?.services?.edges?.map((edge) => edge?.node?.name).filter(Boolean) ?? [];

  if (services.length === 0) {
    throw new Error("No services found in linked project");
  }

  return services;
}

function parseMetric(message) {
  const marker = "METRIC resource_metric_v1 ";
  const index = message.indexOf(marker);
  if (index === -1) return null;

  const jsonPart = message.slice(index + marker.length).trim();
  try {
    return JSON.parse(jsonPart);
  } catch {
    return null;
  }
}

function parseLogOutput(raw, fallbackService) {
  const entries = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;

    try {
      const parsed = JSON.parse(line);
      const messageCandidate =
        parsed?.message ?? parsed?.msg ?? parsed?.text ?? parsed?.line ?? parsed?.log ?? "";
      const message = typeof messageCandidate === "string" ? messageCandidate : JSON.stringify(messageCandidate);
      const metric = parseMetric(message);
      if (!metric) continue;
      const timestamp = metric.timestamp ?? parsed?.timestamp ?? new Date().toISOString();
      const metricService = String(metric.service ?? fallbackService);
      entries.push({ timestamp, service: metricService, metric });
      continue;
    } catch {
      const metric = parseMetric(line);
      if (!metric) continue;
      const timestamp = metric.timestamp ?? new Date().toISOString();
      const metricService = String(metric.service ?? fallbackService);
      entries.push({ timestamp, service: metricService, metric });
    }
  }
  return entries;
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toMB(value) {
  const num = toNumber(value);
  if (num === null) return null;
  return num / (1024 * 1024);
}

function buildSummary(metrics) {
  const byService = new Map();

  for (const row of metrics) {
    if (!byService.has(row.service)) byService.set(row.service, []);
    byService.get(row.service).push(row);
  }

  const summaries = [];
  for (const [service, rows] of byService.entries()) {
    rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const latest = rows[rows.length - 1]?.metric;
    const first = rows[0]?.metric;
    if (!latest) continue;

    const rssLatestMb = toMB(latest.rss_bytes);
    const rssFirstMb = first ? toMB(first.rss_bytes) : null;
    const cpuPctValues = rows
      .map((row) => toNumber(row.metric.process_cpu_pct))
      .filter((value) => value !== null);
    const avgCpuPct =
      cpuPctValues.length > 0
        ? cpuPctValues.reduce((sum, value) => sum + value, 0) / cpuPctValues.length
        : null;

    summaries.push({
      service,
      samples: rows.length,
      timestamp: latest.timestamp ?? rows[rows.length - 1].timestamp,
      rss_mb: rssLatestMb,
      rss_delta_mb: rssLatestMb !== null && rssFirstMb !== null ? rssLatestMb - rssFirstMb : null,
      heap_mb: toMB(latest.heap_used_bytes),
      cpu_pct: toNumber(latest.process_cpu_pct),
      cpu_pct_avg_window: avgCpuPct,
      event_loop_lag_ms: toNumber(latest.event_loop_lag_ms),
      cgroup_mem_mb: toMB(latest.cgroup_mem_current_bytes),
      db_active: toNumber(latest.db_active_connections),
      db_idle: toNumber(latest.db_idle_connections),
      db_size_mb: toMB(latest.db_size_bytes),
      db_pool_waiting: toNumber(latest.db_pool_waiting),
      events_processed_total: toNumber(latest.events_processed_total),
      last_block_number: latest.last_block_number ?? null,
    });
  }

  return summaries.sort((a, b) => a.service.localeCompare(b.service));
}

function formatNumber(value, digits = 2) {
  return value === null || value === undefined ? "-" : Number(value).toFixed(digits);
}

function printTable(summaries, minutes, environment) {
  console.log(`Railway resource metric snapshot (${environment}, last ${minutes}m)`);
  if (summaries.length === 0) {
    console.log("No resource_metric_v1 lines found in the selected window.");
    return;
  }

  const header = [
    "service",
    "samples",
    "rss_mb",
    "rss_delta_mb",
    "cpu_pct",
    "cpu_avg",
    "heap_mb",
    "lag_ms",
    "cgroup_mem_mb",
    "db_active",
    "db_waiting",
    "last_block",
  ];

  console.log(header.join("\t"));
  for (const row of summaries) {
    console.log(
      [
        row.service,
        row.samples,
        formatNumber(row.rss_mb),
        formatNumber(row.rss_delta_mb),
        formatNumber(row.cpu_pct),
        formatNumber(row.cpu_pct_avg_window),
        formatNumber(row.heap_mb),
        formatNumber(row.event_loop_lag_ms),
        formatNumber(row.cgroup_mem_mb),
        formatNumber(row.db_active, 0),
        formatNumber(row.db_pool_waiting, 0),
        row.last_block_number ?? "-",
      ].join("\t")
    );
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const services = options.services.length > 0 ? options.services : getServices();

  const allMetrics = [];
  const errors = [];

  for (const service of services) {
    try {
      const raw = runRailway([
        "logs",
        "--service",
        service,
        "--environment",
        options.environment,
        "--since",
        `${options.minutes}m`,
        "--lines",
        String(options.lines),
        "--json",
      ]);
      allMetrics.push(...parseLogOutput(raw, service));
    } catch (error) {
      errors.push({ service, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const summaries = buildSummary(allMetrics);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          environment: options.environment,
          minutes: options.minutes,
          summaries,
          errors,
        },
        null,
        2
      )
    );
    return;
  }

  printTable(summaries, options.minutes, options.environment);
  if (errors.length > 0) {
    console.log("\nErrors:");
    for (const entry of errors) {
      console.log(`- ${entry.service}: ${entry.error}`);
    }
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
