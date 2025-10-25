-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "index" INTEGER NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "bytes" INTEGER,
    "tag" TEXT,
    "ocrProvider" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlUrl" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "year" INTEGER,
    "index" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "httpStatus" INTEGER,
    "lastVisitedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "documentId" INTEGER,

    CONSTRAINT "CrawlUrl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Document_url_key" ON "Document"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Document_year_index_key" ON "Document"("year", "index");

-- CreateIndex
CREATE UNIQUE INDEX "CrawlUrl_url_key" ON "CrawlUrl"("url");

-- AddForeignKey
ALTER TABLE "CrawlUrl" ADD CONSTRAINT "CrawlUrl_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
