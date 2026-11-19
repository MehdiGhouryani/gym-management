-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_memberId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_planId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "reminders" DROP CONSTRAINT "reminders_memberId_fkey";

-- DropForeignKey
ALTER TABLE "requests" DROP CONSTRAINT "requests_memberId_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "gymId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "members_id_gymId_key" ON "members"("id", "gymId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_gymId_name_key" ON "plans"("gymId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "plans_id_gymId_key" ON "plans"("id", "gymId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_id_gymId_key" ON "subscriptions"("id", "gymId");

-- CreateIndex
CREATE INDEX "audit_logs_gymId_at_idx" ON "audit_logs"("gymId", "at");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_memberId_gymId_fkey" FOREIGN KEY ("memberId", "gymId") REFERENCES "members"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_gymId_fkey" FOREIGN KEY ("planId", "gymId") REFERENCES "plans"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_gymId_fkey" FOREIGN KEY ("subscriptionId", "gymId") REFERENCES "subscriptions"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_memberId_gymId_fkey" FOREIGN KEY ("memberId", "gymId") REFERENCES "members"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_memberId_gymId_fkey" FOREIGN KEY ("memberId", "gymId") REFERENCES "members"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

