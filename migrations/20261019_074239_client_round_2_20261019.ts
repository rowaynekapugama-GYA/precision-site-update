import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "address_cross_street" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "service_area_line" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "area_served" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN "address_cross_street";
  ALTER TABLE "site_settings" DROP COLUMN "service_area_line";
  ALTER TABLE "site_settings" DROP COLUMN "area_served";`)
}
