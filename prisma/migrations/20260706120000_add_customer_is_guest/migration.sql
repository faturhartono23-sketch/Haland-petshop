-- Migration: Add Customer.isGuest support

ALTER TABLE "Customer"
ADD COLUMN "isGuest" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Customer_name_isGuest_key" ON "Customer"("name", "isGuest");
CREATE INDEX "Customer_isGuest_idx" ON "Customer"("isGuest");
