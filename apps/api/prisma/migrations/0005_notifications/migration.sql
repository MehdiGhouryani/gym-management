-- AlterTable
ALTER TABLE "members" ADD COLUMN     "smsOptOut" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "reminders" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;

