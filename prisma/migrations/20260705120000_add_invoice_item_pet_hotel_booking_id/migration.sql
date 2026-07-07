-- This migration adds support for linking invoice items to pet hotel bookings.

ALTER TABLE "InvoiceItem"
ADD COLUMN "petHotelBookingId" TEXT;

ALTER TABLE "InvoiceItem"
ADD CONSTRAINT "InvoiceItem_petHotelBookingId_fkey"
FOREIGN KEY ("petHotelBookingId") REFERENCES "PetHotelBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "InvoiceItem_petHotelBookingId_idx" ON "InvoiceItem"("petHotelBookingId");
