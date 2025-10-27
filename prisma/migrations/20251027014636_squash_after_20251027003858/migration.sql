-- CreateEnum
CREATE TYPE "FilterType" AS ENUM ('exclude', 'include', 'protect');

-- CreateEnum
CREATE TYPE "FilterField" AS ENUM ('title', 'text', 'url', 'tag', 'category');

-- CreateEnum
CREATE TYPE "FilterMode" AS ENUM ('contains', 'regex', 'startsWith', 'endsWith');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "category" TEXT,
ADD COLUMN     "isExcluded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userEdited" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Filter" (
    "id" SERIAL NOT NULL,
    "type" "FilterType" NOT NULL DEFAULT 'exclude',
    "field" "FilterField" NOT NULL DEFAULT 'text',
    "mode" "FilterMode" NOT NULL DEFAULT 'contains',
    "pattern" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Filter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronConfig" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "params" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CronConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronRun" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "durationSec" DOUBLE PRECISION NOT NULL,
    "attempted" INTEGER,
    "downloaded" INTEGER,
    "notFound" INTEGER,
    "errors" INTEGER,
    "skipped" INTEGER,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CronConfig_name_key" ON "CronConfig"("name");

-- CreateIndex
CREATE INDEX "CronRun_name_startedAt_idx" ON "CronRun"("name", "startedAt");
