/*
  Warnings:

  - You are about to drop the column `photos` on the `MedicalRecord` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceFormat` on the `Settings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[bookingNumber]` on the table `PetHotelBooking` will be added. If there are existing duplicate values, this will fail.
  - Made the column `recordNumber` on table `MedicalRecord` required. This step will fail if there are existing NULL values in that column.
  - Made the column `customerId` on table `MedicalRecord` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'PARTIAL_PAYMENT';

-- AlterEnum
ALTER TYPE "PetHotelBookingStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PetHotelRoomStatus" ADD VALUE 'RESERVED';
ALTER TYPE "PetHotelRoomStatus" ADD VALUE 'MAINTENANCE';
ALTER TYPE "PetHotelRoomStatus" ADD VALUE 'INACTIVE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StockMovementType" ADD VALUE 'RETURN';
ALTER TYPE "StockMovementType" ADD VALUE 'DAMAGED';
ALTER TYPE "StockMovementType" ADD VALUE 'EXPIRED';
ALTER TYPE "StockMovementType" ADD VALUE 'CORRECTION';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "email" TEXT,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "photo" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "medicalRecordId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "petId" TEXT,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "procedureId" TEXT;

-- AlterTable
ALTER TABLE "MedicalRecord" DROP COLUMN "photos",
ALTER COLUMN "recordNumber" SET NOT NULL,
ALTER COLUMN "customerId" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PetHotelBooking" ADD COLUMN     "bookingNumber" TEXT,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "PetHotelRoom" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "cleaningStatus" TEXT NOT NULL DEFAULT 'CLEAN',
ADD COLUMN     "maintenanceStatus" TEXT NOT NULL DEFAULT 'OPERATIONAL',
ADD COLUMN     "roomNumber" TEXT,
ADD COLUMN     "roomType" TEXT NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxStock" INTEGER,
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "invoiceFormat",
ADD COLUMN     "appName" TEXT,
ADD COLUMN     "appVersion" TEXT,
ADD COLUMN     "appointmentDuration" INTEGER,
ADD COLUMN     "autoLogout" BOOLEAN DEFAULT false,
ADD COLUMN     "autoNumbering" BOOLEAN DEFAULT true,
ADD COLUMN     "bookingPrefix" TEXT,
ADD COLUMN     "customerPrefix" TEXT,
ADD COLUMN     "dateFormat" TEXT,
ADD COLUMN     "defaultDashboard" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "footerInfo" TEXT,
ADD COLUMN     "holidayRules" TEXT,
ADD COLUMN     "invoicePrefix" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "medicalRecordPrefix" TEXT,
ADD COLUMN     "numberFormat" TEXT,
ADD COLUMN     "pagination" INTEGER,
ADD COLUMN     "petPrefix" TEXT,
ADD COLUMN     "posPrefix" TEXT,
ADD COLUMN     "receiptFooter" TEXT,
ADD COLUMN     "receiptHeader" TEXT,
ADD COLUMN     "receiptPrefix" TEXT,
ADD COLUMN     "sessionTimeout" INTEGER,
ADD COLUMN     "taxNumber" TEXT,
ADD COLUMN     "theme" TEXT,
ADD COLUMN     "timeFormat" TEXT,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "workingDays" TEXT;

-- CreateTable
CREATE TABLE "Procedure" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Procedure_code_key" ON "Procedure"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PetHotelBooking_bookingNumber_key" ON "PetHotelBooking"("bookingNumber");

-- CreateIndex
CREATE INDEX "PetHotelBooking_status_checkInDate_checkOutDate_idx" ON "PetHotelBooking"("status", "checkInDate", "checkOutDate");

-- CreateIndex
CREATE INDEX "PetHotelBooking_roomId_checkInDate_checkOutDate_idx" ON "PetHotelBooking"("roomId", "checkInDate", "checkOutDate");

-- CreateIndex
CREATE INDEX "PetHotelRoom_status_idx" ON "PetHotelRoom"("status");

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
