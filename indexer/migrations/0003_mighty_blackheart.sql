CREATE TABLE "consumables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner" text NOT NULL,
	"xlife_count" integer DEFAULT 0 NOT NULL,
	"attack_count" integer DEFAULT 0 NOT NULL,
	"revive_count" integer DEFAULT 0 NOT NULL,
	"poison_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "consumables_owner_unique" UNIQUE("owner")
);