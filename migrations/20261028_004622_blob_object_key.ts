import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// The Vercel Blob storage plugin (on whenever BLOB_READ_WRITE_TOKEN is set) adds a hidden "_objectKey" field
// to Media and Documents. Without this column every media query fails, which broke the page editor and the
// build's database steps on staging (28 October 2026). IF NOT EXISTS keeps it safe to run anywhere.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;
  ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DROP COLUMN IF EXISTS "_objectkey";
  ALTER TABLE "documents" DROP COLUMN IF EXISTS "_objectkey";`)
}
