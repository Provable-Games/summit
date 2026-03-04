-- Migration: Create consumables table for ERC20 token balance tracking.
--
-- Tracks circulating supply of 4 consumable tokens (XLIFE, ATTACK, REVIVE, POISON)
-- per owner address. Updated additively on each ERC20 Transfer event.

CREATE TABLE IF NOT EXISTS "consumables" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner" text NOT NULL,
  "xlife_count" integer DEFAULT 0 NOT NULL,
  "attack_count" integer DEFAULT 0 NOT NULL,
  "revive_count" integer DEFAULT 0 NOT NULL,
  "poison_count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "consumables_owner_unique" UNIQUE("owner")
);
