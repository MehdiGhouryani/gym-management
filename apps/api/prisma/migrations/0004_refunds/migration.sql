warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
For more information, see: https://pris.ly/prisma-config

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PayMethod" NOT NULL,
    "reason" TEXT,
    "refundedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refunds_gymId_refundedAt_idx" ON "refunds"("gymId", "refundedAt");

-- CreateIndex
CREATE INDEX "refunds_memberId_refundedAt_idx" ON "refunds"("memberId", "refundedAt");

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_memberId_gymId_fkey" FOREIGN KEY ("memberId", "gymId") REFERENCES "members"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

