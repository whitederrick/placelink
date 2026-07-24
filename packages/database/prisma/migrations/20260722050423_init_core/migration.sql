-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('KAKAO', 'GOOGLE');

-- CreateEnum
CREATE TYPE "CoupleStatus" AS ENUM ('ACTIVE', 'DISSOLVED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('PUBLIC_API', 'BUSINESS', 'EDITOR', 'UGC');

-- CreateEnum
CREATE TYPE "PlaceStatus" AS ENUM ('ACTIVE', 'CLOSED', 'MERGED');

-- CreateEnum
CREATE TYPE "ExternalProvider" AS ENUM ('KAKAO', 'NAVER', 'GOOGLE', 'TOUR_API', 'SEOUL_OPEN_DATA');

-- CreateEnum
CREATE TYPE "HappeningStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PRIVATE', 'DELETED');

-- CreateEnum
CREATE TYPE "TagKind" AS ENUM ('SITUATION', 'BUDGET', 'MOOD', 'CATEGORY');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('HUMAN', 'AGENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "nickname" TEXT NOT NULL,
    "profile_image_url" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couples" (
    "id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "status" "CoupleStatus" NOT NULL DEFAULT 'ACTIVE',
    "dissolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "couples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_members" (
    "id" TEXT NOT NULL,
    "couple_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "couple_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "status" "PlaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "category" TEXT NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "location" geography(Point,4326),
    "phone" TEXT,
    "website_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_translations" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "summary" TEXT,

    CONSTRAINT "place_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_provider_refs" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "provider" "ExternalProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "source_url" TEXT,

    CONSTRAINT "place_provider_refs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "happenings" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "status" "HappeningStatus" NOT NULL DEFAULT 'UPCOMING',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "is_anchor" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "happenings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "happening_translations" (
    "id" TEXT NOT NULL,
    "happening_id" TEXT NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "happening_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "creator_user_id" TEXT,
    "couple_id" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cover_image_url" TEXT,
    "duration_minutes" INTEGER,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "scrap_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_nodes" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "duration_minutes" INTEGER,
    "distance_meters" INTEGER,
    "tip" VARCHAR(50),

    CONSTRAINT "course_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "kind" "TagKind" NOT NULL,
    "slug" TEXT NOT NULL,
    "label_ko" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_tags" (
    "course_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "course_tags_pkey" PRIMARY KEY ("course_id","tag_id")
);

-- CreateTable
CREATE TABLE "place_tags" (
    "place_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "place_tags_pkey" PRIMARY KEY ("place_id","tag_id")
);

-- CreateTable
CREATE TABLE "scraps" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scraps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "properties" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_created_at_idx" ON "users"("status", "created_at");

-- CreateIndex
CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_external_id_key" ON "auth_identities"("provider", "external_id");

-- CreateIndex
CREATE INDEX "couples_status_created_at_idx" ON "couples"("status", "created_at");

-- CreateIndex
CREATE INDEX "couple_members_user_id_left_at_idx" ON "couple_members"("user_id", "left_at");

-- CreateIndex
CREATE UNIQUE INDEX "couple_members_couple_id_user_id_key" ON "couple_members"("couple_id", "user_id");

-- CreateIndex
CREATE INDEX "places_status_category_idx" ON "places"("status", "category");

-- CreateIndex
CREATE INDEX "places_source_type_created_at_idx" ON "places"("source_type", "created_at");

-- CreateIndex
CREATE INDEX "place_translations_locale_name_idx" ON "place_translations"("locale", "name");

-- CreateIndex
CREATE UNIQUE INDEX "place_translations_place_id_locale_key" ON "place_translations"("place_id", "locale");

-- CreateIndex
CREATE INDEX "place_provider_refs_place_id_idx" ON "place_provider_refs"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "place_provider_refs_provider_external_id_key" ON "place_provider_refs"("provider", "external_id");

-- CreateIndex
CREATE INDEX "happenings_status_starts_at_ends_at_idx" ON "happenings"("status", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "happenings_is_anchor_status_ends_at_idx" ON "happenings"("is_anchor", "status", "ends_at");

-- CreateIndex
CREATE INDEX "happenings_place_id_idx" ON "happenings"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "happening_translations_happening_id_locale_key" ON "happening_translations"("happening_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_status_published_at_id_idx" ON "courses"("status", "published_at", "id");

-- CreateIndex
CREATE INDEX "courses_couple_id_created_at_idx" ON "courses"("couple_id", "created_at");

-- CreateIndex
CREATE INDEX "courses_creator_user_id_created_at_idx" ON "courses"("creator_user_id", "created_at");

-- CreateIndex
CREATE INDEX "course_nodes_place_id_idx" ON "course_nodes"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_nodes_course_id_order_index_key" ON "course_nodes"("course_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_kind_is_active_idx" ON "tags"("kind", "is_active");

-- CreateIndex
CREATE INDEX "course_tags_tag_id_course_id_idx" ON "course_tags"("tag_id", "course_id");

-- CreateIndex
CREATE INDEX "place_tags_tag_id_place_id_idx" ON "place_tags"("tag_id", "place_id");

-- CreateIndex
CREATE INDEX "scraps_course_id_created_at_idx" ON "scraps"("course_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "scraps_user_id_course_id_key" ON "scraps"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_created_at_idx" ON "audit_logs"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_type_actor_id_created_at_idx" ON "audit_logs"("actor_type", "actor_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_name_created_at_idx" ON "analytics_events"("name", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_created_at_idx" ON "analytics_events"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_members" ADD CONSTRAINT "couple_members_couple_id_fkey" FOREIGN KEY ("couple_id") REFERENCES "couples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_members" ADD CONSTRAINT "couple_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_translations" ADD CONSTRAINT "place_translations_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_provider_refs" ADD CONSTRAINT "place_provider_refs_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "happenings" ADD CONSTRAINT "happenings_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "happening_translations" ADD CONSTRAINT "happening_translations_happening_id_fkey" FOREIGN KEY ("happening_id") REFERENCES "happenings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_couple_id_fkey" FOREIGN KEY ("couple_id") REFERENCES "couples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_nodes" ADD CONSTRAINT "course_nodes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_nodes" ADD CONSTRAINT "course_nodes_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_tags" ADD CONSTRAINT "course_tags_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_tags" ADD CONSTRAINT "course_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_tags" ADD CONSTRAINT "place_tags_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_tags" ADD CONSTRAINT "place_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraps" ADD CONSTRAINT "scraps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraps" ADD CONSTRAINT "scraps_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
