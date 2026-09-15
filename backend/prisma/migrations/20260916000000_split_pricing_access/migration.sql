-- Split the single "canAccessPricing" module toggle into two independent
-- toggles for the Pricing page's Parts and Machine tabs.
ALTER TABLE "users" ADD COLUMN "can_access_pricing_parts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "can_access_pricing_machine" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" DROP COLUMN "can_access_pricing";
