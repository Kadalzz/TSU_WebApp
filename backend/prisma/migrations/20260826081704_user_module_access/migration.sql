-- AlterTable
ALTER TABLE "users" ADD COLUMN     "can_access_gps" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "can_access_pricing" BOOLEAN NOT NULL DEFAULT true;
