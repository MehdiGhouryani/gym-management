-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('BOOKED', 'CANCELLED', 'ATTENDED', 'WAITLIST');

-- CreateTable
CREATE TABLE "coaches" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "coaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "coachId" TEXT,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 12,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'BOOKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coaches_gymId_idx" ON "coaches"("gymId");

-- CreateIndex
CREATE UNIQUE INDEX "coaches_id_gymId_key" ON "coaches"("id", "gymId");

-- CreateIndex
CREATE INDEX "classes_gymId_idx" ON "classes"("gymId");

-- CreateIndex
CREATE UNIQUE INDEX "classes_id_gymId_key" ON "classes"("id", "gymId");

-- CreateIndex
CREATE UNIQUE INDEX "classes_gymId_name_key" ON "classes"("gymId", "name");

-- CreateIndex
CREATE INDEX "class_sessions_gymId_classId_startsAt_idx" ON "class_sessions"("gymId", "classId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "class_sessions_id_gymId_key" ON "class_sessions"("id", "gymId");

-- CreateIndex
CREATE INDEX "bookings_gymId_sessionId_status_idx" ON "bookings"("gymId", "sessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_sessionId_memberId_key" ON "bookings"("sessionId", "memberId");

-- AddForeignKey
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_coachId_gymId_fkey" FOREIGN KEY ("coachId", "gymId") REFERENCES "coaches"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_classId_gymId_fkey" FOREIGN KEY ("classId", "gymId") REFERENCES "classes"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_sessionId_gymId_fkey" FOREIGN KEY ("sessionId", "gymId") REFERENCES "class_sessions"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_memberId_gymId_fkey" FOREIGN KEY ("memberId", "gymId") REFERENCES "members"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

