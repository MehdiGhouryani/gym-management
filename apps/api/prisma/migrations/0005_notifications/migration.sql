warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
For more information, see: https://pris.ly/prisma-config

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "smsOptOut" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "reminders" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;

