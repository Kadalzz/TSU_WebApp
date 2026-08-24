/*
  Warnings:

  - You are about to drop the column `category` on the `pricing_master` table. All the data in the column will be lost.
  - You are about to drop the column `discount` on the `pricing_master` table. All the data in the column will be lost.
  - You are about to drop the column `effective_date` on the `pricing_master` table. All the data in the column will be lost.
  - You are about to drop the column `net_price` on the `pricing_master` table. All the data in the column will be lost.
  - You are about to drop the column `plant` on the `pricing_master` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `pricing_master` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `pricing_master` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pricing_master" DROP COLUMN "category",
DROP COLUMN "discount",
DROP COLUMN "effective_date",
DROP COLUMN "net_price",
DROP COLUMN "plant",
DROP COLUMN "status",
DROP COLUMN "stock",
ADD COLUMN     "new_be_code" TEXT,
ADD COLUMN     "new_commodity_code" TEXT,
ADD COLUMN     "pricing_date" TIMESTAMP(3),
ADD COLUMN     "remarks_for_material" TEXT,
ADD COLUMN     "replacement_part_no" TEXT,
ADD COLUMN     "val_type_for_replacement_part_no" TEXT,
ADD COLUMN     "valuation_type" TEXT;

-- DropEnum
DROP TYPE "MaterialCategory";

-- DropEnum
DROP TYPE "MaterialStatus";

-- DropEnum
DROP TYPE "Plant";
