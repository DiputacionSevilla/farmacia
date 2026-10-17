-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('colegio_oficial', 'farmacia', 'revision_municipal');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('confirmed', 'pending', 'inactive');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('all_year', 'summer', 'winter');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('closed', 'special_hours', 'open_all_day');

-- CreateEnum
CREATE TYPE "HolidayScope" AS ENUM ('national', 'regional', 'local');

-- CreateEnum
CREATE TYPE "CalendarVersionStatus" AS ENUM ('candidate', 'published', 'rejected', 'archived');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('day', 'night');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('success', 'failure');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('content_admin', 'tech_admin', 'auditor');

-- CreateTable
CREATE TABLE "pharmacies" (
    "id" TEXT NOT NULL,
    "official_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "owner_name" TEXT,
    "address" TEXT NOT NULL,
    "postal_code" TEXT,
    "municipality" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source_type" "SourceType" NOT NULL,
    "source_reference" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opening_hour_rules" (
    "id" TEXT NOT NULL,
    "pharmacy_id" TEXT NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "weekday" INTEGER NOT NULL,
    "opens_at" TEXT NOT NULL,
    "closes_at" TEXT NOT NULL,
    "season" "Season" NOT NULL DEFAULT 'all_year',
    "source_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opening_hour_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opening_exceptions" (
    "id" TEXT NOT NULL,
    "pharmacy_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "ExceptionType" NOT NULL,
    "opens_at" TEXT,
    "closes_at" TEXT,
    "reason" TEXT,
    "source_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opening_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "HolidayScope" NOT NULL,
    "municipality" TEXT,
    "official_source_url" TEXT,
    "published_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duty_calendar_versions" (
    "id" TEXT NOT NULL,
    "status" "CalendarVersionStatus" NOT NULL DEFAULT 'candidate',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "source_url" TEXT NOT NULL,
    "source_sha256" TEXT NOT NULL,
    "etag" TEXT,
    "last_modified" TEXT,
    "source_object_key" TEXT NOT NULL,
    "parser_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "published_by" TEXT,
    "validation_summary" JSONB,
    "notes" TEXT,

    CONSTRAINT "duty_calendar_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duty_shifts" (
    "id" TEXT NOT NULL,
    "calendar_version_id" TEXT NOT NULL,
    "service_date" DATE NOT NULL,
    "shift_type" "ShiftType" NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "pharmacy_id" TEXT,
    "raw_name" TEXT,
    "raw_address" TEXT,
    "raw_municipality" TEXT,
    "raw_phone" TEXT,
    "raw_text" TEXT,
    "source_page" INTEGER,

    CONSTRAINT "duty_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before_json" JSONB,
    "after_json" JSONB,
    "ip_hash" TEXT,
    "result" "AuditResult" NOT NULL,
    "correlation_id" TEXT NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "roles" "AdminRole"[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opening_hour_rules_pharmacy_id_weekday_idx" ON "opening_hour_rules"("pharmacy_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "opening_exceptions_pharmacy_id_date_key" ON "opening_exceptions"("pharmacy_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_scope_municipality_key" ON "holidays"("date", "scope", "municipality");

-- CreateIndex
CREATE INDEX "duty_calendar_versions_status_idx" ON "duty_calendar_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "duty_shifts_calendar_version_id_service_date_shift_type_key" ON "duty_shifts"("calendar_version_id", "service_date", "shift_type");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_idx" ON "audit_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_events_occurred_at_idx" ON "audit_events"("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "opening_hour_rules" ADD CONSTRAINT "opening_hour_rules_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_exceptions" ADD CONSTRAINT "opening_exceptions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duty_shifts" ADD CONSTRAINT "duty_shifts_calendar_version_id_fkey" FOREIGN KEY ("calendar_version_id") REFERENCES "duty_calendar_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duty_shifts" ADD CONSTRAINT "duty_shifts_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
