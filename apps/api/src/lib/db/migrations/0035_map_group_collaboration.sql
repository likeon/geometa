CREATE TABLE "map_group_changes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"map_group_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"entity_label" text,
	"operation" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"created_at" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "map_group_permissions" ADD COLUMN "role" text DEFAULT 'owner' NOT NULL;--> statement-breakpoint
ALTER TABLE "map_group_changes" ADD CONSTRAINT "map_group_changes_map_group_id_map_groups_id_fk" FOREIGN KEY ("map_group_id") REFERENCES "public"."map_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_group_changes" ADD CONSTRAINT "map_group_changes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "map_group_changes_group_created_idx" ON "map_group_changes" USING btree ("map_group_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);
