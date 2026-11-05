import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Site Settings, Tracking: the Google Search Console verification code (5 November 2026).

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "tracking_search_console" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "tracking_search_console";`)
}
