-- CreateTable
CREATE TABLE "NotFoundRange" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "startIndex" INTEGER NOT NULL,
    "endIndex" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotFoundRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotFoundRange_year_startIndex_idx" ON "NotFoundRange"("year", "startIndex");

-- CreateIndex
CREATE INDEX "NotFoundRange_year_endIndex_idx" ON "NotFoundRange"("year", "endIndex");

-- CreateIndex
CREATE UNIQUE INDEX "NotFoundRange_year_startIndex_endIndex_key" ON "NotFoundRange"("year", "startIndex", "endIndex");
