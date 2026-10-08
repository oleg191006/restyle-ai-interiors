-- CreateEnum
CREATE TYPE "VitalName" AS ENUM ('LCP', 'INP', 'CLS', 'FCP', 'TTFB');

-- CreateEnum
CREATE TYPE "FormFactor" AS ENUM ('mobile', 'desktop');

-- CreateTable
CREATE TABLE "WebVital" (
    "id" BIGSERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" "VitalName" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "rating" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "navigation" TEXT NOT NULL,
    "formFactor" "FormFactor" NOT NULL,

    CONSTRAINT "WebVital_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebVital_name_route_createdAt_idx" ON "WebVital"("name", "route", "createdAt");
