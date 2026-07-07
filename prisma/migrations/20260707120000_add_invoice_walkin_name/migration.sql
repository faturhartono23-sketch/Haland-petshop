-- Migration: Add Invoice.walkInName support

ALTER TABLE "Invoice"
ADD COLUMN "walkInName" TEXT;
