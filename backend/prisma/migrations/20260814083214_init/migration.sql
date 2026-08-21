-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('Lubricant', 'Consumable', 'Spare_Part', 'Undercarriage', 'Attachment');

-- CreateEnum
CREATE TYPE "Plant" AS ENUM ('Jakarta', 'Surabaya', 'Balikpapan');

-- CreateEnum
CREATE TYPE "MarginCategory" AS ENUM ('not_achieved', 'underperforming', 'achieved', 'unclassified');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_upload_history" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL,
    "total_records" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL,
    "failed_count" INTEGER NOT NULL,
    "error_log" JSONB,
    "is_active_version" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_upload_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_master" (
    "id" SERIAL NOT NULL,
    "material_number" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2),
    "net_price" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" "MaterialStatus" NOT NULL DEFAULT 'active',
    "category" "MaterialCategory" NOT NULL,
    "plant" "Plant" NOT NULL,
    "stock" INTEGER,
    "effective_date" TIMESTAMP(3),
    "upload_version_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_column_config" (
    "id" SERIAL NOT NULL,
    "column_key" TEXT NOT NULL,
    "display_label" TEXT NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "pricing_column_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_search_log" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "searched_count" INTEGER NOT NULL,
    "response_time_ms" INTEGER NOT NULL,
    "searched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_search_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_model" (
    "id" SERIAL NOT NULL,
    "code_prefix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "gps_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_sub_model" (
    "id" SERIAL NOT NULL,
    "model_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "target_gp_percent" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gps_sub_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_materialno_submodel_map" (
    "material_no" TEXT NOT NULL,
    "sub_model_id" INTEGER NOT NULL,
    "assigned_by" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_materialno_submodel_map_pkey" PRIMARY KEY ("material_no")
);

-- CreateTable
CREATE TABLE "sales_gps_upload_history" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL,
    "total_records" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL,
    "failed_count" INTEGER NOT NULL,
    "error_log" JSONB,
    "is_active_version" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_gps_upload_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_gps_transaction" (
    "id" SERIAL NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "sales_name" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "material_no" TEXT NOT NULL,
    "serial_no" TEXT,
    "revenue" DECIMAL(16,2) NOT NULL,
    "cost" DECIMAL(16,2) NOT NULL,
    "gp" DECIMAL(16,2) NOT NULL,
    "gp_percent" DECIMAL(6,2) NOT NULL,
    "model_id" INTEGER,
    "sub_model_id" INTEGER,
    "margin_category" "MarginCategory" NOT NULL DEFAULT 'unclassified',
    "upload_version_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_gps_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "pricing_master_material_number_idx" ON "pricing_master"("material_number");

-- CreateIndex
CREATE INDEX "pricing_master_upload_version_id_idx" ON "pricing_master"("upload_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_column_config_column_key_key" ON "pricing_column_config"("column_key");

-- CreateIndex
CREATE UNIQUE INDEX "gps_model_code_prefix_key" ON "gps_model"("code_prefix");

-- CreateIndex
CREATE INDEX "sales_gps_transaction_material_no_idx" ON "sales_gps_transaction"("material_no");

-- CreateIndex
CREATE INDEX "sales_gps_transaction_upload_version_id_idx" ON "sales_gps_transaction"("upload_version_id");

-- CreateIndex
CREATE INDEX "sales_gps_transaction_invoice_date_idx" ON "sales_gps_transaction"("invoice_date");

-- AddForeignKey
ALTER TABLE "pricing_upload_history" ADD CONSTRAINT "pricing_upload_history_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_master" ADD CONSTRAINT "pricing_master_upload_version_id_fkey" FOREIGN KEY ("upload_version_id") REFERENCES "pricing_upload_history"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_search_log" ADD CONSTRAINT "pricing_search_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_sub_model" ADD CONSTRAINT "gps_sub_model_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "gps_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_materialno_submodel_map" ADD CONSTRAINT "gps_materialno_submodel_map_sub_model_id_fkey" FOREIGN KEY ("sub_model_id") REFERENCES "gps_sub_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_materialno_submodel_map" ADD CONSTRAINT "gps_materialno_submodel_map_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_gps_upload_history" ADD CONSTRAINT "sales_gps_upload_history_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_gps_transaction" ADD CONSTRAINT "sales_gps_transaction_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "gps_model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_gps_transaction" ADD CONSTRAINT "sales_gps_transaction_sub_model_id_fkey" FOREIGN KEY ("sub_model_id") REFERENCES "gps_sub_model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_gps_transaction" ADD CONSTRAINT "sales_gps_transaction_upload_version_id_fkey" FOREIGN KEY ("upload_version_id") REFERENCES "sales_gps_upload_history"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
