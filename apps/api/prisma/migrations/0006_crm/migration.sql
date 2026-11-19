-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'TRIAL', 'CONVERTED', 'LOST');

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "note" TEXT,
    "memberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_gymId_status_idx" ON "leads"("gymId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "leads_gymId_phone_key" ON "leads"("gymId", "phone");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_memberId_gymId_fkey" FOREIGN KEY ("memberId", "gymId") REFERENCES "members"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

