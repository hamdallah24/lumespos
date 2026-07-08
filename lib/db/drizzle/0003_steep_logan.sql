CREATE TABLE IF NOT EXISTS "ai_missions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"objective" text NOT NULL DEFAULT '',
	"mode" varchar(20) NOT NULL DEFAULT 'cto',
	"status" varchar(20) NOT NULL DEFAULT 'pending',
	"complexity" varchar(20) NOT NULL DEFAULT 'medium',
	"strategy" varchar(20),
	"progress" integer NOT NULL DEFAULT 0,
	"evidence_quality" integer NOT NULL DEFAULT 0,
	"confidence" integer NOT NULL DEFAULT 0,
	"cycles_executed" integer NOT NULL DEFAULT 0,
	"current_goal" text,
	"result" text,
	"error" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_mission_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"mission_id" integer NOT NULL,
	"cycle" integer NOT NULL,
	"strategy" text,
	"stage" text,
	"progress" integer NOT NULL DEFAULT 0,
	"current_goal" text,
	"tool_calls" jsonb,
	"evidence_quality" integer,
	"confidence" integer,
	"metrics" jsonb,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_missions" ADD CONSTRAINT "ai_missions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_mission_snapshots" ADD CONSTRAINT "ai_mission_snapshots_mission_id_ai_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."ai_missions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
