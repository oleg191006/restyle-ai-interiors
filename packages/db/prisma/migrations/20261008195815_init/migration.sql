-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('uk', 'en');

-- CreateTable
CREATE TABLE "Room" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomTranslation" (
    "roomId" INTEGER NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "intro" TEXT NOT NULL,

    CONSTRAINT "RoomTranslation_pkey" PRIMARY KEY ("roomId","locale")
);

-- CreateTable
CREATE TABLE "Style" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "palette" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Style_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleTranslation" (
    "styleId" INTEGER NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "materials" TEXT[],

    CONSTRAINT "StyleTranslation_pkey" PRIMARY KEY ("styleId","locale")
);

-- CreateTable
CREATE TABLE "IdeaPage" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "styleId" INTEGER NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "lead" TEXT NOT NULL,
    "tips" TEXT[],
    "faq" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdeaPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_slug_key" ON "Room"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Style_slug_key" ON "Style"("slug");

-- CreateIndex
CREATE INDEX "IdeaPage_locale_published_idx" ON "IdeaPage"("locale", "published");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaPage_roomId_styleId_locale_key" ON "IdeaPage"("roomId", "styleId", "locale");

-- AddForeignKey
ALTER TABLE "RoomTranslation" ADD CONSTRAINT "RoomTranslation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleTranslation" ADD CONSTRAINT "StyleTranslation_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaPage" ADD CONSTRAINT "IdeaPage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaPage" ADD CONSTRAINT "IdeaPage_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE CASCADE ON UPDATE CASCADE;
