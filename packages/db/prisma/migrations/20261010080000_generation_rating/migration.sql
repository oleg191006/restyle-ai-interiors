-- CreateEnum
CREATE TYPE "Rating" AS ENUM ('up', 'down');

-- CreateEnum
CREATE TYPE "RatingReason" AS ENUM ('invented_architecture', 'barely_changed', 'wrong_style', 'poor_quality');

-- AlterTable
ALTER TABLE "Generation" ADD COLUMN     "ratedAt" TIMESTAMP(3),
ADD COLUMN     "rating" "Rating",
ADD COLUMN     "ratingReason" "RatingReason";

