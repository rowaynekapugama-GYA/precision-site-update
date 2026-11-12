import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Site Settings, Tracking: the website's call tracking number and whether it shows on screen (12 November 2026).

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "tracking_call_tracking_number" varchar;
  ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "tracking_call_tracking_show_number" boolean DEFAULT true;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "tracking_call_tracking_number";
  ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "tracking_call_tracking_show_number";`)
}
