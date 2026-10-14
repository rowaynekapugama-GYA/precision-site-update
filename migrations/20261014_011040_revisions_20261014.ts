import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_enquiries_kind" AS ENUM('enquiry', 'price-list');
  CREATE TYPE "public"."enum_site_settings_price_list_delivery" AS ENUM('smileox', 'website');
  CREATE TABLE "before_after" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ref" varchar,
  	"title" varchar NOT NULL,
  	"page" varchar NOT NULL,
  	"before" varchar,
  	"before_media_id" integer,
  	"before_alt" varchar,
  	"after" varchar,
  	"after_media_id" integer,
  	"after_alt" varchar,
  	"caption" varchar,
  	"consent_documented" boolean DEFAULT false,
  	"consent_date" varchar,
  	"consent_record" varchar,
  	"unedited" boolean DEFAULT false,
  	"consistent_lighting" boolean DEFAULT false,
  	"published" boolean DEFAULT false,
  	"order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "team" ADD COLUMN "registration_type" varchar;
  ALTER TABLE "team" ADD COLUMN "registration_number" varchar;
  ALTER TABLE "enquiries" ADD COLUMN "kind" "enum_enquiries_kind" DEFAULT 'enquiry';
  ALTER TABLE "enquiries" ADD COLUMN "source" varchar;
  ALTER TABLE "enquiries" ADD COLUMN "consent_at" timestamp(3) with time zone;
  ALTER TABLE "enquiries" ADD COLUMN "crm_status" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "before_after_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "documents_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "tracking_google_ads_id" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tracking_ads_price_list_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "offer_enabled" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD COLUMN "offer_show_banner" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "offer_show_popup" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "offer_popup_delay" numeric DEFAULT 20;
  ALTER TABLE "site_settings" ADD COLUMN "offer_title" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "offer_price" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "offer_inclusions" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "offer_period" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "offer_terms_line" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "offer_terms_url" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "offer_terms" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "offer_book_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "reviews_enabled" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD COLUMN "reviews_rating" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "reviews_count" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "reviews_url" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "reviews_logo" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "reviews_logo_media_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "price_list_file" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "price_list_file_doc_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "price_list_delivery" "enum_site_settings_price_list_delivery" DEFAULT 'smileox';
  ALTER TABLE "site_settings" ADD COLUMN "price_list_button_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "price_list_consent_text" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "price_list_thank_you" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "schemes_hicaps" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD COLUMN "schemes_cdbs_bulk_bill" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD COLUMN "schemes_dva_direct_bill" boolean DEFAULT false;
  ALTER TABLE "site_status" ADD COLUMN "applied_updates" varchar;
  ALTER TABLE "before_after" ADD CONSTRAINT "before_after_before_media_id_media_id_fk" FOREIGN KEY ("before_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "before_after" ADD CONSTRAINT "before_after_after_media_id_media_id_fk" FOREIGN KEY ("after_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "before_after_ref_idx" ON "before_after" USING btree ("ref");
  CREATE INDEX "before_after_before_media_idx" ON "before_after" USING btree ("before_media_id");
  CREATE INDEX "before_after_after_media_idx" ON "before_after" USING btree ("after_media_id");
  CREATE INDEX "before_after_updated_at_idx" ON "before_after" USING btree ("updated_at");
  CREATE INDEX "before_after_created_at_idx" ON "before_after" USING btree ("created_at");
  CREATE INDEX "documents_updated_at_idx" ON "documents" USING btree ("updated_at");
  CREATE INDEX "documents_created_at_idx" ON "documents" USING btree ("created_at");
  CREATE UNIQUE INDEX "documents_filename_idx" ON "documents" USING btree ("filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_before_after_fk" FOREIGN KEY ("before_after_id") REFERENCES "public"."before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_reviews_logo_media_id_media_id_fk" FOREIGN KEY ("reviews_logo_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_price_list_file_doc_id_documents_id_fk" FOREIGN KEY ("price_list_file_doc_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_before_after_id_idx" ON "payload_locked_documents_rels" USING btree ("before_after_id");
  CREATE INDEX "payload_locked_documents_rels_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("documents_id");
  CREATE INDEX "site_settings_reviews_reviews_logo_media_idx" ON "site_settings" USING btree ("reviews_logo_media_id");
  CREATE INDEX "site_settings_price_list_price_list_file_doc_idx" ON "site_settings" USING btree ("price_list_file_doc_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "documents" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "before_after" CASCADE;
  DROP TABLE "documents" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_before_after_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_documents_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_reviews_logo_media_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_price_list_file_doc_id_documents_id_fk";
  
  DROP INDEX "payload_locked_documents_rels_before_after_id_idx";
  DROP INDEX "payload_locked_documents_rels_documents_id_idx";
  DROP INDEX "site_settings_reviews_reviews_logo_media_idx";
  DROP INDEX "site_settings_price_list_price_list_file_doc_idx";
  ALTER TABLE "team" DROP COLUMN "registration_type";
  ALTER TABLE "team" DROP COLUMN "registration_number";
  ALTER TABLE "enquiries" DROP COLUMN "kind";
  ALTER TABLE "enquiries" DROP COLUMN "source";
  ALTER TABLE "enquiries" DROP COLUMN "consent_at";
  ALTER TABLE "enquiries" DROP COLUMN "crm_status";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "before_after_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "documents_id";
  ALTER TABLE "site_settings" DROP COLUMN "tracking_google_ads_id";
  ALTER TABLE "site_settings" DROP COLUMN "tracking_ads_price_list_label";
  ALTER TABLE "site_settings" DROP COLUMN "offer_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "offer_show_banner";
  ALTER TABLE "site_settings" DROP COLUMN "offer_show_popup";
  ALTER TABLE "site_settings" DROP COLUMN "offer_popup_delay";
  ALTER TABLE "site_settings" DROP COLUMN "offer_title";
  ALTER TABLE "site_settings" DROP COLUMN "offer_price";
  ALTER TABLE "site_settings" DROP COLUMN "offer_inclusions";
  ALTER TABLE "site_settings" DROP COLUMN "offer_period";
  ALTER TABLE "site_settings" DROP COLUMN "offer_terms_line";
  ALTER TABLE "site_settings" DROP COLUMN "offer_terms_url";
  ALTER TABLE "site_settings" DROP COLUMN "offer_terms";
  ALTER TABLE "site_settings" DROP COLUMN "offer_book_label";
  ALTER TABLE "site_settings" DROP COLUMN "reviews_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "reviews_rating";
  ALTER TABLE "site_settings" DROP COLUMN "reviews_count";
  ALTER TABLE "site_settings" DROP COLUMN "reviews_url";
  ALTER TABLE "site_settings" DROP COLUMN "reviews_logo";
  ALTER TABLE "site_settings" DROP COLUMN "reviews_logo_media_id";
  ALTER TABLE "site_settings" DROP COLUMN "price_list_file";
  ALTER TABLE "site_settings" DROP COLUMN "price_list_file_doc_id";
  ALTER TABLE "site_settings" DROP COLUMN "price_list_delivery";
  ALTER TABLE "site_settings" DROP COLUMN "price_list_button_label";
  ALTER TABLE "site_settings" DROP COLUMN "price_list_consent_text";
  ALTER TABLE "site_settings" DROP COLUMN "price_list_thank_you";
  ALTER TABLE "site_settings" DROP COLUMN "schemes_hicaps";
  ALTER TABLE "site_settings" DROP COLUMN "schemes_cdbs_bulk_bill";
  ALTER TABLE "site_settings" DROP COLUMN "schemes_dva_direct_bill";
  ALTER TABLE "site_status" DROP COLUMN "applied_updates";
  DROP TYPE "public"."enum_enquiries_kind";
  DROP TYPE "public"."enum_site_settings_price_list_delivery";`)
}
