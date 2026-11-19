-- CreateEnum
CREATE TYPE "PlanKind" AS ENUM ('days', 'sessions');

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "kind" "PlanKind" NOT NULL DEFAULT 'days',
ADD COLUMN     "sessionsCount" INTEGER;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "frozenDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sessionsUsed" INTEGER;

-- CreateTable
CREATE TABLE "plan_price_histories" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_price_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_price_histories_gymId_planId_at_idx" ON "plan_price_histories"("gymId", "planId", "at");

-- AddForeignKey
ALTER TABLE "plan_price_histories" ADD CONSTRAINT "plan_price_histories_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_price_histories" ADD CONSTRAINT "plan_price_histories_planId_gymId_fkey" FOREIGN KEY ("planId", "gymId") REFERENCES "plans"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

