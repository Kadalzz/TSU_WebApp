-- Add an optional "Industry" column to Sales GPS transactions, sourced from
-- a new Excel upload column and usable as a dashboard filter.
ALTER TABLE "sales_gps_transaction" ADD COLUMN "industry" TEXT;
