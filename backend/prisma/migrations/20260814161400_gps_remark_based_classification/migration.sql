-- AlterTable
ALTER TABLE "sales_gps_transaction" ADD COLUMN     "margin_remark" TEXT,
ADD COLUMN     "material_description" TEXT,
ADD COLUMN     "sales_area" TEXT,
ALTER COLUMN "revenue" DROP NOT NULL,
ALTER COLUMN "cost" DROP NOT NULL,
ALTER COLUMN "gp" DROP NOT NULL,
ALTER COLUMN "gp_percent" DROP NOT NULL;
