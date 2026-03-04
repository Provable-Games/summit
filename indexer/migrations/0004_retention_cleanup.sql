-- Retention cleanup function
-- Deletes rows older than the specified retention period from append-only history tables.
-- Processes in batches to avoid long locks and excessive WAL generation.
-- Returns total rows deleted across all tables.

CREATE OR REPLACE FUNCTION cleanup_old_history(
  retention_interval INTERVAL DEFAULT INTERVAL '7 days',
  batch_size INTEGER DEFAULT 5000
)
RETURNS TABLE(table_name TEXT, rows_deleted BIGINT) AS $$
DECLARE
  cutoff TIMESTAMP := NOW() - retention_interval;
  deleted BIGINT;
  total BIGINT;
  tables TEXT[] := ARRAY['summit_log', 'battles', 'corpse_events', 'rewards_earned', 'poison_events', 'rewards_claimed'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    total := 0;
    LOOP
      EXECUTE format(
        'DELETE FROM %I WHERE ctid IN (SELECT ctid FROM %I WHERE created_at < $1 LIMIT $2)',
        t, t
      ) USING cutoff, batch_size;
      GET DIAGNOSTICS deleted = ROW_COUNT;
      total := total + deleted;
      EXIT WHEN deleted < batch_size;
    END LOOP;
    table_name := t;
    rows_deleted := total;
    RETURN NEXT;
  END LOOP;

  -- Also clean airfoil reorg_rollback (internal Apibara table)
  DELETE FROM airfoil.reorg_rollback;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  table_name := 'airfoil.reorg_rollback';
  rows_deleted := deleted;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
