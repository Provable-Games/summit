import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const poolOn = vi.fn();
  const poolConnect = vi.fn();
  const poolCtor = vi.fn();
  const drizzle = vi.fn(() => ({ mocked: true }));

  return {
    poolOn,
    poolConnect,
    poolCtor,
    drizzle,
  };
});

vi.mock("pg", () => ({
  default: {
    Pool: class MockPool {
      constructor(options: unknown) {
        mocks.poolCtor(options);
      }

      on = mocks.poolOn;
      connect = mocks.poolConnect;
    },
  },
}));

vi.mock("drizzle-orm/node-postgres", () => ({
  drizzle: mocks.drizzle,
}));

const originalEnv = { ...process.env };

async function importDbClientModule() {
  vi.resetModules();
  return import("./client.ts");
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv };
  delete process.env.DATABASE_URL;
  delete process.env.DATABASE_SSL;
  delete process.env.DB_POOL_MAX;
  delete process.env.NODE_ENV;

  mocks.poolConnect.mockResolvedValue({
    query: vi.fn().mockResolvedValue({}),
    release: vi.fn(),
  });
});

afterAll(() => {
  process.env = originalEnv;
});

describe("db client environment validation", () => {
  it("throws when DATABASE_URL is missing", async () => {
    await expect(importDbClientModule()).rejects.toThrow("[DB CONFIG] DATABASE_URL is required");
  });

  it("throws when DATABASE_SSL is invalid", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/summit";
    process.env.DATABASE_SSL = "maybe";

    await expect(importDbClientModule()).rejects.toThrow(
      '[DB CONFIG] DATABASE_SSL must be "true" or "false" when provided',
    );
  });

  it("warns and defaults to SSL in production when DATABASE_SSL is not set", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/summit";
    process.env.NODE_ENV = "production";

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await importDbClientModule();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[DB CONFIG] DATABASE_SSL not set in production, defaulting to SSL enabled",
    );
    expect(mocks.poolCtor).toHaveBeenCalledWith(expect.objectContaining({
      ssl: { rejectUnauthorized: false },
    }));
    consoleWarnSpy.mockRestore();
  });

  it("configures pool with SSL options when DATABASE_SSL=true", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/summit";
    process.env.DATABASE_SSL = "true";
    process.env.DB_POOL_MAX = "22";

    await importDbClientModule();

    expect(mocks.poolCtor).toHaveBeenCalledWith(expect.objectContaining({
      connectionString: "postgres://localhost:5432/summit",
      max: 22,
      ssl: { rejectUnauthorized: false },
    }));
    expect(mocks.drizzle).toHaveBeenCalled();
  });

  it("configures pool without SSL options when DATABASE_SSL=false", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/summit";
    process.env.DATABASE_SSL = "false";

    await importDbClientModule();

    expect(mocks.poolCtor).toHaveBeenCalledWith(expect.objectContaining({
      ssl: undefined,
    }));
  });
});

describe("checkDatabaseHealth", () => {
  it("returns true on successful query", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/summit";
    process.env.DATABASE_SSL = "false";

    const queryMock = vi.fn().mockResolvedValue({});
    const releaseMock = vi.fn();
    mocks.poolConnect.mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    });

    const { checkDatabaseHealth } = await importDbClientModule();
    await expect(checkDatabaseHealth()).resolves.toBe(true);
    expect(queryMock).toHaveBeenCalledWith("SELECT 1");
    expect(releaseMock).toHaveBeenCalled();
  });

  it("returns false when pool connection fails", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/summit";
    process.env.DATABASE_SSL = "false";

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.poolConnect.mockRejectedValue(new Error("connection failed"));

    const { checkDatabaseHealth } = await importDbClientModule();
    await expect(checkDatabaseHealth()).resolves.toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
