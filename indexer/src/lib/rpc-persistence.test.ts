import { describe, expect, it } from "vitest";
import {
  CHAIN_DERIVED_APPEND_TABLES,
  ROLLBACK_EXCLUDED_TABLES,
  STATE_SNAPSHOT_TABLES,
  getReorgRollbackPlan,
} from "./rpc-persistence.js";

describe("RPC reorg rollback plan", () => {
  it("rolls back append tables and restores state tables, excluding external caches", () => {
    const plan = getReorgRollbackPlan(123);

    expect(plan.fromBlock).toBe(123);
    expect(plan.appendTables).toEqual(CHAIN_DERIVED_APPEND_TABLES);
    expect(plan.stateTables).toEqual(STATE_SNAPSHOT_TABLES.map(table => table.tableName));
    expect(plan.excludedTables).toEqual(ROLLBACK_EXCLUDED_TABLES);
    expect(plan.excludedTables).toContain("cartridge_names");
    expect(plan.appendTables).not.toContain("cartridge_names");
    expect(plan.stateTables).not.toContain("cartridge_names");
  });
});
