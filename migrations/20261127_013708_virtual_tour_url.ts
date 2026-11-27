import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Site Settings: the Contact page 3D tour link (27 November 2026).

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "virtual_tour_url" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "virtual_tour_url";`)
}
