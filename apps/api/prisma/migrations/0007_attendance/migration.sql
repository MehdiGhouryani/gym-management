-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('QR', 'MANUAL');

-- AlterTable (توکن امن QR؛ مقدار پیش‌فرض امن برای ردیف‌های موجود)
ALTER TABLE "members" ADD COLUMN     "qrToken" TEXT NOT NULL DEFAULT gen_random_uuid();

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "method" "CheckInMethod" NOT NULL DEFAULT 'QR',
    "note" TEXT,
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendances_gymId_checkInAt_idx" ON "attendances"("gymId", "checkInAt");

-- CreateIndex
CREATE INDEX "attendances_memberId_checkInAt_idx" ON "attendances"("memberId", "checkInAt");

-- CreateIndex
CREATE UNIQUE INDEX "members_qrToken_key" ON "members"("qrToken");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_memberId_gymId_fkey" FOREIGN KEY ("memberId", "gymId") REFERENCES "members"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

